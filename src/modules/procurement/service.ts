import mongoose from 'mongoose';
import { PurchaseEnquiry, PurchaseQuotation, PurchaseOrder, GRN, QualityInspection, PurchaseInvoice, QualitySpecification, QualitySample, QualityAuditLog, PurchaseReturn } from './model';
import { Supplier } from '../suppliers/model';
import { Farmer } from '../farmers/model';
import { Commodity } from '../commodities/model';
import { Bin } from '../warehouse/model';
import { CustomError } from '../../middlewares/errorHandler';
import { inventoryService } from '../inventory/service';
import { Voucher, LedgerEntry } from '../finance/model';
import { runInTransaction } from '../../utils/transaction';

// Safe ID helper — stores as ObjectId if valid, otherwise stores as-is (string)
// This allows frontend local IDs (CMD-001, WH-001) to be saved without crashing
const toObjectId = (id: any, fieldName: string): any => {
  if (!id) return undefined;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  // Not a valid ObjectId — return as plain string (frontend local ID)
  return id;
};

// Strict version used only where we must have a real ObjectId
const requireObjectId = (id: any, fieldName: string): mongoose.Types.ObjectId => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new CustomError(`Invalid or missing ObjectId for ${fieldName}: "${id}"`, 400);
  }
  return new mongoose.Types.ObjectId(id);
};

