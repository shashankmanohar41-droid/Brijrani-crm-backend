import mongoose from 'mongoose';
import { SalesEnquiry, SalesQuotation, SalesOrder, PickingTask, PackingSlip, SalesInvoice, SalesReturn, ReturnInspection, CreditNote, Refund, SalesTarget, SalesCommission, SalesApproval, SalesNotification, SalesAuditLog } from './model';
import { Customer } from '../customers/model';
import { Commodity } from '../commodities/model';
import { Warehouse, Bin } from '../warehouse/model';
import { DeliveryChallan, EWayBill, ProofOfDelivery, Vehicle, Driver } from '../logistics/model';
import { Voucher, LedgerEntry } from '../finance/model';
import { CustomError } from '../../middlewares/errorHandler';
import { inventoryService } from '../inventory/service';
import { runInTransaction } from '../../utils/transaction';

export const salesService = {
  // --- SALES ENQUIRY ---
  createEnquiry: async (data: any, createdBy: string) => {
    const enquiryNo = `SEQ-2026-${String(await SalesEnquiry.countDocuments() + 1).padStart(5, '0')}`;
    const se = new SalesEnquiry({
      enquiryNo,
      date: new Date(data.date || Date.now()),
      customerId: new mongoose.Types.ObjectId(data.customerId),
      commodityId: new mongoose.Types.ObjectId(data.commodityId),
      quantity: data.quantity,
      expectedRate: data.expectedRate,
      requiredDeliveryDate: new Date(data.requiredDeliveryDate),
      deliveryLocation: data.deliveryLocation,
      status: 'Sent',
      createdBy
    });
    return await se.save();
  },

  // --- SALES QUOTATION ---
  createQuotation: async (data: any, createdBy: string) => {
    const quotationNo = `SQT-2026-${String(await SalesQuotation.countDocuments() + 1).padStart(5, '0')}`;

    const stockSummary = await inventoryService.getStockSummary(data.commodityId);
    const avgCost = stockSummary.length > 0 ? stockSummary[0].averageCost : 20000;

    const qty = data.quantity;
    const baseValue = data.rate * qty;
    const purchaseCost = avgCost * qty;
    const expectedProfit = baseValue - purchaseCost;

    const freight = data.freightCost || 0;
    const loading = data.loadingCost || 0;
    const other = data.otherCharges || 0;
    const discount = data.discountAmount || 0;
    const taxes = (baseValue + freight + loading + other - discount) * ((data.gstPercent || 5) / 100);

    const total = baseValue + freight + loading + other + taxes - discount;

    const sq = new SalesQuotation({
      quotationNo,
      enquiryNo: data.enquiryNo,
      date: new Date(data.date || Date.now()),
      customerId: new mongoose.Types.ObjectId(data.customerId),
      commodityId: new mongoose.Types.ObjectId(data.commodityId),
      quantity: qty,
      rate: data.rate,
      gstPercent: data.gstPercent || 5,
      freightCost: freight,
      loadingCost: loading,
      otherCharges: other,
      discountAmount: discount,
      total,
      validUntil: new Date(data.validUntil),
      paymentTerms: data.paymentTerms || 'Net 30',
      deliveryTerms: data.deliveryTerms || 'FOB',
      purchaseCost: avgCost,
      expectedProfit,
      status: 'Sent',
      createdBy
    });

    return await sq.save();
  },

  // --- SALES ORDER & RESERVATION ---
  createSO: async (data: any, createdBy: string) => {
    return await runInTransaction(async (session) => {
      const countQuery = SalesOrder.countDocuments();
      const soNo = `SO-2026-${String(await (session ? countQuery.session(session) : countQuery) + 1).padStart(5, '0')}`;

      const so = new SalesOrder({
        soNo,
        quotationNo: data.quotationNo,
        date: new Date(data.date || Date.now()),
        customerId: new mongoose.Types.ObjectId(data.customerId),
        commodityId: new mongoose.Types.ObjectId(data.commodityId),
        quantity: data.quantity,
        rate: data.rate,
        gstPercent: data.gstPercent || 5,
        freightCost: data.freightCost || 0,
        otherCharges: data.otherCharges || 0,
        total: data.total,
        warehouseId: new mongoose.Types.ObjectId(data.warehouseId),
        deliveryAddress: data.deliveryAddress,
        status: 'Draft',
        createdBy
      });
      await (session ? so.save({ session }) : so.save());

      const stockSummary = await inventoryService.getStockSummary(String(so.commodityId), String(so.warehouseId));
      const totalAvailable = stockSummary.reduce((sum, item) => sum + item.availableStock, 0);

      if (totalAvailable < so.quantity) {
        const shortage = so.quantity - totalAvailable;
        so.status = 'Draft';
        await (session ? so.save({ session }) : so.save());
        return { so, status: 'INSUFFICIENT_STOCK_ALERT', shortage };
      }

      await inventoryService.reserveStock(
        String(so._id),
        String(so.commodityId),
        so.quantity,
        String(so.warehouseId),
        createdBy
      );

      const pckCountQuery = PickingTask.countDocuments();
      const pickingNo = `PCK-2026-${String(await (session ? pckCountQuery.session(session) : pckCountQuery) + 1).padStart(5, '0')}`;
      
      const dummyBin = await Bin.findOne({ warehouseId: so.warehouseId });
      const finalBin = dummyBin || await Bin.findOne({});
      const binId = finalBin ? finalBin._id : new mongoose.Types.ObjectId();
      const batchNo = finalBin && finalBin.currentStock && finalBin.currentStock[0] ? finalBin.currentStock[0].batchNo : 'BAT-2026-001';

      const pickTask = new PickingTask({
        pickingNo,
        soId: so._id,
        date: new Date(),
        warehouseId: so.warehouseId,
        commodityId: so.commodityId,
        batchNo,
        binId,
        qtyToPick: so.quantity,
        qtyPicked: 0,
        status: 'Pending',
        createdBy
      });
      await (session ? pickTask.save({ session }) : pickTask.save());

      so.status = 'Picking';
      await (session ? so.save({ session }) : so.save());

      if (data.quotationNo) {
        await SalesQuotation.updateOne({ quotationNo: data.quotationNo }, { status: 'Converted' });
      }

      return { so, status: 'RESERVED_AND_PICKING', pickTask };
    });
  },

  // Complete picking & packing
  completePicking: async (pickingId: string, qtyPicked: number, packageType: string, createdBy: string) => {
    return await runInTransaction(async (session) => {
      const taskQuery = PickingTask.findById(pickingId);
      const task = await (session ? taskQuery.session(session) : taskQuery);
      if (!task) throw new CustomError('Picking task not found', 404);
      if (task.status === 'Completed') throw new CustomError('Picking already completed', 400);

      task.qtyPicked = qtyPicked;
      task.status = 'Completed';
      await (session ? task.save({ session }) : task.save());

      const soQuery = SalesOrder.findById(task.soId);
      const so = await (session ? soQuery.session(session) : soQuery);
      if (!so) throw new CustomError('SO not found', 404);

      const packCountQuery = PackingSlip.countDocuments();
      const packingNo = `PKG-2026-${String(await (session ? packCountQuery.session(session) : packCountQuery) + 1).padStart(5, '0')}`;
      const numPackages = Math.ceil((qtyPicked * 1000) / 50);

      const pack = new PackingSlip({
        packingNo,
        pickingId: task._id,
        soId: so._id,
        customerId: so.customerId,
        commodityId: so.commodityId,
        batchNo: task.batchNo,
        quantity: qtyPicked,
        packageType: packageType || 'PP Bags (50 Kg)',
        numPackages,
        weight: qtyPicked,
        packingDate: new Date(),
        status: 'Completed',
        createdBy
      });
      await (session ? pack.save({ session }) : pack.save());

      so.status = 'Packed';
      await (session ? so.save({ session }) : so.save());

      return pack;
    });
  },

  // --- DISPATCH, TAX INVOICE & E-WAY BILL ---
  dispatchOrder: async (soId: string, vehicleNo: string, driverName: string, createdBy: string) => {
    return await runInTransaction(async (session) => {
      const soQuery = SalesOrder.findById(soId);
      const so = await (session ? soQuery.session(session) : soQuery);
      if (!so) throw new CustomError('SO not found', 404);

      const custQuery = Customer.findById(so.customerId);
      const customer = await (session ? custQuery.session(session) : custQuery);
      if (!customer) throw new CustomError('Customer not found', 404);

      await Vehicle.updateOne({ registrationNo: vehicleNo.toUpperCase() }, { status: 'In Transit' });
      await Driver.updateOne({ name: driverName }, { status: 'On Trip' });

      const dcCountQuery = DeliveryChallan.countDocuments();
      const dcNo = `DC-2026-${String(await (session ? dcCountQuery.session(session) : dcCountQuery) + 1).padStart(5, '0')}`;
      const dc = new DeliveryChallan({
        dcNo,
        soId: so._id,
        soNo: so.soNo,
        customerId: so.customerId,
        warehouseId: so.warehouseId,
        vehicleNo: vehicleNo.toUpperCase(),
        driverName,
        commodityId: so.commodityId,
        quantity: so.quantity,
        deliveryAddress: so.deliveryAddress,
        dispatchDate: new Date(),
        status: 'Dispatched'
      });
      await (session ? dc.save({ session }) : dc.save());

      const ewayBillNo = `EWB-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 3);

      const ewb = new EWayBill({
        ewayBillNo,
        invoiceNo: `INV-2026-${dcNo.slice(-5)}`,
        vehicleNo: vehicleNo.toUpperCase(),
        transporterName: 'Mithila Transports Patna',
        distance: 120,
        validFrom: new Date(),
        validUntil,
        status: 'Active'
      });
      await (session ? ewb.save({ session }) : ewb.save());

      const invCountQuery = SalesInvoice.countDocuments();
      const invoiceNo = `INV-2026-${String(await (session ? invCountQuery.session(session) : invCountQuery) + 1).padStart(5, '0')}`;
      
      const commQuery = Commodity.findById(so.commodityId);
      const comm = await (session ? commQuery.session(session) : commQuery);
      const hsn = comm ? comm.hsn : '1001';

      const baseValue = so.rate * so.quantity;
      const isIntrastate = customer.state.toLowerCase() === 'bihar';
      
      let cgst = 0, sgst = 0, igst = 0;
      const gstRate = so.gstPercent || 5;

      if (isIntrastate) {
        cgst = baseValue * ((gstRate / 2) / 100);
        sgst = baseValue * ((gstRate / 2) / 100);
      } else {
        igst = baseValue * (gstRate / 100);
      }

      const invoiceItem = {
        commodityId: so.commodityId,
        hsn,
        quantity: so.quantity,
        rate: so.rate,
        discount: 0,
        taxableAmount: baseValue,
        cgst,
        sgst,
        igst,
        total: baseValue + cgst + sgst + igst
      };

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoice = new SalesInvoice({
        invoiceNo,
        soId: so._id,
        customerId: so.customerId,
        invoiceDate: new Date(),
        dueDate,
        items: [invoiceItem],
        taxableAmount: baseValue,
        discountAmount: 0,
        cgst,
        sgst,
        igst,
        freightCost: so.freightCost,
        otherCharges: so.otherCharges,
        grandTotal: baseValue + cgst + sgst + igst + so.freightCost + so.otherCharges,
        placeOfSupply: customer.state,
        paymentStatus: 'Unpaid',
        ewayBillNo,
        createdBy
      });
      await (session ? invoice.save({ session }) : invoice.save());

      so.status = 'Shipped';
      await (session ? so.save({ session }) : so.save());

      const voucherNo = `REC-2026-${Date.now().toString().slice(-4)}`;
      const voucher = new Voucher({
        voucherNumber: voucherNo,
        date: new Date(),
        voucherType: 'Journal',
        partyType: 'customer',
        partyId: customer._id,
        amount: invoice.grandTotal,
        paymentMode: 'Bank Transfer',
        reference: invoice.invoiceNo,
        narration: `Sales invoice ledger entries for invoice ${invoice.invoiceNo}`,
        attachments: [],
        status: 'Approved',
        createdBy
      });
      await (session ? voucher.save({ session }) : voucher.save());

      customer.balance += invoice.grandTotal;
      await (session ? customer.save({ session }) : customer.save());

      const debitCustomer = new LedgerEntry({
        voucherId: voucher._id,
        voucherNumber: voucherNo,
        date: new Date(),
        accountName: `${customer.name} Accounts Receivable`,
        debitAmount: invoice.grandTotal,
        creditAmount: 0,
        narration: `Accounts receivable debited for invoice ${invoice.invoiceNo}`
      });
      await (session ? debitCustomer.save({ session }) : debitCustomer.save());

      const creditRevenue = new LedgerEntry({
        voucherId: voucher._id,
        voucherNumber: voucherNo,
        date: new Date(),
        accountName: 'Sales Revenue A/c',
        debitAmount: 0,
        creditAmount: baseValue,
        narration: `Sales revenue credited for invoice ${invoice.invoiceNo}`
      });
      await (session ? creditRevenue.save({ session }) : creditRevenue.save());

      return { dc, invoice, ewb };
    });
  },

  // --- PROOF OF DELIVERY (POD) ---
  submitPOD: async (data: any, createdBy: string) => {
    return await runInTransaction(async (session) => {
      const dcQuery = DeliveryChallan.findOne({ dcNo: data.dcNo });
      const dc = await (session ? dcQuery.session(session) : dcQuery);
      if (!dc) throw new CustomError('Delivery Challan not found', 404);
      if (dc.status === 'Delivered') throw new CustomError('POD has already been recorded', 400);

      const podCountQuery = ProofOfDelivery.countDocuments();
      const podNo = `POD-2026-${String(await (session ? podCountQuery.session(session) : podCountQuery) + 1).padStart(5, '0')}`;
      
      const invQuery = SalesInvoice.findOne({ soId: dc.soId });
      const invoice = await (session ? invQuery.session(session) : invQuery);
      const invoiceNo = invoice ? invoice.invoiceNo : 'Unknown';

      const custQuery = Customer.findById(dc.customerId);
      const customer = await (session ? custQuery.session(session) : custQuery);

      const pod = new ProofOfDelivery({
        podNo,
        dcNo: dc.dcNo,
        invoiceNo,
        customerName: customer ? customer.name : 'Unknown',
        deliveredQty: data.deliveredQty,
        receivedBy: data.receivedBy,
        deliveryDate: new Date(data.deliveryDate || Date.now()),
        status: data.status || 'Delivered',
        signaturePhotoUrl: data.signaturePhotoUrl,
        deliveryPhotoUrl: data.deliveryPhotoUrl,
        remarks: data.remarks
      });
      await (session ? pod.save({ session }) : pod.save());

      dc.status = 'Delivered';
      await (session ? dc.save({ session }) : dc.save());

      const soQuery = SalesOrder.findById(dc.soId);
      const so = await (session ? soQuery.session(session) : soQuery);
      if (so) {
        so.status = 'Completed';
        await (session ? so.save({ session }) : so.save());
      }

      await Vehicle.updateOne({ registrationNo: dc.vehicleNo }, { status: 'Available' });
      await Driver.updateOne({ name: dc.driverName }, { status: 'Active' });

      await inventoryService.releaseStockReservation(String(dc.soId), 'Released', session);

      const pickQuery = PickingTask.findOne({ soId: dc.soId });
      const pickTask = await (session ? pickQuery.session(session) : pickQuery);
      if (pickTask) {
        await inventoryService.createStockLedgerEntry(session, {
          commodityId: String(dc.commodityId),
          batchNo: pickTask.batchNo,
          warehouseId: String(dc.warehouseId),
          binId: String(pickTask.binId),
          referenceType: 'GOODS_OUTWARD',
          referenceId: dc.dcNo,
          quantityIn: 0,
          quantityOut: dc.quantity,
          unitCost: so ? so.rate : 22000,
          createdBy
        });
      }

      return pod;
    });
  },

  listInvoices: async () => {
    return await SalesInvoice.find({}).sort({ invoiceDate: -1 });
  },

  listEnquiries: async () => {
    return await SalesEnquiry.find({}).sort({ date: -1 });
  },

  listQuotations: async () => {
    return await SalesQuotation.find({}).sort({ date: -1 });
  },

  listOrders: async () => {
    return await SalesOrder.find({}).sort({ date: -1 });
  },

  listPickLists: async () => {
    return await PickingTask.find({}).sort({ date: -1 });
  },

  listPackages: async () => {
    return await PackingSlip.find({}).sort({ packingDate: -1 });
  },

  listDeliveries: async () => {
    return await DeliveryChallan.find({}).sort({ dispatchDate: -1 });
  },

  listReturns: async () => {
    return await SalesReturn.find({}).sort({ date: -1 });
  },

  listCreditNotes: async () => {
    return await CreditNote.find({}).sort({ date: -1 });
  },

  listRefunds: async () => {
    return await Refund.find({}).sort({ date: -1 });
  },

  // Target and Commission Management
  listTargets: async () => {
    return await SalesTarget.find({}).sort({ period: -1 });
  },

  createTarget: async (data: any, createdBy: string) => {
    const target = new SalesTarget({
      employee: data.employee,
      period: data.period,
      targetAmount: data.targetAmount,
      actualAmount: 0,
      createdBy
    });
    return await target.save();
  },

  listCommissions: async () => {
    return await SalesCommission.find({}).sort({ createdAt: -1 });
  },

  // Document status updates & approvals
  updateQuotationStatus: async (id: string, status: string, user: string) => {
    const q = await SalesQuotation.findByIdAndUpdate(id, { status }, { new: true });
    if (!q) throw new CustomError('Quotation not found', 404);
    await salesService.logAudit(user, 'QUOTATION_UPDATE', 'Quotation', String(q._id), '', status);
    return q;
  },

  updateOrderStatus: async (id: string, status: string, user: string) => {
    const o = await SalesOrder.findByIdAndUpdate(id, { status }, { new: true });
    if (!o) throw new CustomError('Order not found', 404);
    await salesService.logAudit(user, 'ORDER_UPDATE', 'SalesOrder', String(o._id), '', status);
    return o;
  },

  // Customer statement ledger builder
  getCustomerStatement: async (customerId: string) => {
    const customer = await Customer.findById(customerId);
    if (!customer) throw new CustomError('Customer not found', 404);

    const invoices = await SalesInvoice.find({ customerId });
    const vouchers = await Voucher.find({ partyId: customerId, partyType: 'customer', status: 'Approved' });
    const creditNotes = await CreditNote.find({ customerId, status: 'Approved' });

    const ledger: any[] = [];

    invoices.forEach(inv => {
      ledger.push({
        date: inv.invoiceDate,
        type: 'Invoice',
        docNo: inv.invoiceNo,
        debit: inv.grandTotal,
        credit: 0,
        balance: 0
      });
    });

    vouchers.forEach(v => {
      ledger.push({
        date: v.date,
        type: v.voucherType,
        docNo: v.voucherNumber,
        debit: v.voucherType === 'Payment' ? v.amount : 0,
        credit: v.voucherType === 'Receipt' ? v.amount : 0,
        balance: 0
      });
    });

    creditNotes.forEach(cn => {
      ledger.push({
        date: cn.date,
        type: 'Credit Note',
        docNo: cn.creditNoteNo,
        debit: 0,
        credit: cn.totalAmount,
        balance: 0
      });
    });

    // Sort by date ascending
    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = customer.openingBalance || 0;
    ledger.forEach(row => {
      runningBalance += row.debit - row.credit;
      row.balance = runningBalance;
    });

    return {
      customer,
      openingBalance: customer.openingBalance,
      closingBalance: runningBalance,
      ledger
    };
  },

  // Aging Report
  getReceivableAging: async () => {
    const customers = await Customer.find({});
    const invoices = await SalesInvoice.find({ paymentStatus: { $ne: 'Paid' } });

    const now = new Date();
    const result = customers.map(cust => {
      const custInvoices = invoices.filter(inv => String(inv.customerId) === String(cust._id));
      
      let current = 0;
      let d1_30 = 0;
      let d31_60 = 0;
      let d61_90 = 0;
      let d91_180 = 0;
      let d180plus = 0;

      custInvoices.forEach(inv => {
        const diffTime = Math.abs(now.getTime() - new Date(inv.invoiceDate).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const amount = inv.grandTotal;

        if (diffDays <= 0) current += amount;
        else if (diffDays <= 30) d1_30 += amount;
        else if (diffDays <= 60) d31_60 += amount;
        else if (diffDays <= 90) d61_90 += amount;
        else if (diffDays <= 180) d91_180 += amount;
        else d180plus += amount;
      });

      return {
        customerId: cust._id,
        customerName: cust.name,
        companyName: cust.companyName,
        totalOutstanding: current + d1_30 + d31_60 + d61_90 + d91_180 + d180plus,
        current,
        '1-30 Days': d1_30,
        '31-60 Days': d31_60,
        '61-90 Days': d61_90,
        '91-180 Days': d91_180,
        '180+ Days': d180plus
      };
    });

    return result.filter(r => r.totalOutstanding > 0);
  },

  // Dashboard Aggregator
  getDashboard: async (filters: any) => {
    let dateMatch: any = {};
    if (filters.startDate && filters.endDate) {
      dateMatch = {
        invoiceDate: {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        }
      };
    }

    const invoices = await SalesInvoice.find(dateMatch);
    const orders = await SalesOrder.find({});
    const quotes = await SalesQuotation.find({});
    const returns = await SalesReturn.find({});
    const creditNotes = await CreditNote.find({});
    const customers = await Customer.find({});

    const totalSales = invoices.reduce((sum, item) => sum + item.grandTotal, 0);
    const totalTax = invoices.reduce((sum, item) => sum + (item.cgst + item.sgst + item.igst), 0);
    const totalOutstanding = invoices.filter(i => i.paymentStatus !== 'Paid').reduce((sum, item) => sum + item.grandTotal, 0);

    const orderStats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'Draft' || o.status === 'Pending Approval').length,
      confirmed: orders.filter(o => o.status === 'Approved').length,
      picking: orders.filter(o => o.status === 'Picking').length,
      packed: orders.filter(o => o.status === 'Packed').length,
      shipped: orders.filter(o => o.status === 'Shipped').length,
      completed: orders.filter(o => o.status === 'Completed').length,
      cancelled: orders.filter(o => o.status === 'Cancelled').length
    };

    const quoteStats = {
      total: quotes.length,
      pending: quotes.filter(q => q.status === 'Draft' || q.status === 'Sent').length,
      accepted: quotes.filter(q => q.status === 'Accepted' || q.status === 'Converted').length,
      expired: quotes.filter(q => q.status === 'Expired').length
    };

    return {
      totalSales,
      totalTax,
      totalOutstanding,
      totalCustomers: customers.length,
      orderStats,
      quoteStats,
      totalReturns: returns.length,
      refundAmount: creditNotes.reduce((sum, item) => sum + item.totalAmount, 0),
      gstCollected: totalTax
    };
  },

  // Returns and Inspections Lifecycle
  createReturn: async (data: any, createdBy: string) => {
    const returnNo = `SRN-2026-${String(await SalesReturn.countDocuments() + 1).padStart(5, '0')}`;
    const sr = new SalesReturn({
      returnNo,
      customerId: new mongoose.Types.ObjectId(data.customerId),
      invoiceId: data.invoiceId ? new mongoose.Types.ObjectId(data.invoiceId) : undefined,
      soId: data.soId ? new mongoose.Types.ObjectId(data.soId) : undefined,
      date: new Date(data.date || Date.now()),
      reason: data.reason,
      items: data.items.map((i: any) => ({
        commodityId: new mongoose.Types.ObjectId(i.commodityId),
        quantity: i.quantity,
        rate: i.rate,
        batchNo: i.batchNo
      })),
      status: 'Requested',
      createdBy
    });
    return await sr.save();
  },

  inspectReturn: async (data: any, user: string) => {
    return await runInTransaction(async (session) => {
      const returnRequest = await SalesReturn.findById(data.returnId);
      if (!returnRequest) throw new CustomError('Return request not found', 404);
      if (returnRequest.status === 'Completed') throw new CustomError('Return already processed', 400);

      const inspectionNo = `INS-2026-${String(await ReturnInspection.countDocuments() + 1).padStart(5, '0')}`;
      const inspection = new ReturnInspection({
        inspectionNo,
        returnId: returnRequest._id,
        date: new Date(),
        inspector: user,
        items: data.items.map((i: any) => ({
          commodityId: new mongoose.Types.ObjectId(i.commodityId),
          quantity: i.quantity,
          condition: i.condition,
          result: i.result
        })),
        status: 'Completed'
      });
      await (session ? inspection.save({ session }) : inspection.save());

      // If accepted, add stock back to warehouse inventory
      for (const item of data.items) {
        if (item.result === 'Accepted') {
          const dummyBin = await Bin.findOne({});
          const binId = dummyBin ? String(dummyBin._id) : 'N/A';
          const whId = dummyBin ? String(dummyBin.warehouseId) : 'N/A';

          await inventoryService.createStockLedgerEntry(session, {
            commodityId: String(item.commodityId),
            batchNo: item.batchNo || 'BAT-RETURN',
            warehouseId: whId,
            binId,
            referenceType: 'SALES_RETURN',
            referenceId: returnRequest.returnNo,
            quantityIn: item.quantity,
            quantityOut: 0,
            unitCost: item.rate,
            createdBy: user
          });
        }
      }

      // Generate Credit Note
      const creditNoteNo = `CN-2026-${String(await CreditNote.countDocuments() + 1).padStart(5, '0')}`;
      const taxableAmount = data.items.reduce((sum: number, i: any) => sum + (i.quantity * i.rate), 0);
      const tax = taxableAmount * 0.05; // 5% default
      const grandTotal = taxableAmount + tax;

      const cn = new CreditNote({
        creditNoteNo,
        returnId: returnRequest._id,
        invoiceId: returnRequest.invoiceId,
        customerId: returnRequest.customerId,
        date: new Date(),
        reason: returnRequest.reason,
        taxableAmount,
        cgst: tax / 2,
        sgst: tax / 2,
        igst: 0,
        totalAmount: grandTotal,
        status: 'Approved',
        createdBy: user
      });
      await (session ? cn.save({ session }) : cn.save());

      // Update customer outstanding receivable reduction
      await Customer.updateOne(
        { _id: returnRequest.customerId },
        { $inc: { balance: -grandTotal } },
        { session }
      );

      returnRequest.status = 'Completed';
      await (session ? returnRequest.save({ session }) : returnRequest.save());

      return { inspection, cn };
    });
  },

  // Audit Logs
  logAudit: async (user: string, action: string, module: string, recordId: string, oldValue: string, newValue: string) => {
    const log = new SalesAuditLog({
      user,
      action,
      module,
      recordId,
      oldValue,
      newValue
    });
    await log.save();
  }
};
