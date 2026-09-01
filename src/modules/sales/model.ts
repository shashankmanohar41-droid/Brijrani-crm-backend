import { Schema, model, Document, Types } from 'mongoose';

// 1. Sales Enquiry
export interface ISalesEnquiry extends Document {
  enquiryNo: string;
  date: Date;
  customerId: Types.ObjectId;
  commodityId: Types.ObjectId;
  quantity: number;
  expectedRate: number;
  requiredDeliveryDate: Date;
  deliveryLocation: string;
  status: 'Draft' | 'Sent' | 'Negotiation' | 'Approved' | 'Converted' | 'Closed' | 'Cancelled';
  createdBy: string;
}

const salesEnquirySchema = new Schema<ISalesEnquiry>({
  enquiryNo: { type: String, required: true, unique: true, index: true },
  date: { type: Date, required: true, default: Date.now },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  commodityId: { type: Schema.Types.ObjectId, ref: 'Commodity', required: true },
  quantity: { type: Number, required: true },
  expectedRate: { type: Number, required: true },
  requiredDeliveryDate: { type: Date, required: true },
  deliveryLocation: { type: String, required: true },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Negotiation', 'Approved', 'Converted', 'Closed', 'Cancelled'],
    default: 'Draft',
    index: true
  },
  createdBy: { type: String, required: true }
}, { timestamps: true });

// 2. Sales Quotation
export interface ISalesQuotation extends Document {
  quotationNo: string;
  enquiryNo?: string;
  date: Date;
  customerId: Types.ObjectId;
  commodityId: Types.ObjectId;
  quantity: number;
  rate: number;
  gstPercent: number;
  freightCost: number;
  loadingCost: number;
  otherCharges: number;
  discountAmount: number;
  total: number;
  validUntil: Date;
  paymentTerms: string;
  deliveryTerms: string;
  purchaseCost: number; // Avg cost baseline
  expectedProfit: number;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Negotiation' | 'Accepted' | 'Rejected' | 'Expired' | 'Converted';
  createdBy: string;
}

const salesQuotationSchema = new Schema<ISalesQuotation>({
  quotationNo: { type: String, required: true, unique: true, index: true },
  enquiryNo: { type: String },
  date: { type: Date, required: true, default: Date.now },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  commodityId: { type: Schema.Types.ObjectId, ref: 'Commodity', required: true },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  gstPercent: { type: Number, default: 5 },
  freightCost: { type: Number, default: 0 },
  loadingCost: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  validUntil: { type: Date, required: true },
  paymentTerms: { type: String, default: 'Net 30' },
  deliveryTerms: { type: String, default: 'FOB' },
  purchaseCost: { type: Number, required: true },
  expectedProfit: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Viewed', 'Negotiation', 'Accepted', 'Rejected', 'Expired', 'Converted'],
    default: 'Draft',
    index: true
  },
  createdBy: { type: String, required: true }
}, { timestamps: true });

// 3. Sales Order
export interface ISalesOrder extends Document {
  soNo: string;
  quotationNo?: string;
  date: Date;
  customerId: Types.ObjectId;
  commodityId: Types.ObjectId;
  quantity: number;
  rate: number;
  gstPercent: number;
  freightCost: number;
  otherCharges: number;
  total: number;
  warehouseId: Types.ObjectId;
  deliveryAddress: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Picking' | 'Packed' | 'Shipped' | 'Completed' | 'Cancelled';
  createdBy: string;
}

