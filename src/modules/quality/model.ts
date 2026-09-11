import { Schema, model, Document, Types } from 'mongoose';

// 1. Quality Parameter Master Model
export interface IQualityParameter extends Document {
  name: string;
  code: string;
  unit: string;
  description?: string;
  status: 'Active' | 'Inactive';
  standardValue?: number;
  minLimit?: number;
  maxLimit?: number;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const qualityParameterSchema = new Schema<IQualityParameter>({
  name: { type: String, required: true, unique: true, trim: true, index: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  unit: { type: String, required: true, default: '%' },
  description: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
  standardValue: { type: Number },
  minLimit: { type: Number },
  maxLimit: { type: Number },
  createdBy: { type: String, default: 'Admin' }
}, { timestamps: true });

// 2. Rebate Slab Definition
export interface IRebateSlab {
  minDeviation: number;
  maxDeviation: number;
  rebateRate: number; // Flat rate or per unit deviation rate
  rateType?: 'Fixed Amount' | 'Per Unit Deviation' | 'Percentage';
  description?: string;
}

const rebateSlabSchema = new Schema<IRebateSlab>({
  minDeviation: { type: Number, required: true },
  maxDeviation: { type: Number, required: true },
  rebateRate: { type: Number, required: true },
  rateType: { type: String, enum: ['Fixed Amount', 'Per Unit Deviation', 'Percentage'], default: 'Per Unit Deviation' },
  description: { type: String }
}, { _id: false });

// 3. Quality Rebate Rule Master Model
export interface IQualityRebateRule extends Document {
  ruleCode: string;
  commodityId: any;
  commodityName: string;
  parameterId?: any;
  parameterName: string;
  unit: string;
  standardValue: number;
  minValue?: number;
  maxValue?: number;
  tolerance: number; // In unit (e.g. 1% tolerance)
  rebateType: 'Standard Rebate' | 'Single Rebate' | 'Double Rebate' | 'All';
  calculationMethod: 'Discount' | 'Pro-Rata' | 'Both';
  rebateBasis: 'Per % Deviation' | 'Flat Rate per MT' | 'Percentage of Base Rate' | 'Tiered Slabs';
  rebateRate: number; // Default rate if no slab applies
  slabs: IRebateSlab[];
  direction: 'HIGHER_IS_WORSE' | 'LOWER_IS_WORSE';
  effectiveFrom: Date;
  effectiveTo?: Date;
  status: 'Active' | 'Inactive';
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const qualityRebateRuleSchema = new Schema<IQualityRebateRule>({
  ruleCode: { type: String, required: true, unique: true, index: true },
  commodityId: { type: Schema.Types.Mixed, required: true, index: true },
  commodityName: { type: String, required: true },
  parameterId: { type: Schema.Types.Mixed },
  parameterName: { type: String, required: true, index: true },
  unit: { type: String, required: true, default: '%' },
  standardValue: { type: Number, required: true },
  minValue: { type: Number },
  maxValue: { type: Number },
  tolerance: { type: Number, default: 0 },
  rebateType: { 
    type: String, 
    enum: ['Standard Rebate', 'Single Rebate', 'Double Rebate', 'All'], 
    default: 'Standard Rebate',
    index: true 
  },
  calculationMethod: { 
    type: String, 
    enum: ['Discount', 'Pro-Rata', 'Both'], 
    default: 'Pro-Rata',
    index: true 
  },
  rebateBasis: { 
    type: String, 
    enum: ['Per % Deviation', 'Flat Rate per MT', 'Percentage of Base Rate', 'Tiered Slabs'], 
    default: 'Per % Deviation' 
  },
  rebateRate: { type: Number, default: 0 },
  slabs: [rebateSlabSchema],
  direction: { 
    type: String, 
    enum: ['HIGHER_IS_WORSE', 'LOWER_IS_WORSE'], 
    default: 'HIGHER_IS_WORSE' 
  },
  effectiveFrom: { type: Date, required: true, default: Date.now },
  effectiveTo: { type: Date },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
  notes: { type: String },
  createdBy: { type: String, default: 'Admin' }
}, { timestamps: true });

// 4. Quality Control Tested Parameter Snapshot
export interface IQCTestedParameter {
  parameterName: string;
  unit: string;
  standardValue: number;
  actualValue: number;
  deviation: number;
  tolerance: number;
  applicableRuleId?: any;
  ruleCode?: string;
  rebateBasis: string;
  rebateRate: number;
  rebatePerUnit: number; // Rebate amount per MT/Qtl
  rebateTotal: number; // rebatePerUnit * quantity
  formulaDescription: string;
  status: 'PASS' | 'WARN' | 'FAIL';
}

const qcTestedParameterSchema = new Schema<IQCTestedParameter>({
  parameterName: { type: String, required: true },
  unit: { type: String, default: '%' },
  standardValue: { type: Number, required: true },
  actualValue: { type: Number, required: true },
  deviation: { type: Number, default: 0 },
  tolerance: { type: Number, default: 0 },
  applicableRuleId: { type: Schema.Types.Mixed },
  ruleCode: { type: String },
  rebateBasis: { type: String, default: 'Per % Deviation' },
  rebateRate: { type: Number, default: 0 },
  rebatePerUnit: { type: Number, default: 0 },
  rebateTotal: { type: Number, default: 0 },
  formulaDescription: { type: String, default: '' },
  status: { type: String, enum: ['PASS', 'WARN', 'FAIL'], default: 'PASS' }
}, { _id: false });

// 5. QC Audit Trail Entry
export interface IQCAuditTrail {
  action: 'Created' | 'Updated' | 'Submitted' | 'Reviewed' | 'Approved' | 'Rejected' | 'Modified_After_Approval';
  user: string;
  timestamp: Date;
  reason?: string;
  previousValues?: any;
  newValues?: any;
  changes?: Array<{ field: string; oldValue: any; newValue: any }>;
}

const qcAuditTrailSchema = new Schema<IQCAuditTrail>({
  action: { 
    type: String, 
    enum: ['Created', 'Updated', 'Submitted', 'Reviewed', 'Approved', 'Rejected', 'Modified_After_Approval'], 
    required: true 
  },
  user: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  reason: { type: String },
  previousValues: { type: Schema.Types.Mixed },
  newValues: { type: Schema.Types.Mixed },
  changes: [{
    field: { type: String },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed }
  }]
}, { _id: false });

// 6. Quality Control Document Model
export interface IQualityControl extends Document {
  qcNumber: string;
  partyType: 'supplier' | 'farmer';
  partyId: any;
  partyName: string;
  commodityId: any;
  commodityName: string;
  vehicleNumber: string;
  quantity: number;
  unit: string;
  baseRate: number; // Purchase Rate per MT/Qtl
  date: Date;
  referenceNumber?: string;
  poId?: any;
  poNumber?: string;
  grnId?: any;
  grnNumber?: string;
  rebateType: 'Standard Rebate' | 'Single Rebate' | 'Double Rebate' | 'All' | 'All Types';
  calculationMethod: 'Discount' | 'Pro-Rata' | 'Both';
  discountRate: number; // e.g., 0.02 (2%) or flat deduction rate
  discountType?: 'PERCENT' | 'FLAT';
  discountAmount: number; // per unit discount
  qualityParameters: IQCTestedParameter[];
  totalRebate: number; // Total deduction per unit
  totalDeduction: number; // totalRebate * quantity
  baseValue: number; // quantity * baseRate
  finalRate: number; // baseRate - totalRebate
  finalValue: number; // quantity * finalRate
  calculationBreakdown: any;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  inspector?: string;
  notes?: string;
  rejectionReason?: string;
  modificationReason?: string;
  createdBy: string;
  updatedBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  auditTrail: IQCAuditTrail[];
  createdAt: Date;
  updatedAt: Date;
}

const qualityControlSchema = new Schema<IQualityControl>({
  qcNumber: { type: String, required: true, unique: true, index: true },
  partyType: { type: String, enum: ['supplier', 'farmer'], required: true },
  partyId: { type: Schema.Types.Mixed, required: true, index: true },
  partyName: { type: String, required: true },
  commodityId: { type: Schema.Types.Mixed, required: true, index: true },
  commodityName: { type: String, required: true },
  vehicleNumber: { type: String, required: true, index: true },
  quantity: { type: Number, required: true, min: [0.0001, 'Quantity must be positive'] },
  unit: { type: String, default: 'MT' },
  baseRate: { type: Number, required: true, min: [0, 'Base rate cannot be negative'] },
  date: { type: Date, required: true, default: Date.now, index: true },
  referenceNumber: { type: String, index: true },
  poId: { type: Schema.Types.Mixed },
  poNumber: { type: String },
  grnId: { type: Schema.Types.Mixed },
  grnNumber: { type: String },
  rebateType: { 
    type: String, 
    enum: ['Standard Rebate', 'Single Rebate', 'Double Rebate', 'All', 'All Types'], 
    required: true,
    index: true 
  },
  calculationMethod: { 
    type: String, 
    enum: ['Discount', 'Pro-Rata', 'Both'], 
    required: true,
    index: true 
  },
  discountRate: { type: Number, default: 0 },
  discountType: { type: String, enum: ['PERCENT', 'FLAT'], default: 'PERCENT' },
  discountAmount: { type: Number, default: 0 },
  qualityParameters: [qcTestedParameterSchema],
  totalRebate: { type: Number, default: 0 },
  totalDeduction: { type: Number, default: 0 },
  baseValue: { type: Number, required: true },
  finalRate: { type: Number, required: true },
  finalValue: { type: Number, required: true },
  calculationBreakdown: { type: Schema.Types.Mixed },
  status: { 
    type: String, 
    enum: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'], 
    default: 'Draft',
    index: true 
  },
  inspector: { type: String, default: 'QC Analyst' },
  notes: { type: String },
  rejectionReason: { type: String },
  modificationReason: { type: String },
  createdBy: { type: String, required: true },
  updatedBy: { type: String },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  rejectedBy: { type: String },
  rejectedAt: { type: Date },
  auditTrail: [qcAuditTrailSchema]
}, { timestamps: true });

export const QualityParameter = model<IQualityParameter>('QualityParameter', qualityParameterSchema);
export const QualityRebateRule = model<IQualityRebateRule>('QualityRebateRule', qualityRebateRuleSchema);
export const QualityControl = model<IQualityControl>('QualityControl', qualityControlSchema);
