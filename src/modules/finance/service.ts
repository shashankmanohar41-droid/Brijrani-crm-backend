import mongoose from 'mongoose';
import { Voucher, LedgerEntry } from './model';
import { Customer } from '../customers/model';
import { Supplier } from '../suppliers/model';
import { Farmer } from '../farmers/model';
import { SalesInvoice } from '../sales/model';
import { PurchaseOrder, PurchaseInvoice } from '../procurement/model';
import { CustomError } from '../../middlewares/errorHandler';

export const financeService = {
  // Post Voucher (Double entry Ledger Postings) - Section 36/39
  postVoucher: async (data: any, createdBy: string) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const voucherNo = `${data.voucherType.slice(0, 3).toUpperCase()}-2026-${Date.now().toString().slice(-4)}`;

      // 1. Save Voucher
      const voucher = new Voucher({
        voucherNumber: voucherNo,
        date: new Date(data.date || Date.now()),
        voucherType: data.voucherType,
        partyType: data.partyType,
        partyId: data.partyId ? new mongoose.Types.ObjectId(data.partyId) : undefined,
        amount: data.amount,
        paymentMode: data.paymentMode,
        reference: data.reference,
        narration: data.narration,
        attachments: data.attachments || [],
        status: 'Approved',
        createdBy
      });
      await voucher.save({ session });

      // 2. Map Ledger Account Names
      let debitAccount = data.debitAccount || 'Bank A/c';
      let creditAccount = data.creditAccount || 'Cash A/c';

      // 3. Update Partner Outstanding balances (Section 36/39)
      if (data.voucherType === 'Receipt' && data.partyType === 'customer') {
        const customer = await Customer.findById(data.partyId).session(session);
        if (customer) {
          customer.balance -= data.amount; // Collections decrease outstandings
          await customer.save({ session });
          
          creditAccount = `${customer.name} Accounts Receivable`;
          debitAccount = data.cashBankLink || 'HDFC Bank Main A/c';

          // Update related sales invoice status to Paid
          if (data.reference) {
            const invoice = await SalesInvoice.findOne({ invoiceNo: data.reference }).session(session);
            if (invoice) {
              const newBalance = Math.max(0, invoice.grandTotal - data.amount);
              invoice.paymentStatus = newBalance === 0 ? 'Paid' : 'Partially Paid';
              await invoice.save({ session });
            }
          }
        }
      } 
      else if (data.voucherType === 'Payment') {
        debitAccount = data.cashBankLink || 'SBI Working Cap A/c';
        
        if (data.partyType === 'supplier') {
          const supplier = await Supplier.findById(data.partyId).session(session);
          if (supplier) {
            supplier.balance -= data.amount; // Clears payable outstandings
            await supplier.save({ session });
            debitAccount = `${supplier.name} Accounts Payable`;
            creditAccount = data.cashBankLink || 'SBI Working Cap A/c';
          }
        } else if (data.partyType === 'farmer') {
          const farmer = await Farmer.findById(data.partyId).session(session);
          if (farmer) {
            farmer.balance -= data.amount;
            await farmer.save({ session });
            debitAccount = `${farmer.name} Accounts Payable`;
            creditAccount = data.cashBankLink || 'SBI Working Cap A/c';
          }
        }

        // Reconcile related Purchase Invoice (Payment to Vendor after GRN)
        if (data.reference) {
          const inv = await PurchaseInvoice.findOne({
            $or: [
              { invoiceNo: data.reference },
              { poNumber: data.reference },
              { grnNumber: data.reference }
            ]
          }).session(session);

          if (inv) {
            const currentPaid = inv.amountPaid || 0;
            const newPaid = currentPaid + Number(data.amount);
            const remaining = Math.max(0, inv.grandTotal - newPaid);
            inv.amountPaid = newPaid;
            inv.remainingAmount = remaining;
            inv.status = remaining === 0 ? 'Paid' : 'Partially Paid';
            inv.paymentHistory = inv.paymentHistory || [];
            inv.paymentHistory.push({
              voucherNo,
              date: voucher.date,
              amount: Number(data.amount),
              mode: data.paymentMode,
              reference: data.reference,
              account: debitAccount,
              narration: data.narration
            });
            await inv.save({ session });
          }
        }
      }

      // 4. Create Ledger Entries (Debit A/c & Credit A/c)
      const debitEntry = new LedgerEntry({
        voucherId: voucher._id,
        voucherNumber: voucherNo,
        date: voucher.date,
        accountName: debitAccount,
        debitAmount: data.amount,
        creditAmount: 0,
        narration: data.narration
      });
      await debitEntry.save({ session });

      const creditEntry = new LedgerEntry({
        voucherId: voucher._id,
        voucherNumber: voucherNo,
        date: voucher.date,
        accountName: creditAccount,
        debitAmount: 0,
        creditAmount: data.amount,
        narration: data.narration
      });
      await creditEntry.save({ session });

      await session.commitTransaction();
      session.endSession();
      return { voucher, debitEntry, creditEntry };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  },

  listLedgerEntries: async (accountName?: string) => {
    const query = accountName ? { accountName: { $regex: accountName, $options: 'i' } } : {};
    return await LedgerEntry.find(query).sort({ date: -1 });
  },

  listVouchers: async () => {
    return await Voucher.find({}).sort({ date: -1 });
  },

  // --- OUTSTANDING AGING ANALYSIS (Section 37/38) ---
  getReceivablesAging: async () => {
    const unpaidInvoices = await SalesInvoice.find({ paymentStatus: { $in: ['Unpaid', 'Partially Paid'] } })
      .populate('customerId', 'name phone');

    const now = new Date();
    const buckets = {
      days_0_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_90_plus: 0,
      totalOutstanding: 0,
      invoices: [] as any[]
    };

    for (const inv of unpaidInvoices) {
      const diffTime = Math.abs(now.getTime() - new Date(inv.invoiceDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const outstandingVal = inv.grandTotal; // For simplicity we assume full invoice value is outstanding
      buckets.totalOutstanding += outstandingVal;

      const invData = {
        invoiceNo: inv.invoiceNo,
        customer: (inv.customerId as any)?.name || 'Unknown',
        date: inv.invoiceDate,
        amount: inv.grandTotal,
        daysPast: diffDays
      };

      if (diffDays <= 30) {
        buckets.days_0_30 += outstandingVal;
      } else if (diffDays <= 60) {
        buckets.days_31_60 += outstandingVal;
      } else if (diffDays <= 90) {
        buckets.days_61_90 += outstandingVal;
      } else {
        buckets.days_90_plus += outstandingVal;
      }

      buckets.invoices.push(invData);
    }

    return buckets;
  },

  getPayablesAging: async () => {
    // For simplicity, we fetch all Suppliers/Farmers with positive balance payables
    const suppliers = await Supplier.find({ balance: { $gt: 0 } });
    const farmers = await Farmer.find({ balance: { $gt: 0 } });

    const payables = [
      ...suppliers.map(s => ({ name: s.name, balance: s.balance, type: 'Supplier', date: (s as any).createdAt })),
      ...farmers.map(f => ({ name: f.name, balance: f.balance, type: 'Farmer', date: (f as any).createdAt }))
    ];

    const now = Date.now();
    const buckets = {
      days_0_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_90_plus: 0,
      totalPayable: 0,
      vendors: [] as any[]
    };

    for (const p of payables) {
      const diffTime = Math.abs(now - new Date(p.date).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      buckets.totalPayable += p.balance;
      
      const vendorData = {
        name: p.name,
        type: p.type,
        balance: p.balance,
        daysPast: diffDays
      };

      if (diffDays <= 30) {
        buckets.days_0_30 += p.balance;
      } else if (diffDays <= 60) {
        buckets.days_31_60 += p.balance;
      } else if (diffDays <= 90) {
        buckets.days_61_90 += p.balance;
      } else {
        buckets.days_90_plus += p.balance;
      }

      buckets.vendors.push(vendorData);
    }

    return buckets;
  }
};
