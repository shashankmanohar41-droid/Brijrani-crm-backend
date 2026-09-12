import { QualityParameter, QualityRebateRule, QualityControl, IQualityControl } from './model';
import { calculateQualityRebate, CalculationInput } from './calculationEngine';
import { Commodity } from '../commodities/model';
import { Supplier } from '../suppliers/model';
import { Farmer } from '../farmers/model';
import { PurchaseOrder } from '../procurement/model';
import { CustomError } from '../../middlewares/errorHandler';
import mongoose from 'mongoose';

export const qualityService = {
  // ==========================================
  // 1. QUALITY PARAMETERS MASTER
  // ==========================================
  createParameter: async (data: any, user: string = 'Admin') => {
    if (!data.name || !data.code) {
      throw new CustomError('Parameter name and code are required', 400);
    }
    const existing = await QualityParameter.findOne({ 
      $or: [{ name: data.name.trim() }, { code: data.code.trim().toUpperCase() }] 
    });
    if (existing) {
      throw new CustomError(`Quality Parameter with name '${data.name}' or code '${data.code}' already exists`, 400);
    }

    const param = new QualityParameter({
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      unit: data.unit || '%',
      description: data.description,
      status: data.status || 'Active',
      standardValue: data.standardValue,
      minLimit: data.minLimit,
      maxLimit: data.maxLimit,
      createdBy: user
    });
    return await param.save();
  },

  listParameters: async (query: any = {}) => {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { code: { $regex: query.search, $options: 'i' } }
      ];
    }
    return await QualityParameter.find(filter).sort({ name: 1 });
  },

  getParameterById: async (id: string) => {
    const param = await QualityParameter.findById(id);
    if (!param) throw new CustomError('Quality parameter not found', 404);
    return param;
  },

  updateParameter: async (id: string, data: any, user: string = 'Admin') => {
    const param = await QualityParameter.findById(id);
    if (!param) throw new CustomError('Quality parameter not found', 404);

    if (data.name && data.name.trim() !== param.name) {
      const existing = await QualityParameter.findOne({ name: data.name.trim(), _id: { $ne: id } });
      if (existing) throw new CustomError(`Quality parameter name '${data.name}' already exists`, 400);
      param.name = data.name.trim();
    }

    if (data.code && data.code.trim().toUpperCase() !== param.code) {
      const existing = await QualityParameter.findOne({ code: data.code.trim().toUpperCase(), _id: { $ne: id } });
      if (existing) throw new CustomError(`Quality parameter code '${data.code}' already exists`, 400);
      param.code = data.code.trim().toUpperCase();
    }

    if (data.unit !== undefined) param.unit = data.unit;
    if (data.description !== undefined) param.description = data.description;
    if (data.status !== undefined) param.status = data.status;
    if (data.standardValue !== undefined) param.standardValue = data.standardValue;
    if (data.minLimit !== undefined) param.minLimit = data.minLimit;
    if (data.maxLimit !== undefined) param.maxLimit = data.maxLimit;

    return await param.save();
  },

  deleteParameter: async (id: string) => {
    // Check if used in any rebate rules
    const rulesUsing = await QualityRebateRule.find({ 
      $or: [{ parameterId: id }, { parameterName: id }] 
    });
    if (rulesUsing.length > 0) {
      throw new CustomError(`Cannot delete parameter: It is configured in ${rulesUsing.length} Quality/Rebate rule(s)`, 400);
    }
    const param = await QualityParameter.findByIdAndDelete(id);
    if (!param) throw new CustomError('Quality parameter not found', 404);
    return { message: 'Quality parameter deleted successfully' };
  },

  // ==========================================
  // 2. QUALITY / REBATE MASTER RULES
  // ==========================================
  createRule: async (data: any, user: string = 'Admin') => {
    if (!data.commodityId || !data.parameterName || data.standardValue === undefined) {
      throw new CustomError('Commodity, Parameter Name, and Standard Value are required', 400);
    }

    // Resolve commodity name
    let commodityName = data.commodityName;
    if (!commodityName) {
      const comm = await Commodity.findById(data.commodityId);
      commodityName = comm ? comm.name : 'Commodity';
    }

    // Auto-generate rule code if not provided
    let ruleCode = data.ruleCode;
    if (!ruleCode) {
      const cleanComm = (commodityName || 'COMM').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
      const cleanParam = data.parameterName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
      const count = await QualityRebateRule.countDocuments();
      ruleCode = `QRR-${cleanComm}-${cleanParam}-${String(count + 1).padStart(3, '0')}`;
    }

    // Check conflict: Same commodity + parameter + overlapping effective dates
    const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : new Date();
    const effectiveTo = data.effectiveTo ? new Date(data.effectiveTo) : undefined;

    const conflicts = await QualityRebateRule.find({
      commodityId: data.commodityId,
      parameterName: data.parameterName,
      status: 'Active',
      _id: { $ne: data._id }
    });

    for (const conf of conflicts) {
      const cFrom = new Date(conf.effectiveFrom);
      const cTo = conf.effectiveTo ? new Date(conf.effectiveTo) : new Date('2099-12-31');
      const curTo = effectiveTo || new Date('2099-12-31');

      if ((effectiveFrom <= cTo) && (curTo >= cFrom)) {
        // Warning or conflict check
        console.warn(`[QualityRule Notice] Overlapping active rule for ${data.parameterName} on ${commodityName}`);
      }
    }

    const rule = new QualityRebateRule({
      ruleCode,
      commodityId: data.commodityId,
      commodityName,
      parameterId: data.parameterId,
      parameterName: data.parameterName,
      unit: data.unit || '%',
      standardValue: Number(data.standardValue),
      minValue: data.minValue !== undefined ? Number(data.minValue) : undefined,
      maxValue: data.maxValue !== undefined ? Number(data.maxValue) : undefined,
      tolerance: Number(data.tolerance || 0),
      rebateType: data.rebateType || 'Standard Rebate',
      calculationMethod: data.calculationMethod || 'Pro-Rata',
      rebateBasis: data.rebateBasis || 'Per % Deviation',
      rebateRate: Number(data.rebateRate || 0),
      slabs: Array.isArray(data.slabs) ? data.slabs : [],
      direction: data.direction || (data.parameterName.toLowerCase().includes('protein') || data.parameterName.toLowerCase().includes('oil') ? 'LOWER_IS_WORSE' : 'HIGHER_IS_WORSE'),
      effectiveFrom,
      effectiveTo,
      status: data.status || 'Active',
      notes: data.notes,
      createdBy: user
    });

    return await rule.save();
  },

  listRules: async (query: any = {}) => {
    const filter: any = {};
    if (query.commodityId) filter.commodityId = query.commodityId;
    if (query.parameterName) filter.parameterName = query.parameterName;
    if (query.rebateType && query.rebateType !== 'All') filter.rebateType = { $in: [query.rebateType, 'All'] };
    if (query.calculationMethod && query.calculationMethod !== 'Both') filter.calculationMethod = { $in: [query.calculationMethod, 'Both'] };
    if (query.status) filter.status = query.status;

    if (query.search) {
      filter.$or = [
        { ruleCode: { $regex: query.search, $options: 'i' } },
        { commodityName: { $regex: query.search, $options: 'i' } },
        { parameterName: { $regex: query.search, $options: 'i' } }
      ];
    }

    return await QualityRebateRule.find(filter).sort({ commodityName: 1, parameterName: 1, effectiveFrom: -1 });
  },

  getRuleById: async (id: string) => {
    const rule = await QualityRebateRule.findById(id);
    if (!rule) throw new CustomError('Quality rebate rule not found', 404);
    return rule;
  },

  updateRule: async (id: string, data: any, user: string = 'Admin') => {
    const rule = await QualityRebateRule.findById(id);
    if (!rule) throw new CustomError('Quality rebate rule not found', 404);

    if (data.standardValue !== undefined) rule.standardValue = Number(data.standardValue);
    if (data.minValue !== undefined) rule.minValue = Number(data.minValue);
    if (data.maxValue !== undefined) rule.maxValue = Number(data.maxValue);
    if (data.tolerance !== undefined) rule.tolerance = Number(data.tolerance);
    if (data.rebateType) rule.rebateType = data.rebateType;
    if (data.calculationMethod) rule.calculationMethod = data.calculationMethod;
    if (data.rebateBasis) rule.rebateBasis = data.rebateBasis;
    if (data.rebateRate !== undefined) rule.rebateRate = Number(data.rebateRate);
    if (data.slabs !== undefined) rule.slabs = data.slabs;
    if (data.direction) rule.direction = data.direction;
    if (data.effectiveFrom) rule.effectiveFrom = new Date(data.effectiveFrom);
    if (data.effectiveTo !== undefined) rule.effectiveTo = data.effectiveTo ? new Date(data.effectiveTo) : undefined;
    if (data.status) rule.status = data.status;
    if (data.notes !== undefined) rule.notes = data.notes;

    return await rule.save();
  },

  deleteRule: async (id: string) => {
    const rule = await QualityRebateRule.findByIdAndDelete(id);
    if (!rule) throw new CustomError('Quality rebate rule not found', 404);
    return { message: 'Quality rebate rule deleted successfully' };
  },

  duplicateRule: async (id: string, user: string = 'Admin') => {
    const rule = await QualityRebateRule.findById(id);
    if (!rule) throw new CustomError('Quality rebate rule not found', 404);

    const count = await QualityRebateRule.countDocuments();
    const newRuleCode = `${rule.ruleCode}-COPY-${count + 1}`;

    const newRule = new QualityRebateRule({
      ruleCode: newRuleCode,
      commodityId: rule.commodityId,
      commodityName: rule.commodityName,
      parameterId: rule.parameterId,
      parameterName: rule.parameterName,
      unit: rule.unit,
      standardValue: rule.standardValue,
      minValue: rule.minValue,
      maxValue: rule.maxValue,
      tolerance: rule.tolerance,
      rebateType: rule.rebateType,
      calculationMethod: rule.calculationMethod,
      rebateBasis: rule.rebateBasis,
      rebateRate: rule.rebateRate,
      slabs: rule.slabs,
      direction: rule.direction,
      effectiveFrom: new Date(),
      effectiveTo: undefined,
      status: 'Active',
      notes: `Duplicated from ${rule.ruleCode}`,
      createdBy: user
    });

    return await newRule.save();
  },

  toggleRuleStatus: async (id: string) => {
    const rule = await QualityRebateRule.findById(id);
    if (!rule) throw new CustomError('Quality rebate rule not found', 404);
    rule.status = rule.status === 'Active' ? 'Inactive' : 'Active';
    return await rule.save();
  },

  // ==========================================
  // 3. CALCULATION ENGINE PREVIEW
  // ==========================================
  calculatePreview: async (data: CalculationInput) => {
    const commodityId = data.commodityId;
    const txDate = data.transactionDate ? new Date(data.transactionDate) : new Date();

    // Fetch applicable rules for commodity and date if not passed directly
    let rules = data.applicableRules || [];
    if ((!rules || rules.length === 0) && (commodityId || data.commodityName)) {
      const commConditions: any[] = [];
      if (commodityId) commConditions.push({ commodityId });
      if (data.commodityName) commConditions.push({ commodityName: { $regex: new RegExp(`^${data.commodityName.trim()}$`, 'i') } });

      rules = await QualityRebateRule.find({
        $or: commConditions,
        status: 'Active',
        effectiveFrom: { $lte: txDate },
        $and: [
          {
            $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: txDate } }]
          }
        ]
      });
    }

    return calculateQualityRebate({
      ...data,
      applicableRules: rules,
      transactionDate: txDate
    });
  },

  // ==========================================
  // 4. QUALITY CONTROL (QC) OPERATIONS
  // ==========================================
  createQC: async (data: any, user: string = 'Admin') => {
    // Validations
    const poRef = data.poNumber || data.referenceNumber || data.poId;
    if (!poRef) {
      throw new CustomError('Purchase Order linkage is mandatory for Quality Control assessment', 400);
    }

    if (!data.partyId || !data.partyType) {
      throw new CustomError('Supplier/Farmer party selection is required', 400);
    }
    if (!data.commodityId) {
      throw new CustomError('Commodity selection is required', 400);
    }
    if (!data.quantity || Number(data.quantity) <= 0) {
      throw new CustomError('Quantity must be greater than 0', 400);
    }
    if (data.baseRate === undefined || Number(data.baseRate) < 0) {
      throw new CustomError('Purchase/Base Rate cannot be negative', 400);
    }

    // Verify Purchase Order status (Only Approved POs can undergo QC)
    const poLookup: any[] = [];
    if (data.poId && mongoose.Types.ObjectId.isValid(String(data.poId))) {
      poLookup.push({ _id: data.poId });
    }
    if (data.poNumber) {
      poLookup.push({ poNo: data.poNumber });
    }
    if (data.referenceNumber) {
      poLookup.push({ poNo: data.referenceNumber });
    }

    if (poLookup.length > 0) {
      const dbPo = await PurchaseOrder.findOne({ $or: poLookup });
      if (dbPo) {
        const allowedStatuses = ['Approved', 'Sent', 'Partially Received', 'Received'];
        if (!allowedStatuses.includes(dbPo.status)) {
          throw new CustomError(`Purchase Order '${dbPo.poNo}' is currently in '${dbPo.status}' status. Only Approved Purchase Orders can undergo Quality Control inspection.`, 400);
        }
      }
    }

    // Check for existing QC linked to this Purchase Order (excluding Rejected)
    const poConditions: any[] = [];
    if (data.poId) poConditions.push({ poId: data.poId });
    if (data.poNumber) {
      poConditions.push({ poNumber: data.poNumber });
      poConditions.push({ referenceNumber: data.poNumber });
    }
    if (data.referenceNumber) {
      poConditions.push({ referenceNumber: data.referenceNumber });
      poConditions.push({ poNumber: data.referenceNumber });
    }
    if (poConditions.length > 0) {
      const existingQc = await QualityControl.findOne({
        $or: poConditions,
        status: { $ne: 'Rejected' }
      });
      if (existingQc) {
        throw new CustomError(`Quality Control assessment (${existingQc.qcNumber}) already exists for Purchase Order '${poRef}'. Cannot create duplicate QC for the same PO.`, 400);
      }
    }

    // Auto-generate QC number if not provided
    let qcNumber = data.qcNumber;
    if (!qcNumber) {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const count = await QualityControl.countDocuments();
      qcNumber = `QC-${yr}${mo}-${String(count + 1).padStart(4, '0')}`;
    } else {
      const existing = await QualityControl.findOne({ qcNumber });
      if (existing) throw new CustomError(`QC with number '${qcNumber}' already exists`, 400);
    }

    // Resolve party name
    let partyName = data.partyName;
    if (!partyName) {
      if (data.partyType === 'farmer') {
        const farmer = await Farmer.findById(data.partyId);
        partyName = farmer ? farmer.name : 'Farmer';
      } else {
        const supplier = await Supplier.findById(data.partyId);
        partyName = supplier ? supplier.name : 'Supplier';
      }
    }

    // Resolve commodity name
    let commodityName = data.commodityName;
    if (!commodityName) {
      const comm = await Commodity.findById(data.commodityId);
      commodityName = comm ? comm.name : 'Commodity';
    }

    const txDate = data.date ? new Date(data.date) : new Date();

    // Fetch active rebate rules for this commodity and date (by ID or case-insensitive name)
    const commConditions: any[] = [];
    if (data.commodityId) commConditions.push({ commodityId: data.commodityId });
    if (commodityName) commConditions.push({ commodityName: { $regex: new RegExp(`^${commodityName.trim()}$`, 'i') } });

    const rules = await QualityRebateRule.find({
      $or: commConditions.length > 0 ? commConditions : [{ commodityId: data.commodityId }],
      status: 'Active',
      effectiveFrom: { $lte: txDate },
      $and: [
        {
          $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: txDate } }]
        }
      ]
    });

    // Run pure calculation engine
    const calcResult = calculateQualityRebate({
      commodityId: data.commodityId,
      commodityName,
      quantity: Number(data.quantity),
      baseRate: Number(data.baseRate),
      calculationMethod: data.calculationMethod || 'Pro-Rata',
      rebateType: data.rebateType || 'Standard Rebate',
      discountRate: Number(data.discountRate || 0),
      discountType: data.discountType || 'PERCENT',
      qualityParameters: data.qualityParameters || [],
      applicableRules: rules,
      transactionDate: txDate
    });

    const initialAudit: any = {
      action: 'Created',
      user,
      timestamp: new Date(),
      reason: 'Initial QC Creation',
      newValues: {
        qcNumber,
        commodity: commodityName,
        quantity: data.quantity,
        baseRate: data.baseRate,
        finalRate: calcResult.finalRate,
        finalValue: calcResult.finalValue
      }
    };

    const qc = new QualityControl({
      qcNumber,
      partyType: data.partyType,
      partyId: data.partyId,
      partyName,
      commodityId: data.commodityId,
      commodityName,
      vehicleNumber: data.vehicleNumber || 'N/A',
      quantity: Number(data.quantity),
      unit: data.unit || 'MT',
      baseRate: Number(data.baseRate),
      date: txDate,
      referenceNumber: data.referenceNumber || data.poNumber,
      poId: data.poId,
      poNumber: data.poNumber || data.referenceNumber,
      grnId: data.grnId,
      grnNumber: data.grnNumber,
      rebateType: data.rebateType || 'Standard Rebate',
      calculationMethod: data.calculationMethod || 'Pro-Rata',
      discountRate: Number(data.discountRate || 0),
      discountType: data.discountType || 'PERCENT',
      discountAmount: calcResult.totalRebate,
      qualityParameters: calcResult.parameterCalculations,
      totalRebate: calcResult.totalRebate,
      totalDeduction: calcResult.totalDeduction,
      baseValue: calcResult.baseValue,
      finalRate: calcResult.finalRate,
      finalValue: calcResult.finalValue,
      calculationBreakdown: calcResult.calculationBreakdown,
      status: data.status || 'Draft',
      inspector: data.inspector || user,
      notes: data.notes,
      createdBy: user,
      auditTrail: [initialAudit]
    });

    return await qc.save();
  },

  listQC: async (query: any = {}) => {
    const filter: any = {};
    if (query.qcNumber) filter.qcNumber = { $regex: query.qcNumber, $options: 'i' };
    if (query.partyId) filter.partyId = query.partyId;
    if (query.partyType) filter.partyType = query.partyType;
    if (query.commodityId) filter.commodityId = query.commodityId;
    if (query.vehicleNumber) filter.vehicleNumber = { $regex: query.vehicleNumber, $options: 'i' };
    if (query.rebateType) filter.rebateType = query.rebateType;
    if (query.calculationMethod) filter.calculationMethod = query.calculationMethod;
    if (query.status) filter.status = query.status;

    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) filter.date.$gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (query.search) {
      filter.$or = [
        { qcNumber: { $regex: query.search, $options: 'i' } },
        { partyName: { $regex: query.search, $options: 'i' } },
        { commodityName: { $regex: query.search, $options: 'i' } },
        { vehicleNumber: { $regex: query.search, $options: 'i' } },
        { referenceNumber: { $regex: query.search, $options: 'i' } }
      ];
    }

    return await QualityControl.find(filter).sort({ date: -1, createdAt: -1 });
  },

  getQCById: async (id: string) => {
    const qc = await QualityControl.findById(id);
    if (!qc) throw new CustomError('Quality Control record not found', 404);
    return qc;
  },

  updateQC: async (id: string, data: any, user: string = 'Admin') => {
    const qc = await QualityControl.findById(id);
    if (!qc) throw new CustomError('Quality Control record not found', 404);

    const isApproved = qc.status === 'Approved';

    // Approved QC editing rule
    if (isApproved) {
      if (!data.modificationReason || data.modificationReason.trim().length < 5) {
        throw new CustomError('Modifying an Approved QC requires an authorized modification reason (min 5 characters)', 400);
      }
    }

    // Capture old values for audit
    const previousSnapshot = {
      quantity: qc.quantity,
      baseRate: qc.baseRate,
      totalRebate: qc.totalRebate,
      finalRate: qc.finalRate,
      finalValue: qc.finalValue,
      status: qc.status,
      qualityParameters: qc.qualityParameters
    };

    // Apply updates
    if (data.vehicleNumber) qc.vehicleNumber = data.vehicleNumber;
    if (data.referenceNumber !== undefined) qc.referenceNumber = data.referenceNumber;
    if (data.notes !== undefined) qc.notes = data.notes;
    if (data.inspector) qc.inspector = data.inspector;

    const qty = data.quantity !== undefined ? Number(data.quantity) : qc.quantity;
    const rate = data.baseRate !== undefined ? Number(data.baseRate) : qc.baseRate;
    const calcMethod = data.calculationMethod || qc.calculationMethod;
    const rebateType = data.rebateType || qc.rebateType;
    const txDate = data.date ? new Date(data.date) : qc.date;
    const qParams = data.qualityParameters || qc.qualityParameters;

    if (qty <= 0) throw new CustomError('Quantity must be greater than 0', 400);
    if (rate < 0) throw new CustomError('Base rate cannot be negative', 400);

    // Fetch active rules for calculation (by ID or case-insensitive name)
    const commConditions: any[] = [];
    if (qc.commodityId) commConditions.push({ commodityId: qc.commodityId });
    if (qc.commodityName) commConditions.push({ commodityName: { $regex: new RegExp(`^${qc.commodityName.trim()}$`, 'i') } });

    const rules = await QualityRebateRule.find({
      $or: commConditions.length > 0 ? commConditions : [{ commodityId: qc.commodityId }],
      status: 'Active',
      effectiveFrom: { $lte: txDate },
      $and: [
        {
          $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: txDate } }]
        }
      ]
    });

    const calcResult = calculateQualityRebate({
      commodityId: qc.commodityId,
      commodityName: qc.commodityName,
      quantity: qty,
      baseRate: rate,
      calculationMethod: calcMethod,
      rebateType,
      discountRate: Number(data.discountRate ?? qc.discountRate),
      discountType: data.discountType || qc.discountType || 'PERCENT',
      qualityParameters: qParams,
      applicableRules: rules,
      transactionDate: txDate
    });

    qc.quantity = qty;
    qc.baseRate = rate;
    qc.date = txDate;
    qc.calculationMethod = calcMethod;
    qc.rebateType = rebateType;
    if (data.discountRate !== undefined) qc.discountRate = Number(data.discountRate);
    if (data.discountType) qc.discountType = data.discountType;
    qc.qualityParameters = calcResult.parameterCalculations as any;
    qc.totalRebate = calcResult.totalRebate;
    qc.totalDeduction = calcResult.totalDeduction;
    qc.baseValue = calcResult.baseValue;
    qc.finalRate = calcResult.finalRate;
    qc.finalValue = calcResult.finalValue;
    qc.calculationBreakdown = calcResult.calculationBreakdown;
    qc.updatedBy = user;

    if (data.modificationReason) {
      qc.modificationReason = data.modificationReason;
    }

    // Build changes diff
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    if (previousSnapshot.quantity !== qc.quantity) changes.push({ field: 'quantity', oldValue: previousSnapshot.quantity, newValue: qc.quantity });
    if (previousSnapshot.baseRate !== qc.baseRate) changes.push({ field: 'baseRate', oldValue: previousSnapshot.baseRate, newValue: qc.baseRate });
    if (previousSnapshot.finalRate !== qc.finalRate) changes.push({ field: 'finalRate', oldValue: previousSnapshot.finalRate, newValue: qc.finalRate });
    if (previousSnapshot.finalValue !== qc.finalValue) changes.push({ field: 'finalValue', oldValue: previousSnapshot.finalValue, newValue: qc.finalValue });

    qc.auditTrail.push({
      action: isApproved ? 'Modified_After_Approval' : 'Updated',
      user,
      timestamp: new Date(),
      reason: data.modificationReason || 'QC details updated',
      previousValues: previousSnapshot,
      newValues: {
        quantity: qc.quantity,
        baseRate: qc.baseRate,
        totalRebate: qc.totalRebate,
        finalRate: qc.finalRate,
        finalValue: qc.finalValue
      },
      changes
    });

    return await qc.save();
  },

  submitQC: async (id: string, user: string = 'Admin') => {
    const qc = await QualityControl.findById(id);
    if (!qc) throw new CustomError('Quality Control record not found', 404);
    if (qc.status !== 'Draft') {
      throw new CustomError(`Only Draft QC can be submitted. Current status: ${qc.status}`, 400);
    }

    qc.status = 'Submitted';
    qc.updatedBy = user;
    qc.auditTrail.push({
      action: 'Submitted',
      user,
      timestamp: new Date(),
      reason: 'Submitted for managerial verification and approval'
    });

    return await qc.save();
  },

  approveQC: async (id: string, user: string = 'Admin') => {
    const qc = await QualityControl.findById(id);
    if (!qc) throw new CustomError('Quality Control record not found', 404);

    if (qc.status === 'Approved') {
      throw new CustomError('QC record is already approved', 400);
    }

    qc.status = 'Approved';
    qc.approvedBy = user;
    qc.approvedAt = new Date();
    qc.updatedBy = user;

    qc.auditTrail.push({
      action: 'Approved',
      user,
      timestamp: new Date(),
      reason: 'QC inspection approved and finalized'
    });

    return await qc.save();
  },

  rejectQC: async (id: string, reason: string, user: string = 'Admin') => {
    const qc = await QualityControl.findById(id);
    if (!qc) throw new CustomError('Quality Control record not found', 404);
    if (!reason || reason.trim().length === 0) {
      throw new CustomError('Rejection reason is required', 400);
    }

    qc.status = 'Rejected';
    qc.rejectionReason = reason;
    qc.rejectedBy = user;
    qc.rejectedAt = new Date();
    qc.updatedBy = user;

    qc.auditTrail.push({
      action: 'Rejected',
      user,
      timestamp: new Date(),
      reason: `QC Rejected: ${reason}`
    });

    return await qc.save();
  },

  deleteQC: async (id: string, user: string = 'Admin') => {
    const qc = await QualityControl.findById(id);
    if (!qc) throw new CustomError('Quality Control record not found', 404);
    if (qc.status === 'Approved') {
      throw new CustomError('Approved Quality Control records cannot be deleted', 403);
    }

    await QualityControl.findByIdAndDelete(id);
    return { message: `Quality Control record '${qc.qcNumber}' deleted successfully` };
  }
};