const salesOrderSchema = new Schema<ISalesOrder>({
  soNo: { type: String, required: true, unique: true, index: true },
  quotationNo: { type: String },
  date: { type: Date, required: true, default: Date.now },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  commodityId: { type: Schema.Types.ObjectId, ref: 'Commodity', required: true },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  gstPercent: { type: Number, default: 5 },
  freightCost: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  total: { type: Number, required: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  deliveryAddress: { type: String, required: true },
  status: {
    type: String,
    enum: ['Draft', 'Pending Approval', 'Approved', 'Picking', 'Packed', 'Shipped', 'Completed', 'Cancelled'],
    default: 'Draft',
    index: true
  },
  createdBy: { type: String, required: true }
}, { timestamps: true });

// 4. Picking Task
export interface IPickingTask extends Document {
  pickingNo: string;
  soId: Types.ObjectId;
  date: Date;
  warehouseId: Types.ObjectId;
  commodityId: Types.ObjectId;
  batchNo: string;
  binId: Types.ObjectId;
  qtyToPick: number;
  qtyPicked: number;
  status: 'Pending' | 'Completed';
  createdBy: string;
}

const pickingTaskSchema = new Schema<IPickingTask>({
  pickingNo: { type: String, required: true, unique: true, index: true },
  soId: { type: Schema.Types.ObjectId, ref: 'SalesOrder', required: true, index: true },
  date: { type: Date, required: true, default: Date.now },
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  commodityId: { type: Schema.Types.ObjectId, ref: 'Commodity', required: true },
  batchNo: { type: String, required: true },
  binId: { type: Schema.Types.ObjectId, ref: 'Bin', required: true },
  qtyToPick: { type: Number, required: true },
  qtyPicked: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending', index: true },
  createdBy: { type: String, required: true }
}, { timestamps: true });

// 5. Packing Slip
export interface IPackingSlip extends Document {
  packingNo: string;
  pickingId: Types.ObjectId;
  soId: Types.ObjectId;
  customerId: Types.ObjectId;
  commodityId: Types.ObjectId;
  batchNo: string;
  quantity: number;
  packageType: string;
  numPackages: number;
  weight: number;
  packingDate: Date;
  status: 'Pending' | 'Completed';
  createdBy: string;
}

const packingSlipSchema = new Schema<IPackingSlip>({
  packingNo: { type: String, required: true, unique: true, index: true },
  pickingId: { type: Schema.Types.ObjectId, ref: 'PickingTask', required: true },
  soId: { type: Schema.Types.ObjectId, ref: 'SalesOrder', required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  commodityId: { type: Schema.Types.ObjectId, ref: 'Commodity', required: true },
  batchNo: { type: String, required: true },
  quantity: { type: Number, required: true },
  packageType: { type: String, required: true, default: 'PP Bags (50 Kg)' },
  numPackages: { type: Number, required: true },
  weight: { type: Number, required: true },
  packingDate: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Completed', index: true },
  createdBy: { type: String, required: true }
}, { timestamps: true });

// 6. Sales Invoice Item
export interface ISalesInvoiceItem {
  commodityId: Types.ObjectId;
  hsn: string;
  quantity: number;
  rate: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

// 7. Sales Invoice
export interface ISalesInvoice extends Document {
  invoiceNo: string;
  soId: Types.ObjectId;
  customerId: Types.ObjectId;
  invoiceDate: Date;
  dueDate: Date;
  items: ISalesInvoiceItem[];
  taxableAmount: number;
  discountAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  freightCost: number;
  otherCharges: number;
  grandTotal: number;
  placeOfSupply: string; // State e.g. 'Bihar' or 'West Bengal'
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue';
  ewayBillNo?: string;
  createdBy: string;
}

const salesInvoiceSchema = new Schema<ISalesInvoice>({
  invoiceNo: { type: String, required: true, unique: true, index: true },
  soId: { type: Schema.Types.ObjectId, ref: 'SalesOrder', required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  invoiceDate: { type: Date, required: true, default: Date.now, index: true },
  dueDate: { type: Date, required: true, index: true },
  items: {
    type: [{
      commodityId: { type: Schema.Types.ObjectId, ref: 'Commodity', required: true },
      hsn: { type: String, required: true },
      quantity: { type: Number, required: true },
      rate: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      taxableAmount: { type: Number, required: true },
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      igst: { type: Number, default: 0 },
      total: { type: Number, required: true }
    }],
    required: true
  },
  taxableAmount: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  freightCost: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  placeOfSupply: { type: String, required: true },
  paymentStatus: {
    type: String,
    enum: ['Unpaid', 'Partially Paid', 'Paid', 'Overdue'],
    default: 'Unpaid',
    index: true
  },
  ewayBillNo: { type: String },
  createdBy: { type: String, required: true }
}, { timestamps: true });

export const SalesEnquiry = model<ISalesEnquiry>('SalesEnquiry', salesEnquirySchema);
export const SalesQuotation = model<ISalesQuotation>('SalesQuotation', salesQuotationSchema);
export const SalesOrder = model<ISalesOrder>('SalesOrder', salesOrderSchema);
export const PickingTask = model<IPickingTask>('PickingTask', pickingTaskSchema);
export const PackingSlip = model<IPackingSlip>('PackingSlip', packingSlipSchema);
export const SalesInvoice = model<ISalesInvoice>('SalesInvoice', salesInvoiceSchema);

// 8. Sales Return
export interface ISalesReturn extends Document {
  returnNo: string;
  customerId: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  soId?: Types.ObjectId;
  date: Date;
  reason: string;
  items: Array<{
    commodityId: Types.ObjectId;
    quantity: number;
    rate: number;
    batchNo: string;
  }>;
  status: 'Requested' | 'Approved' | 'Pickup Pending' | 'Received' | 'Under Inspection' | 'Completed' | 'Rejected';
  createdBy: string;
}

const salesReturnSchema = new Schema<ISalesReturn>({
  returnNo: { type: String, required: true, unique: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'SalesInvoice' },
  soId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
  date: { type: Date, required: true, default: Date.now },
  reason: { type: String, required: true },
  items: [{
    commodityId: { type: Schema.Types.ObjectId, ref: 'Commodity', required: true },
    quantity: { type: Number, required: true },
    rate: { type: Number, required: true },
    batchNo: { type: String, required: true }
  }],
  status: {
    type: String,
    enum: ['Requested', 'Approved', 'Pickup Pending', 'Received', 'Under Inspection', 'Completed', 'Rejected'],
    default: 'Requested',
    index: true
  },
  createdBy: { type: String, required: true }
}, { timestamps: true });

export const SalesReturn = model<ISalesReturn>('SalesReturn', salesReturnSchema);

// 9. Return Quality Inspection
export interface IReturnInspection extends Document {
  inspectionNo: string;
  returnId: Types.ObjectId;
  date: Date;
  inspector: string;
  items: Array<{
    commodityId: Types.ObjectId;
    quantity: number;
    condition: string;
    result: 'Accepted' | 'Rejected' | 'Repair' | 'Replacement' | 'Scrap';
  }>;
  status: 'Pending' | 'Completed';
}

const returnInspectionSchema = new Schema<IReturnInspection>({
  inspectionNo: { type: String, required: true, unique: true, index: true },
  returnId: { type: Schema.Types.ObjectId, ref: 'SalesReturn', required: true, index: true },
  date: { type: Date, required: true, default: Date.now },
  inspector: { type: String, required: true },
  items: [{
    commodityId: { type: Schema.Types.ObjectId, ref: 'Commodity', required: true },
    quantity: { type: Number, required: true },
    condition: { type: String, required: true },
    result: { type: String, enum: ['Accepted', 'Rejected', 'Repair', 'Replacement', 'Scrap'], required: true }
  }],
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Completed', index: true }
}, { timestamps: true });

export const ReturnInspection = model<IReturnInspection>('ReturnInspection', returnInspectionSchema);

// 10. Credit Note
export interface ICreditNote extends Document {
  creditNoteNo: string;
  returnId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  customerId: Types.ObjectId;
  date: Date;
  reason: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  status: 'Approved' | 'Refunded' | 'Cancelled';
  createdBy: string;
}

const creditNoteSchema = new Schema<ICreditNote>({
  creditNoteNo: { type: String, required: true, unique: true, index: true },
  returnId: { type: Schema.Types.ObjectId, ref: 'SalesReturn' },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'SalesInvoice' },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  date: { type: Date, required: true, default: Date.now },
  reason: { type: String, required: true },
  taxableAmount: { type: Number, required: true },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['Approved', 'Refunded', 'Cancelled'], default: 'Approved', index: true },
  createdBy: { type: String, required: true }
}, { timestamps: true });

export const CreditNote = model<ICreditNote>('CreditNote', creditNoteSchema);

// 11. Refund
export interface IRefund extends Document {
  refundNo: string;
  creditNoteId: Types.ObjectId;
  customerId: Types.ObjectId;
  amount: number;
  date: Date;
  paymentMethod: string;
  referenceNo: string;
  bank?: string;
  status: 'Pending' | 'Completed';
  createdBy: string;
}

const refundSchema = new Schema<IRefund>({
  refundNo: { type: String, required: true, unique: true, index: true },
  creditNoteId: { type: Schema.Types.ObjectId, ref: 'CreditNote', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  paymentMethod: { type: String, required: true },
  referenceNo: { type: String, required: true },
  bank: { type: String },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Completed', index: true },
  createdBy: { type: String, required: true }
}, { timestamps: true });

export const Refund = model<IRefund>('Refund', refundSchema);

// 12. Sales Targets
export interface ISalesTarget extends Document {
  employee: string; // email/id
  period: string; // e.g. '2026-08'
  targetAmount: number;
  actualAmount: number;
  createdBy: string;
}

const salesTargetSchema = new Schema<ISalesTarget>({
  employee: { type: String, required: true, index: true },
  period: { type: String, required: true, index: true },
  targetAmount: { type: Number, required: true },
  actualAmount: { type: Number, default: 0 },
  createdBy: { type: String, required: true }
}, { timestamps: true });

export const SalesTarget = model<ISalesTarget>('SalesTarget', salesTargetSchema);

// 13. Sales Commissions
export interface ISalesCommission extends Document {
  salesperson: string;
  invoiceId: Types.ObjectId;
  amount: number; // Invoice base amount
  commissionRate: number; // percentage
  commission: number;
  status: 'Pending' | 'Paid';
}

const salesCommissionSchema = new Schema<ISalesCommission>({
  salesperson: { type: String, required: true, index: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'SalesInvoice', required: true },
  amount: { type: Number, required: true },
  commissionRate: { type: Number, required: true },
  commission: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending', index: true }
}, { timestamps: true });

export const SalesCommission = model<ISalesCommission>('SalesCommission', salesCommissionSchema);

// 14. Sales Approval Workflow
export interface ISalesApproval extends Document {
  docType: 'Quotation' | 'Order' | 'CreditLimit';
  docId: Types.ObjectId;
  requester: string;
  approver?: string;
  comment?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

const salesApprovalSchema = new Schema<ISalesApproval>({
  docType: { type: String, enum: ['Quotation', 'Order', 'CreditLimit'], required: true },
  docId: { type: Schema.Types.ObjectId, required: true },
  requester: { type: String, required: true },
  approver: { type: String },
  comment: { type: String },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true }
}, { timestamps: true });

export const SalesApproval = model<ISalesApproval>('SalesApproval', salesApprovalSchema);

// 15. Notifications
export interface ISalesNotification extends Document {
  recipient: string; // Email
  message: string;
  type: string;
  read: boolean;
}

const salesNotificationSchema = new Schema<ISalesNotification>({
  recipient: { type: String, required: true, index: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  read: { type: Boolean, default: false }
}, { timestamps: true });

export const SalesNotification = model<ISalesNotification>('SalesNotification', salesNotificationSchema);

// 16. Audit Log
export interface ISalesAuditLog extends Document {
  user: string;
  action: string;
  module: string;
  recordId: string;
  oldValue?: string;
  newValue?: string;
}

const salesAuditLogSchema = new Schema<ISalesAuditLog>({
  user: { type: String, required: true },
  action: { type: String, required: true },
  module: { type: String, required: true },
  recordId: { type: String, required: true },
  oldValue: { type: String },
  newValue: { type: String }
}, { timestamps: true });

export const SalesAuditLog = model<ISalesAuditLog>('SalesAuditLog', salesAuditLogSchema);