export const procurementService = {
  // --- ENQUIRIES ---
  createEnquiry: async (data: any, createdBy: string) => {
    const enquiryNo = `PEQ-2026-${String(await PurchaseEnquiry.countDocuments() + 1).padStart(5, '0')}`;
    
    const items = (data.items || []).map((i: any) => ({
      item: toObjectId(i.item, 'item'),
      description: i.description || 'Commodity',
      sku: i.sku || 'SKU',
      quantity: i.quantity,
      unit: i.unit || 'MT',
      estimatedRate: i.estimatedRate,
      estimatedAmount: i.estimatedAmount,
      requiredDate: new Date(i.requiredDate || Date.now()),
      remarks: i.remarks
    }));

    const pe = new PurchaseEnquiry({
      enquiryNo,
      date: new Date(data.date || Date.now()),
      requiredByDate: new Date(data.requiredByDate || Date.now()),
      department: data.department || 'Production',
      requestedBy: data.requestedBy || 'Rahul',
      priority: data.priority || 'Medium',
      warehouseId: toObjectId(data.warehouseId, 'warehouseId'),
      purpose: data.purpose,
      status: data.status || 'Draft',
      items,
      createdBy
    });
    return await pe.save();
  },

  // --- QUOTATIONS ---
  createQuotation: async (data: any, createdBy: string) => {
    const quotationNo = `PQT-2026-${String(await PurchaseQuotation.countDocuments() + 1).padStart(5, '0')}`;
    
    const items = (data.items || []).map((i: any) => ({
      item: toObjectId(i.item, 'item'),
      description: i.description,
      sku: i.sku || 'SKU',
      quantity: i.quantity,
      unit: i.unit || 'MT',
      rate: i.rate,
      discount: i.discount || 0,
      taxPercent: i.taxPercent !== undefined ? Number(i.taxPercent) : 0,
      taxAmount: i.taxAmount,
      lineTotal: i.lineTotal,
      deliveryDate: new Date(i.deliveryDate || Date.now())
    }));

    const pq = new PurchaseQuotation({
      quotationNo,
      enquiryNo: data.enquiryNo,
      date: new Date(data.date || Date.now()),
      partyType: data.partyType,
      partyId: toObjectId(data.partyId, 'partyId'),
      validUntil: new Date(data.validUntil || Date.now()),
      paymentTerms: data.paymentTerms || '30 Days',
      deliveryDays: Number(data.deliveryDays || 5),
      freight: Number(data.freight || 0),
      discount: Number(data.discount || 0),
      tax: Number(data.tax || 0),
      grandTotal: Number(data.grandTotal || 0),
      remarks: data.remarks,
      status: 'Sent',
      items,
      createdBy
    });

    return await pq.save();
  },

  compareQuotations: async (enquiryNo: string) => {
    const list = await PurchaseQuotation.find({
      enquiryNo,
      status: 'Sent'
    }).populate('partyId', 'name gstin state phone');

    return list.sort((a, b) => a.grandTotal - b.grandTotal);
  },

  // --- PURCHASE ORDER ---
  createPO: async (data: any, createdBy: string) => {
    const poNo = `PO-2026-${String(await PurchaseOrder.countDocuments() + 1).padStart(5, '0')}`;
    
    const items = (data.items || []).map((i: any) => ({
      item: toObjectId(i.item, 'item'),
      description: i.description || 'Commodity Description',
      quantity: i.quantity,
      unit: i.unit || 'MT',
      rate: i.rate,
      discount: i.discount || 0,
      taxPercent: i.taxPercent !== undefined ? Number(i.taxPercent) : 0,
      taxAmount: i.taxAmount,
      amount: i.amount,
      expectedDelivery: new Date(i.expectedDelivery || Date.now())
    }));

    const po = new PurchaseOrder({
      poNo,
      quotationNo: data.quotationNo,
      date: new Date(data.date || Date.now()),
      partyType: data.partyType,
      partyId: toObjectId(data.partyId, 'partyId'),
      supplierContact: data.supplierContact,
      billingAddress: data.billingAddress,
      shippingAddress: data.shippingAddress,
      expectedDelivery: new Date(data.expectedDelivery || Date.now()),
      paymentTerms: data.paymentTerms || '30 Days',
      currency: data.currency || 'INR',
      buyer: data.buyer || 'Purchase Dept',
      department: data.department || 'Purchase',
      deliveryTerms: data.deliveryTerms,
      freight: Number(data.freight || 0),
      otherCharges: Number(data.otherCharges || 0),
      discount: Number(data.discount || 0),
      tax: Number(data.tax || 0),
      total: Number(data.total || 0),
      notes: data.notes,
      status: data.status || (createdBy === 'Super Admin' || createdBy === 'Purchase Manager' ? 'Approved' : 'Pending Approval'),
      items,
      approvalHistory: [
        { step: 'Creation', user: createdBy, action: 'Created', date: new Date(), comment: 'Initial PO generation' },
        ...((data.status === 'Approved' || createdBy === 'Super Admin' || createdBy === 'Purchase Manager') ? [{ step: 'Manager Approval', user: createdBy, action: 'Approved', date: new Date(), comment: 'Directly authorized upon creation' }] : [])
      ],
      warehouseId: toObjectId(data.warehouseId, 'warehouseId'),
      createdBy
    });

    if (data.quotationNo) {
      await PurchaseQuotation.updateOne({ quotationNo: data.quotationNo }, { status: 'Converted' });
    }

    return await po.save();
  },

  approvePO: async (poId: string, username: string) => {
    const po = await PurchaseOrder.findById(poId);
    if (!po) throw new CustomError('PO not found', 404);
    po.status = 'Approved';
    po.approvalHistory.push({
      step: 'Manager Approval',
      user: username,
      action: 'Approved',
      date: new Date(),
      comment: 'Approved by manager'
    });
    return await po.save();
  },

  // --- GRN (Goods Receipt Inward) ---
  createGRN: async (data: any, createdBy: string) => {
    return await runInTransaction(async (session) => {
      // Find PO by _id if valid ObjectId, otherwise try by poNo
      let po: any = null;
      if (data.poId && mongoose.Types.ObjectId.isValid(data.poId)) {
        const poQuery = PurchaseOrder.findById(data.poId);
        po = await (session ? poQuery.session(session) : poQuery);
      }
      if (!po && data.poNo) {
        const poQuery = PurchaseOrder.findOne({ poNo: data.poNo });
        po = await (session ? poQuery.session(session) : poQuery);
      }

      if (po) {
        const existingGrnQuery = GRN.findOne({
          $or: [
            { poId: po._id },
            { poNo: po.poNo }
          ]
        });
        const existingGrn = await (session ? existingGrnQuery.session(session) : existingGrnQuery);
        if (existingGrn) {
          throw new CustomError(`A GRN (${existingGrn.grnNo}) has already been created for this Purchase Order (${po.poNo})`, 400);
        }
      } else if (data.poNo && data.poNo !== 'N/A' && data.poNo !== 'LOCAL') {
        const existingGrnQuery = GRN.findOne({ poNo: data.poNo });
        const existingGrn = await (session ? existingGrnQuery.session(session) : existingGrnQuery);
        if (existingGrn) {
          throw new CustomError(`A GRN (${existingGrn.grnNo}) has already been created for this Purchase Order (${data.poNo})`, 400);
        }
      }

      const countQuery = GRN.countDocuments();
      const grnNo = data.grnNo || `GRN-2026-${String(await (session ? countQuery.session(session) : countQuery) + 1).padStart(5, '0')}`;
      
      const items = (data.items || []).map((i: any) => ({
        item: toObjectId(i.item, 'item'),
        orderedQty: i.orderedQty || i.quantity || 0,
        previouslyReceived: i.previouslyReceived || 0,
        receivedNow: i.receivedNow || i.quantity || 0,
        totalReceived: i.totalReceived || i.receivedNow || i.quantity || 0,
        pendingQuantity: i.pendingQuantity || 0,
        acceptedQuantity: i.acceptedQuantity || i.receivedNow || i.quantity || 0,
        rejectedQuantity: i.rejectedQuantity || 0,
        damagedQuantity: i.damagedQuantity || 0,
        unit: i.unit || 'MT',
        batchNo: i.batchNo || `BAT-${(po?.poNo || 'PO').slice(-4)}-${Date.now().toString().slice(-3)}`,
        remarks: i.remarks
      }));

      const grn = new GRN({
        grnNo,
        poId: po ? po._id : (data.poId || 'LOCAL'),
        poNo: po ? po.poNo : (data.poNo || 'N/A'),
        invoiceId: data.invoiceId ? toObjectId(data.invoiceId, 'invoiceId') : undefined,
        invoiceNo: data.invoiceNo || '',
        qcId: data.qcId ? toObjectId(data.qcId, 'qcId') : undefined,
        qcNo: data.qcNo || '',
        date: new Date(data.date || Date.now()),
        partyType: po ? po.partyType : (data.partyType || 'supplier'),
        partyId: po ? po.partyId : (data.partyId || 'N/A'),
        vehicleNo: (data.vehicleNo || 'N/A').toUpperCase(),
        driverName: data.driverName || 'N/A',
        arrivalDate: new Date(data.arrivalDate || Date.now()),
        warehouseId: po ? po.warehouseId : (data.warehouseId || 'N/A'),
        challanNo: data.challanNo || '',
        challanDate: new Date(data.challanDate || Date.now()),
        transporter: data.transporter || '',
        remarks: data.remarks || '',
        attachment: data.attachment || (data.photos && data.photos[0]) || '',
        attachments: data.attachments || data.photos || [],
        photos: data.photos || data.attachments || (data.attachment ? [data.attachment] : []),
        qualityStatus: data.qualityStatus || (data.qcNo ? 'Passed' : 'Pending'),
        inwardStatus: 'Completed',
        status: data.status || 'Accepted',
        items,
        createdBy
      });

      await (session ? grn.save({ session }) : grn.save());

      // If linked with a Purchase Invoice, update the invoice's grnNumber
      if (data.invoiceId || data.invoiceNo) {
        const invQuery = PurchaseInvoice.findOne({
          $or: [
            ...(data.invoiceId && mongoose.Types.ObjectId.isValid(data.invoiceId) ? [{ _id: data.invoiceId }] : []),
            ...(data.invoiceNo ? [{ invoiceNo: data.invoiceNo }] : [])
          ]
        });
        const inv = await (session ? invQuery.session(session) : invQuery);
        if (inv) {
          inv.grnNumber = grn.grnNo;
          await (session ? inv.save({ session }) : inv.save());
        }
      } else if (po?.poNo) {
        const invQuery = PurchaseInvoice.findOne({
          poNumber: po.poNo,
          $or: [{ grnNumber: '' }, { grnNumber: { $exists: false } }, { grnNumber: null }]
        });
        const inv = await (session ? invQuery.session(session) : invQuery);
        if (inv) {
          inv.grnNumber = grn.grnNo;
          await (session ? inv.save({ session }) : inv.save());
        }
      }

      // Inward Stock Ledgers for accepted items
      for (const grnItem of grn.items) {
        const poItem = po?.items?.find((i: any) => String(i.item) === String(grnItem.item));
        const unitRate = poItem ? poItem.rate : 20000;

        if (grnItem.acceptedQuantity > 0) {
          await inventoryService.createStockLedgerEntry(session, {
            commodityId: String(grnItem.item),
            batchNo: grnItem.batchNo,
            warehouseId: String(grn.warehouseId),
            binId: 'N/A',
            referenceType: 'QUALITY_ACCEPTANCE',
            referenceId: grn.grnNo,
            quantityIn: grnItem.acceptedQuantity,
            quantityOut: 0,
            unitCost: unitRate,
            createdBy
          });
        }
      }

      if (po) {
        po.status = 'Received';
        await (session ? po.save({ session }) : po.save());
      }

      return grn;
    });
  },

  // --- QUALITY INSPECTION & PRE-INWARD LOT AUDIT ---
  submitQualityInspection: async (data: any, createdBy: string) => {
    return await runInTransaction(async (session) => {
      // Find PO if referenced
      let po: any = null;
      if (data.poId && mongoose.Types.ObjectId.isValid(data.poId)) {
        const poQuery = PurchaseOrder.findById(data.poId);
        po = await (session ? poQuery.session(session) : poQuery);
      }
      if (!po && data.poNo) {
        const poQuery = PurchaseOrder.findOne({ poNo: data.poNo });
        po = await (session ? poQuery.session(session) : poQuery);
      }

      // Find GRN if referenced
      let grn: any = null;
      if (data.grnId && mongoose.Types.ObjectId.isValid(data.grnId)) {
        const grnQuery = GRN.findById(data.grnId);
        grn = await (session ? grnQuery.session(session) : grnQuery);
      }
      if (!grn && data.grnNo) {
        const grnQuery = GRN.findOne({ grnNo: data.grnNo });
        grn = await (session ? grnQuery.session(session) : grnQuery);
      }

      // Determine QC Number
      const dateStr = new Date().getFullYear().toString();
      const count = await QualityInspection.countDocuments();
      const padCount = String(count + 1).padStart(5, '0');
      const qcNo = data.qcNo || `QC-${dateStr}-${padCount}`;

      // Perform automatic parameter evaluation against Admin Quality Specifications
      const itemsPayload: any[] = [];
      let allPassed = true;
      let totalScore = 0;
      const failedBreaches: Array<{ parameterName: string; actualValue: any; allowedLimit: string; unit?: string }> = [];

      for (const reqItem of (data.items || [])) {
        const itemId = toObjectId(reqItem.item, 'item');
        let specs = await QualitySpecification.find({ commodityId: itemId });
        
        if (!specs || specs.length === 0) {
          const comm = await Commodity.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(reqItem.item) ? reqItem.item : undefined }, { commodityCode: reqItem.item }, { name: reqItem.item }] });
          if (comm) {
            specs = await QualitySpecification.find({ commodityId: comm._id });
          }
        }

        const testedParameters = [];
        let itemScore = 100;

        if (specs && specs.length > 0) {
          for (const spec of specs) {
            const actualValObj = (reqItem.testedParameters || []).find((tp: any) => tp.parameterName === spec.parameterName) || { actualValue: reqItem[spec.parameterName] || 0 };
            const actualValue = actualValObj.actualValue;
            let status: 'PASS' | 'FAIL' | 'WARN' = 'PASS';

            if (spec.limitType === '<=') {
              if (Number(actualValue) > (spec.maxLimit || 0)) {
                status = spec.isOptional ? 'WARN' : 'FAIL';
              }
            } else if (spec.limitType === '>=') {
              if (Number(actualValue) < (spec.minLimit || 0)) {
                status = spec.isOptional ? 'WARN' : 'FAIL';
              }
            } else if (spec.limitType === 'Range') {
              if (Number(actualValue) < (spec.minLimit || 0) || Number(actualValue) > (spec.maxLimit || 0)) {
                status = spec.isOptional ? 'WARN' : 'FAIL';
              }
            } else if (spec.limitType === '=') {
              if (spec.textValue && String(actualValue).toLowerCase() !== spec.textValue.toLowerCase()) {
                status = spec.isOptional ? 'WARN' : 'FAIL';
              } else if (spec.minLimit !== undefined && Number(actualValue) !== spec.minLimit) {
                status = spec.isOptional ? 'WARN' : 'FAIL';
              }
            }

            const limitStr = spec.limitType === 'Range' 
              ? `${spec.minLimit}-${spec.maxLimit} ${spec.unit}` 
              : `${spec.limitType} ${spec.maxLimit !== undefined ? spec.maxLimit : spec.minLimit !== undefined ? spec.minLimit : spec.textValue} ${spec.unit}`;

            if (status === 'FAIL') {
              allPassed = false;
              itemScore -= 15;
              failedBreaches.push({
                parameterName: spec.parameterName,
                actualValue,
                allowedLimit: limitStr,
                unit: spec.unit
              });
            }

            testedParameters.push({
              parameterName: spec.parameterName,
              allowedLimit: limitStr,
              actualValue,
              status
            });
          }
        } else {
          const moisture = Number(reqItem.moisturePercent || reqItem.actualMoisture || 0);
          if (moisture > 12.5) {
            allPassed = false;
            itemScore -= 20;
            failedBreaches.push({
              parameterName: 'Moisture',
              actualValue: `${moisture}%`,
              allowedLimit: '<= 12.5%',
              unit: '%'
            });
          }
          const foreignMat = Number(reqItem.foreignMaterialPercent || 0);
          if (foreignMat > 2.0) {
            allPassed = false;
            itemScore -= 15;
            failedBreaches.push({
              parameterName: 'Foreign Material',
              actualValue: `${foreignMat}%`,
              allowedLimit: '<= 2.0%',
              unit: '%'
            });
          }
        }

        totalScore += Math.max(0, itemScore);
        itemsPayload.push({
          item: itemId,
          quantity: reqItem.quantity || reqItem.receivedNow || 0,
          moisturePercent: reqItem.moisturePercent || 0,
          grade: reqItem.grade || (itemScore >= 90 ? 'Grade A' : itemScore >= 70 ? 'Grade B' : 'Rejected / Grade C'),
          color: reqItem.color || 'Standard',
          foreignMaterialPercent: reqItem.foreignMaterialPercent || 0,
          damagePercent: reqItem.damagePercent || 0,
          purityPercent: reqItem.purityPercent || 100,
          qualityScore: Math.max(0, itemScore),
          status: allPassed ? 'PASS' : 'FAIL',
          remarks: reqItem.remarks || (allPassed ? 'Passed all Admin QC policy standards' : 'Failed Admin QC Policy tolerance limits'),
          testedParameters
        });
      }

      const requestedDecision = data.decision || (allPassed ? 'ACCEPT' : 'REJECT');
      const totalLotQty = data.receivedQuantity || (grn ? grn.items.reduce((sum: number, item: any) => sum + item.receivedNow, 0) : (po ? po.items.reduce((sum: number, item: any) => sum + item.quantity, 0) : 0));

      if (failedBreaches.length > 0 && (requestedDecision === 'ACCEPT' || Number(data.acceptedQuantity) > 0)) {
        const breachDetails = failedBreaches.map(b => `"${b.parameterName}" (${b.actualValue}) exceeds Admin limit of ${b.allowedLimit}`).join(', ');
        throw new CustomError(`Quality Policy Violation: Order cannot be Accepted because parameter(s) breach Admin limits: ${breachDetails}. This order must be Rejected.`, 400);
      }

      const basePrice = data.basePrice || (po ? po.items[0]?.rate : 2500) || 2500;
      const priceDeduction = data.priceDeduction || 0;
      const finalPrice = Math.max(0, basePrice - priceDeduction);

      let decision: 'ACCEPT' | 'PARTIAL ACCEPT' | 'REJECT' | 'HOLD' = requestedDecision;
      if (failedBreaches.length > 0) {
        decision = (requestedDecision === 'HOLD') ? 'HOLD' : 'REJECT';
      }

      const acceptedQuantity = (decision === 'ACCEPT' || decision === 'PARTIAL ACCEPT') ? (data.acceptedQuantity || (decision === 'ACCEPT' ? totalLotQty : 0)) : 0;
      const rejectedQuantity = decision === 'REJECT' ? totalLotQty : (data.rejectedQuantity || 0);
      const holdQuantity = decision === 'HOLD' ? totalLotQty : (data.holdQuantity || 0);
      const grade = data.grade || (allPassed ? 'Grade A' : 'Rejected');

      const qi = new QualityInspection({
        qcNo,
        poId: po ? po._id : (data.poId ? toObjectId(data.poId, 'poId') : undefined),
        poNo: po ? po.poNo : data.poNo,
        grnId: grn ? grn._id : (data.grnId ? toObjectId(data.grnId, 'grnId') : undefined),
        grnNo: grn ? grn.grnNo : data.grnNo,
        inspector: createdBy,
        date: new Date(),
        status: decision === 'REJECT' ? 'Rejected' : decision === 'HOLD' ? 'On Hold' : 'Approved',
        decision,
        grade,
        receivedQuantity: totalLotQty,
        acceptedQuantity,
        rejectedQuantity,
        holdQuantity,
        damagedQuantity: data.damagedQuantity || 0,
        basePrice,
        finalPrice,
        priceDeduction,
        reInspectionOf: data.reInspectionOf ? toObjectId(data.reInspectionOf, 'reInspectionOf') : undefined,
        notes: data.notes || (failedBreaches.length > 0 ? `Rejected by Admin QC Policy: ${failedBreaches.map(b => `${b.parameterName} (${b.actualValue}) > ${b.allowedLimit}`).join('; ')}` : ''),
        sampleId: data.sampleId,
        items: itemsPayload,
        approvalHistory: [{
          step: 'QC Inspection & Policy Evaluation',
          user: createdBy,
          action: decision === 'REJECT' ? 'Rejected' : 'Approved',
          date: new Date(),
          comment: decision === 'REJECT' 
            ? `QC Inspection Failed Admin Quality Policy: ${failedBreaches.map(b => `${b.parameterName} breached limit`).join(', ')}. Order Rejected.`
            : `QC inspection completed. Status set to ${decision}.`
        }]
      });
      await (session ? qi.save({ session }) : qi.save());

      if (grn) {
        grn.qualityStatus = decision === 'ACCEPT' ? 'Passed' : decision === 'REJECT' ? 'Rejected' : decision === 'PARTIAL ACCEPT' ? 'Partially Passed' : 'On Hold';
        grn.status = decision === 'ACCEPT' || decision === 'PARTIAL ACCEPT' ? 'Accepted' : decision === 'REJECT' ? 'Rejected' : 'Pending QC';
        grn.qcId = qi._id;
        grn.qcNo = qi.qcNo;
        await (session ? grn.save({ session }) : grn.save());
      }

      return qi;
    });
  },

  // --- PURCHASE INVOICING ---
  createInvoice: async (data: any, createdBy: string) => {
    const invoiceCount = await PurchaseInvoice.countDocuments();
    const invoiceNo = data.invoiceNo || data.supplierInvoiceNo || `PINV-2026-${String(invoiceCount + 1).padStart(5, '0')}`;
    const date = new Date(data.invoiceDate || Date.now());
    const dueDate = data.dueDate && !isNaN(new Date(data.dueDate).getTime()) ? new Date(data.dueDate) : new Date(date.getTime() + 86400000 * 30);
    const poNumber = data.poNumber || data.poNo || 'PO-2026';
    const qcNumber = data.qcNumber || data.qcNo || '';
    const qcId = data.qcId ? toObjectId(data.qcId, 'qcId') : undefined;
    const grnNumber = data.grnNumber || data.grnNo || '';
    const paymentTerms = data.paymentTerms || '30 Days Net';

    const items = (data.items || []).map((i: any) => ({
      item: toObjectId(i.item, 'item'),
      poQty: i.poQty || i.quantity || 0,
      receivedQty: i.receivedQty || i.acceptedQuantity || i.invoiceQty || 0,
      invoiceQty: i.invoiceQty || i.acceptedQuantity || i.quantity || 0,
      rate: i.rate || i.settledRate || 0,
      baseRate: i.baseRate !== undefined ? Number(i.baseRate) : (i.rate || 0),
      qualityRebatePerUnit: i.qualityRebatePerUnit !== undefined ? Number(i.qualityRebatePerUnit) : 0,
      qualityRebateTotal: i.qualityRebateTotal !== undefined ? Number(i.qualityRebateTotal) : 0,
      settledRate: i.settledRate !== undefined ? Number(i.settledRate) : (i.rate || 0),
      discount: i.discount || 0,
      taxPercent: i.taxPercent !== undefined ? Number(i.taxPercent) : 0,
      taxAmount: i.taxAmount || 0,
      amount: i.amount || ((i.invoiceQty || 0) * (i.rate || 0))
    }));

    const invoice = new PurchaseInvoice({
      invoiceNo,
      invoiceDate: date,
      supplierId: toObjectId(data.supplierId, 'supplierId'),
      partyType: data.partyType || 'supplier',
      poNumber,
      qcId,
      qcNumber,
      grnNumber,
      dueDate,
      paymentTerms,
      supplierGSTIN: data.supplierGSTIN || '',
      billingAddress: data.billingAddress || '',
      shippingAddress: data.shippingAddress || '',
      taxType: data.taxType || 'GST',
      subtotal: Number(data.subtotal || 0),
      baseSubtotal: data.baseSubtotal !== undefined ? Number(data.baseSubtotal) : undefined,
      qualityRebateDeduction: Number(data.qualityRebateDeduction || 0),
      discount: Number(data.discount || 0),
      cgst: Number(data.cgst || 0),
      sgst: Number(data.sgst || 0),
      igst: Number(data.igst || 0),
      freight: Number(data.freight || 0),
      otherCharges: Number(data.otherCharges || 0),
      roundOff: Number(data.roundOff || 0),
      grandTotal: Number(data.grandTotal || data.total || 0),
      status: data.status || 'Matched',
      items,
      mismatchReason: data.mismatchReason,
      createdBy
    });

    return await invoice.save();
  },

  approveInvoice: async (invoiceId: string, username: string) => {
    const invoice = await PurchaseInvoice.findById(invoiceId);
    if (!invoice) throw new CustomError('Invoice not found', 404);
    
    invoice.status = 'Approved';
    
    if (invoice.partyType === 'supplier') {
      const sup = await Supplier.findById(invoice.supplierId);
      if (sup) {
        sup.balance += invoice.grandTotal;
        await sup.save();
      }
    } else {
      const farmer = await Farmer.findById(invoice.supplierId);
      if (farmer) {
        farmer.balance += invoice.grandTotal;
        await farmer.save();
      }
    }

    return await invoice.save();
  },

  getEnquiries: async () => {
    return await PurchaseEnquiry.find().sort({ createdAt: -1 });
  },

  getQuotations: async () => {
    return await PurchaseQuotation.find().sort({ createdAt: -1 });
  },

  getPOs: async () => {
    return await PurchaseOrder.find().sort({ createdAt: -1 });
  },

  getGRNs: async () => {
    return await GRN.find().sort({ createdAt: -1 });
  },

  getQualityInspections: async () => {
    return await QualityInspection.find().sort({ createdAt: -1 });
  },

  getInvoices: async () => {
    return await PurchaseInvoice.find().sort({ createdAt: -1 });
  },

  updateInvoice: async (id: string, data: any) => {
    const invoice = await PurchaseInvoice.findByIdAndUpdate(id, data, { new: true });
    if (!invoice) throw new CustomError('Invoice not found', 404);
    return invoice;
  },

  updateEnquiry: async (id: string, data: any) => {
    const enquiry = await PurchaseEnquiry.findByIdAndUpdate(id, data, { new: true });
    if (!enquiry) throw new CustomError('Enquiry not found', 404);
    return enquiry;
  },

  updatePO: async (id: string, data: any) => {
    const po = await PurchaseOrder.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!po) throw new CustomError('PO not found', 404);
    return po;
  },

  updateGRN: async (id: string, data: any) => {
    const grn = await GRN.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!grn) throw new CustomError('GRN not found', 404);
    return grn;
  },

  updateQualityInspection: async (id: string, data: any, changedBy: string = 'admin') => {
    const original = await QualityInspection.findById(id);
    if (!original) throw new CustomError('Quality Inspection not found', 404);

    if (data.items) {
      for (const updatedItem of data.items) {
        const origItem = original.items.find(i => String(i.item) === String(updatedItem.item));
        if (origItem) {
          if (updatedItem.testedParameters) {
            for (const updatedParam of updatedItem.testedParameters) {
              const origParam = (origItem.testedParameters || []).find(p => p.parameterName === updatedParam.parameterName);
              if (origParam && String(origParam.actualValue) !== String(updatedParam.actualValue)) {
                const log = new QualityAuditLog({
                  inspectionId: original._id,
                  parameterName: updatedParam.parameterName,
                  oldValue: String(origParam.actualValue),
                  newValue: String(updatedParam.actualValue),
                  changedBy,
                  reason: data.auditReason || 'Manual QC Parameter Adjustment'
                });
                await log.save();
              }
            }
          }
        }
      }
    }

    const qi = await QualityInspection.findByIdAndUpdate(id, { $set: data }, { new: true });
    return qi;
  },

  updateQuotation: async (id: string, data: any) => {
    const q = await PurchaseQuotation.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!q) throw new CustomError('Quotation not found', 404);
    return q;
  },

  // --- NEW QUALITY CONTROL METRIC SERVICES ---
  getSpecs: async (commodityId?: string) => {
    const query = commodityId ? { commodityId: toObjectId(commodityId, 'commodityId') } : {};
    return await QualitySpecification.find(query);
  },

  createSpec: async (data: any) => {
    const spec = new QualitySpecification({
      commodityId: toObjectId(data.commodityId, 'commodityId'),
      parameterName: data.parameterName,
      limitType: data.limitType,
      minLimit: data.minLimit,
      maxLimit: data.maxLimit,
      textValue: data.textValue,
      tolerancePercent: data.tolerancePercent,
      unit: data.unit,
      isOptional: data.isOptional || false
    });
    return await spec.save();
  },

  deleteSpec: async (id: string) => {
    const spec = await QualitySpecification.findByIdAndDelete(id);
    if (!spec) throw new CustomError('Specification not found', 404);
    return spec;
  },

  getSamples: async () => {
    return await QualitySample.find().sort({ createdAt: -1 });
  },

  createSample: async (data: any, createdBy: string) => {
    const dateStr = new Date().getFullYear().toString();
    const count = await QualitySample.countDocuments();
    const padCount = String(count + 1).padStart(5, '0');
    const sampleId = `SMP-${dateStr}-${padCount}`;

    const sample = new QualitySample({
      sampleId,
      grnId: toObjectId(data.grnId, 'grnId'),
      grnNo: data.grnNo,
      vehicleNo: data.vehicleNo,
      batchNo: data.batchNo,
      commodityId: toObjectId(data.commodityId, 'commodityId'),
      totalQuantity: data.totalQuantity,
      sampleQuantity: data.sampleQuantity,
      sampleLocation: data.sampleLocation,
      sampleDate: new Date(data.sampleDate || Date.now()),
      collectedBy: createdBy,
      sampleCondition: data.sampleCondition,
      remarks: data.remarks
    });

    await GRN.findByIdAndUpdate(data.grnId, { qualityStatus: 'Pending', status: 'Pending QC' });
    return await sample.save();
  },

  getAuditLogs: async (inspectionId: string) => {
    return await QualityAuditLog.find({ inspectionId: toObjectId(inspectionId, 'inspectionId') }).sort({ createdAt: -1 });
  },

  getQcDashboard: async () => {
    const inspections = await QualityInspection.find();
    const pendingGRNs = await GRN.find({ qualityStatus: 'Pending' });

    const total = inspections.length;
    const passed = inspections.filter(q => q.decision === 'ACCEPT' || q.decision === 'PARTIAL ACCEPT').length;
    const rejected = inspections.filter(q => q.decision === 'REJECT').length;
    const hold = inspections.filter(q => q.decision === 'HOLD').length;

    let avgScore = 0;
    if (total > 0) {
      let sum = 0;
      let count = 0;
      inspections.forEach(ins => {
        ins.items.forEach(item => {
          if (item.qualityScore) {
            sum += item.qualityScore;
            count++;
          }
        });
      });
      avgScore = count > 0 ? Math.round(sum / count) : 90;
    }

    return {
      totalInspections: total,
      passedToday: passed,
      rejectedToday: rejected,
      onHold: hold,
      pendingGRNsCount: pendingGRNs.length,
      averageQualityScore: avgScore
    };
  },

  // --- PURCHASE RETURNS SERVICES ---
  getPurchaseReturns: async () => {
    return await PurchaseReturn.find().sort({ createdAt: -1 });
  },

  getPurchaseReturnById: async (id: string) => {
    const pr = await PurchaseReturn.findById(id);
    if (!pr) throw new CustomError('Purchase Return not found', 404);
    return pr;
  },

  createPurchaseReturn: async (data: any, createdBy: string) => {
    const year = new Date().getFullYear().toString();
    const count = await PurchaseReturn.countDocuments();
    const padCount = String(count + 1).padStart(5, '0');
    const returnNumber = `PR-${year}-${padCount}`;

    const items = (data.items || []).map((i: any) => ({
      commodityId: toObjectId(i.commodityId, 'commodityId'),
      batchNo: i.batchNo,
      binId: toObjectId(i.binId, 'binId'),
      quantity: Number(i.quantity),
      unit: i.unit || 'KG',
      rate: Number(i.rate || 0),
      taxableAmount: Number(i.taxableAmount || 0),
      taxAmount: Number(i.taxAmount || 0),
      totalAmount: Number(i.totalAmount || 0),
      reason: i.reason || data.reason || 'Quality Rejection'
    }));

    const pr = new PurchaseReturn({
      returnNumber,
      returnDate: new Date(data.returnDate || Date.now()),
      supplierId: toObjectId(data.supplierId, 'supplierId'),
      purchaseOrderId: data.purchaseOrderId ? toObjectId(data.purchaseOrderId, 'purchaseOrderId') : undefined,
      grnId: data.grnId ? toObjectId(data.grnId, 'grnId') : undefined,
      purchaseInvoiceId: data.purchaseInvoiceId ? toObjectId(data.purchaseInvoiceId, 'purchaseInvoiceId') : undefined,
      warehouseId: toObjectId(data.warehouseId, 'warehouseId'),
      items,
      returnType: data.returnType || 'Quality',
      reason: data.reason || 'Quality Rejection',
      subtotal: Number(data.subtotal || 0),
      discount: Number(data.discount || 0),
      tax: Number(data.tax || 0),
      freight: Number(data.freight || 0),
      grandTotal: Number(data.grandTotal || 0),
      status: 'Draft',
      createdBy,
      remarks: data.remarks
    });

    return await pr.save();
  },

  submitPurchaseReturn: async (id: string) => {
    const pr = await PurchaseReturn.findById(id);
    if (!pr) throw new CustomError('Purchase Return not found', 404);
    if (pr.status !== 'Draft') throw new CustomError('Only Draft returns can be submitted', 400);

    pr.status = 'Submitted';
    return await pr.save();
  },

  approvePurchaseReturn: async (id: string, approvedBy: string) => {
    const pr = await PurchaseReturn.findById(id);
    if (!pr) throw new CustomError('Purchase Return not found', 404);
    if (pr.status !== 'Submitted') throw new CustomError('Only Submitted returns can be approved', 400);

    pr.status = 'Approved';
    pr.approvedBy = approvedBy;
    pr.approvedAt = new Date();
    return await pr.save();
  },

  rejectPurchaseReturn: async (id: string) => {
    const pr = await PurchaseReturn.findById(id);
    if (!pr) throw new CustomError('Purchase Return not found', 404);
    if (pr.status !== 'Submitted') throw new CustomError('Only Submitted returns can be rejected', 400);

    pr.status = 'Rejected';
    return await pr.save();
  },

  dispatchPurchaseReturn: async (id: string, createdBy: string) => {
    return await runInTransaction(async (session) => {
      const prQuery = PurchaseReturn.findById(id);
      const pr = await (session ? prQuery.session(session) : prQuery);
      if (!pr) throw new CustomError('Purchase Return not found', 404);
      if (pr.status !== 'Approved') throw new CustomError('Only Approved returns can be dispatched', 400);

      // Decrement stock from the bins using stock ledger entries
      for (const item of pr.items) {
        // Validate available capacity in bin first
        const bin = await (session ? Bin.findById(item.binId).session(session) : Bin.findById(item.binId));
        if (!bin) throw new CustomError('Storage bin not found for dispatch', 404);

        const binStock = bin.currentStock.find(s => s.batchNo === item.batchNo);
        const availableQty = binStock ? binStock.quantity : 0;
        if (availableQty < item.quantity) {
          throw new CustomError(`Insufficient stock in bin ${bin.binCode} for batch ${item.batchNo}. Available: ${availableQty} KG, Returning: ${item.quantity} KG`, 400);
        }

        // Deduct stock ledger
        await inventoryService.createStockLedgerEntry(session, {
          commodityId: String(item.commodityId),
          batchNo: item.batchNo,
          warehouseId: String(pr.warehouseId),
          binId: String(item.binId),
          referenceType: 'PURCHASE_RETURN',
          referenceId: pr.returnNumber,
          quantityIn: 0,
          quantityOut: item.quantity,
          unitCost: item.rate,
          createdBy
        });
      }

      pr.status = 'Goods Outward';
      await (session ? pr.save({ session }) : pr.save());
      return pr;
    });
  },

  completePurchaseReturn: async (id: string) => {
    const pr = await PurchaseReturn.findById(id);
    if (!pr) throw new CustomError('Purchase Return not found', 404);
    if (pr.status !== 'Goods Outward') throw new CustomError('Only dispatched returns can be completed', 400);

    // Generate Debit Note Number
    const year = new Date().getFullYear().toString();
    const count = await PurchaseReturn.countDocuments({ debitNoteId: { $exists: true } });
    const padCount = String(count + 1).padStart(5, '0');
    pr.debitNoteId = `DN-${year}-${padCount}`;

    // Adjust supplier / farmer payables balance
    const sup = await Supplier.findById(pr.supplierId);
    if (sup) {
      sup.balance = Math.max(0, sup.balance - pr.grandTotal);
      await sup.save();
    } else {
      const farmer = await Farmer.findById(pr.supplierId);
      if (farmer) {
        farmer.balance = Math.max(0, farmer.balance - pr.grandTotal);
        await farmer.save();
      }
    }

    pr.status = 'Completed';
    return await pr.save();
  },

  deleteEnquiry: async (id: string) => {
    return await PurchaseEnquiry.findByIdAndDelete(id);
  },
  deleteQuotation: async (id: string) => {
    return await PurchaseQuotation.findByIdAndDelete(id);
  },
  deletePO: async (id: string) => {
    return await PurchaseOrder.findByIdAndDelete(id);
  },
  deleteGRN: async (id: string) => {
    return await GRN.findByIdAndDelete(id);
  },
  deleteInvoice: async (id: string) => {
    return await PurchaseInvoice.findByIdAndDelete(id);
  },
  deletePurchaseReturn: async (id: string) => {
    return await PurchaseReturn.findByIdAndDelete(id);
  },
  deleteQualityInspection: async (id: string) => {
    return await QualityInspection.findByIdAndDelete(id);
  }
};

