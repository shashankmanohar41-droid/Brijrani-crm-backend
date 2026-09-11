import mongoose from 'mongoose';
import { qualityService } from '../src/modules/quality/service';
import { calculateQualityRebate } from '../src/modules/quality/calculationEngine';
import { QualityParameter, QualityRebateRule, QualityControl } from '../src/modules/quality/model';
import { Commodity } from '../src/modules/commodities/model';
import { Supplier } from '../src/modules/suppliers/model';
import { Farmer } from '../src/modules/farmers/model';

const TEST_MONGO_URI = process.env.MONGODB_URI_TEST || 'mongodb+srv://shashankmanohar1734_db_user:hpIe3ev8T1QsKZMM@cluster0.ws2kdbz.mongodb.net/brijrani_erp_test?retryWrites=true&w=majority';

jest.setTimeout(30000);

describe('Quality Control & Rebate Master Module Test Suite', () => {
  let maizeId: string;
  let wheatId: string;
  let supplierId: string;
  let farmerId: string;
  let paramMoistureId: string;
  let paramProteinId: string;
  let ruleMaizeMoistureId: string;
  let ruleMaizeProteinId: string;

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO_URI);

    // Clean test collections
    await QualityControl.deleteMany({});
    await QualityRebateRule.deleteMany({});
    await QualityParameter.deleteMany({});
    await Commodity.deleteMany({});
    await Supplier.deleteMany({});
    await Farmer.deleteMany({});

    // Seed test commodities
    const maize = await new Commodity({
      commodityCode: 'TEST-MAIZE',
      name: 'Test Maize',
      category: 'Grains',
      unit: 'MT',
      hsn: '10059000',
      gstRate: 5,
      purchasePrice: 25000,
      sellingPrice: 28000
    }).save();
    maizeId = String(maize._id);

    const wheat = await new Commodity({
      commodityCode: 'TEST-WHEAT',
      name: 'Test Wheat',
      category: 'Grains',
      unit: 'MT',
      hsn: '10019910',
      gstRate: 5,
      purchasePrice: 22000,
      sellingPrice: 24500
    }).save();
    wheatId = String(wheat._id);

    // Seed test parties
    const sup = await new Supplier({
      supplierCode: 'TEST-SUP',
      name: 'Kisan Agro Traders',
      gstin: '10AAAAA0000A1Z5',
      phone: '9876543210',
      email: 'kisan@agro.com',
      billingAddress: 'Patna',
      shippingAddress: 'Patna'
    }).save();
    supplierId = String(sup._id);

    const farmer = await new Farmer({
      farmerCode: 'TEST-FARMER',
      name: 'Rameshwar Yadav',
      phone: '9123456780',
      village: 'Bikram',
      district: 'Patna',
      state: 'Bihar'
    }).save();
    farmerId = String(farmer._id);

    // Seed test Quality Parameters
    const qpMoist = await qualityService.createParameter({
      name: 'Moisture',
      code: 'MOIST',
      unit: '%',
      description: 'Grain moisture percentage',
      standardValue: 14,
      status: 'Active'
    });
    paramMoistureId = String(qpMoist._id);

    const qpProt = await qualityService.createParameter({
      name: 'Protein',
      code: 'PROT',
      unit: '%',
      description: 'Crude protein percentage',
      standardValue: 45,
      status: 'Active'
    });
    paramProteinId = String(qpProt._id);

    // Seed test Quality Rebate Rules
    const rule1 = await qualityService.createRule({
      ruleCode: 'RULE-MAIZE-MOIST',
      commodityId: maizeId,
      commodityName: 'Test Maize',
      parameterId: paramMoistureId,
      parameterName: 'Moisture',
      unit: '%',
      standardValue: 14,
      tolerance: 1, // 1% tolerance
      rebateType: 'Standard Rebate',
      calculationMethod: 'Pro-Rata',
      rebateBasis: 'Tiered Slabs',
      rebateRate: 300,
      slabs: [
        { minDeviation: 0, maxDeviation: 1, rebateRate: 0, rateType: 'Fixed Amount', description: '0-1% Tol -> No Rebate' },
        { minDeviation: 1.01, maxDeviation: 2, rebateRate: 200, rateType: 'Per Unit Deviation', description: '1-2% Dev -> Rs 200' },
        { minDeviation: 2.01, maxDeviation: 4, rebateRate: 300, rateType: 'Per Unit Deviation', description: '2-4% Dev -> Rs 300' }
      ],
      direction: 'HIGHER_IS_WORSE',
      effectiveFrom: new Date('2026-01-01'),
      status: 'Active'
    });
    ruleMaizeMoistureId = String(rule1._id);

    const rule2 = await qualityService.createRule({
      ruleCode: 'RULE-MAIZE-PROT',
      commodityId: maizeId,
      commodityName: 'Test Maize',
      parameterId: paramProteinId,
      parameterName: 'Protein',
      unit: '%',
      standardValue: 45,
      tolerance: 0.5,
      rebateType: 'Double Rebate',
      calculationMethod: 'Pro-Rata',
      rebateBasis: 'Per % Deviation',
      rebateRate: 200, // Rs 200 per 1% deficit
      slabs: [],
      direction: 'LOWER_IS_WORSE',
      effectiveFrom: new Date('2026-01-01'),
      status: 'Active'
    });
    ruleMaizeProteinId = String(rule2._id);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  // TEST 1: Discount Calculation
  test('1. Should calculate Discount method accurately using formula', () => {
    const result = calculateQualityRebate({
      quantity: 50,
      baseRate: 20000,
      calculationMethod: 'Discount',
      rebateType: 'Single Rebate',
      discountRate: 0.02, // 2% discount
      discountType: 'PERCENT'
    });

    // Discount Amount = 20000 * 0.02 = 400
    // Final Rate = 20000 - 400 = 19600
    // Final Value = 50 * 19600 = 980000
    expect(result.totalRebate).toBe(400);
    expect(result.finalRate).toBe(19600);
    expect(result.baseValue).toBe(1000000);
    expect(result.totalDeduction).toBe(20000);
    expect(result.finalValue).toBe(980000);
  });

  // TEST 2: Pro-Rata Calculation with Tolerance
  test('2. Should calculate Pro-Rata rebate with tolerance buffer', () => {
    const result = calculateQualityRebate({
      quantity: 100,
      baseRate: 25000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Single Rebate',
      qualityParameters: [
        { parameterName: 'Moisture', actualValue: 14.8, standardValue: 14, tolerance: 1 }
      ]
    });

    // Deviation = 14.8 - 14 = 0.8%, which is <= tolerance (1%), so 0 rebate
    expect(result.totalRebate).toBe(0);
    expect(result.finalRate).toBe(25000);
    expect(result.finalValue).toBe(2500000);
  });

  // TEST 3: Standard Rebate with Slabs
  test('3. Should calculate Standard Rebate using configured tiered slab rules', () => {
    const rules = [
      {
        parameterName: 'Moisture',
        standardValue: 14,
        tolerance: 1,
        direction: 'HIGHER_IS_WORSE',
        slabs: [
          { minDeviation: 0, maxDeviation: 1, rebateRate: 0, rateType: 'Fixed Amount' },
          { minDeviation: 1.01, maxDeviation: 2, rebateRate: 200, rateType: 'Per Unit Deviation' }
        ],
        status: 'Active'
      }
    ];

    const result = calculateQualityRebate({
      quantity: 100,
      baseRate: 25000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Moisture', actualValue: 16 }],
      applicableRules: rules
    });

    // Moisture Actual 16, Std 14 -> Dev 2%. Net Dev = 2 - 1 = 1%. Slab [1.01-2%] rate 200 -> 1 * 200 = 200/MT
    expect(result.totalRebate).toBe(200);
    expect(result.finalRate).toBe(24800);
    expect(result.finalValue).toBe(2480000);
  });

  // TEST 4: Single Rebate
  test('4. Should calculate Single Rebate isolating only the first parameter', () => {
    const rules = [
      { parameterName: 'Moisture', standardValue: 14, tolerance: 0, rebateBasis: 'Per % Deviation', rebateRate: 300, status: 'Active' },
      { parameterName: 'Protein', standardValue: 45, tolerance: 0, rebateBasis: 'Per % Deviation', rebateRate: 200, direction: 'LOWER_IS_WORSE', status: 'Active' }
    ];

    const result = calculateQualityRebate({
      quantity: 100,
      baseRate: 25000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Single Rebate',
      qualityParameters: [
        { parameterName: 'Moisture', actualValue: 16 }, // +2% -> 2 * 300 = 600
        { parameterName: 'Protein', actualValue: 40 }   // -5% -> should be ignored in Single Rebate mode!
      ],
      applicableRules: rules
    });

    expect(result.parameterCalculations.length).toBe(1);
    expect(result.totalRebate).toBe(600);
    expect(result.finalRate).toBe(24400);
  });

  // TEST 5: Double Rebate
  test('5. Should calculate Double Rebate by summing two distinct parameters independently', () => {
    const rules = [
      { parameterName: 'Moisture', standardValue: 14, tolerance: 1, direction: 'HIGHER_IS_WORSE', rebateBasis: 'Per % Deviation', rebateRate: 300, status: 'Active' },
      { parameterName: 'Protein', standardValue: 45, tolerance: 0.5, direction: 'LOWER_IS_WORSE', rebateBasis: 'Per % Deviation', rebateRate: 200, status: 'Active' }
    ];

    // Moisture: Actual 16, Std 14, Tol 1 -> Dev 2, Net Dev 1 -> 1 * 300 = Rs 300/MT
    // Protein: Actual 43, Std 45, Tol 0.5 -> Dev 2, Net Dev 1.5 -> 1.5 * 200 = Rs 300/MT
    // Total Rebate = 300 + 300 = 600/MT
    const result = calculateQualityRebate({
      quantity: 100,
      baseRate: 25000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Double Rebate',
      qualityParameters: [
        { parameterName: 'Moisture', actualValue: 16 },
        { parameterName: 'Protein', actualValue: 43 }
      ],
      applicableRules: rules
    });

    expect(result.parameterCalculations.length).toBe(2);
    expect(result.totalRebate).toBe(600);
    expect(result.finalRate).toBe(24400);
    expect(result.finalValue).toBe(2440000);
  });

  // TEST 6: Multiple Quality Parameters Evaluation
  test('6. Should evaluate multiple quality parameters dynamically', () => {
    const rules = [
      { parameterName: 'Moisture', standardValue: 14, tolerance: 0, rebateRate: 100, status: 'Active' },
      { parameterName: 'Foreign Matter', standardValue: 1, tolerance: 0, rebateRate: 150, status: 'Active' },
      { parameterName: 'Broken Grain', standardValue: 2, tolerance: 0, rebateRate: 50, status: 'Active' }
    ];

    const result = calculateQualityRebate({
      quantity: 10,
      baseRate: 20000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [
        { parameterName: 'Moisture', actualValue: 15 },       // Dev 1 * 100 = 100
        { parameterName: 'Foreign Matter', actualValue: 2 }, // Dev 1 * 150 = 150
        { parameterName: 'Broken Grain', actualValue: 4 }     // Dev 2 * 50 = 100
      ],
      applicableRules: rules
    });

    expect(result.parameterCalculations.length).toBe(3);
    expect(result.totalRebate).toBe(350); // 100 + 150 + 100
    expect(result.finalRate).toBe(19650);
  });

  // TEST 7: Multiple Rebate Rules & Tiered Slabs
  test('7. Should match correct deviation slab tier', () => {
    const ruleWithSlabs = {
      parameterName: 'Moisture',
      standardValue: 12,
      tolerance: 0,
      slabs: [
        { minDeviation: 0, maxDeviation: 1, rebateRate: 50, rateType: 'Fixed Amount' },
        { minDeviation: 1.01, maxDeviation: 3, rebateRate: 250, rateType: 'Fixed Amount' },
        { minDeviation: 3.01, maxDeviation: 6, rebateRate: 500, rateType: 'Fixed Amount' }
      ],
      status: 'Active'
    };

    const result = calculateQualityRebate({
      quantity: 10,
      baseRate: 20000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Moisture', actualValue: 14.5 }], // Dev 2.5 -> Slab 2 -> Rs 250 flat
      applicableRules: [ruleWithSlabs]
    });

    expect(result.totalRebate).toBe(250);
  });

  // TEST 8: Different Commodities
  test('8. Should apply distinct rules for different commodities', async () => {
    const ruleWheat = await qualityService.createRule({
      ruleCode: 'RULE-WHEAT-TEST',
      commodityId: wheatId,
      commodityName: 'Test Wheat',
      parameterName: 'Moisture',
      unit: '%',
      standardValue: 12,
      tolerance: 0,
      rebateType: 'Standard Rebate',
      calculationMethod: 'Pro-Rata',
      rebateBasis: 'Per % Deviation',
      rebateRate: 500, // Higher rebate for wheat
      status: 'Active'
    });

    const qcMaize = await qualityService.createQC({
      partyType: 'farmer',
      partyId: farmerId,
      commodityId: maizeId,
      vehicleNumber: 'BR-01-1111',
      quantity: 10,
      baseRate: 25000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Moisture', actualValue: 16 }] // Maize rule: Rs 200
    }, 'test-user');

    const qcWheat = await qualityService.createQC({
      partyType: 'farmer',
      partyId: farmerId,
      commodityId: wheatId,
      vehicleNumber: 'BR-01-2222',
      quantity: 10,
      baseRate: 22000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Moisture', actualValue: 14 }] // Wheat rule: Rs 500 * (14-12) = 1000
    }, 'test-user');

    expect(qcMaize.totalRebate).toBe(200);
    expect(qcWheat.totalRebate).toBe(1000);
  });

  // TEST 9: Effective Dates Filtering
  test('9. Should select only active rules applicable for the transaction date', () => {
    const expiredRule = {
      parameterName: 'Moisture',
      standardValue: 14,
      rebateRate: 100,
      effectiveFrom: new Date('2025-01-01'),
      effectiveTo: new Date('2025-12-31'),
      status: 'Active'
    };
    const currentRule = {
      parameterName: 'Moisture',
      standardValue: 14,
      rebateRate: 400,
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: new Date('2026-12-31'),
      status: 'Active'
    };

    // Calculate on 2026-06-01 -> should match currentRule (Rs 400 rate)
    const result2026 = calculateQualityRebate({
      quantity: 10,
      baseRate: 25000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Moisture', actualValue: 15 }],
      applicableRules: [expiredRule, currentRule],
      transactionDate: '2026-06-01'
    });

    expect(result2026.totalRebate).toBe(400);

    // Calculate on 2025-06-01 -> should match expiredRule (Rs 100 rate)
    const result2025 = calculateQualityRebate({
      quantity: 10,
      baseRate: 25000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Moisture', actualValue: 15 }],
      applicableRules: [expiredRule, currentRule],
      transactionDate: '2025-06-01'
    });

    expect(result2025.totalRebate).toBe(100);
  });

  // TEST 10: Draft QC Creation & Initial State
  test('10. Should create a QC in Draft status with complete calculation and initial audit trail', async () => {
    const qc = await qualityService.createQC({
      partyType: 'supplier',
      partyId: supplierId,
      commodityId: maizeId,
      vehicleNumber: 'BR-01-TRUCK-1',
      quantity: 80,
      baseRate: 25000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Moisture', actualValue: 16 }]
    }, 'qc-analyst');

    expect(qc.status).toBe('Draft');
    expect(qc.qcNumber).toMatch(/^QC-/);
    expect(qc.totalRebate).toBe(200);
    expect(qc.finalRate).toBe(24800);
    expect(qc.finalValue).toBe(80 * 24800);
    expect(qc.auditTrail.length).toBe(1);
    expect(qc.auditTrail[0].action).toBe('Created');
  });

  // TEST 11: QC Approval Lifecycle
  test('11. Should transition QC through Submit and Approve workflow', async () => {
    const qc = await qualityService.createQC({
      partyType: 'farmer',
      partyId: farmerId,
      commodityId: maizeId,
      vehicleNumber: 'BR-01-TRUCK-2',
      quantity: 50,
      baseRate: 25000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Moisture', actualValue: 14 }]
    }, 'qc-user');

    // Submit
    const submitted = await qualityService.submitQC(String(qc._id), 'qc-user');
    expect(submitted.status).toBe('Submitted');

    // Approve
    const approved = await qualityService.approveQC(String(qc._id), 'manager-user');
    expect(approved.status).toBe('Approved');
    expect(approved.approvedBy).toBe('manager-user');
    expect(approved.approvedAt).toBeDefined();
    expect(approved.auditTrail.length).toBe(3); // Created, Submitted, Approved
  });

  // TEST 12: QC Rejection
  test('12. Should reject QC with mandatory rejection reason', async () => {
    const qc = await qualityService.createQC({
      partyType: 'supplier',
      partyId: supplierId,
      commodityId: maizeId,
      vehicleNumber: 'BR-01-REJECT-1',
      quantity: 30,
      baseRate: 25000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Moisture', actualValue: 22 }]
    }, 'qc-analyst');

    // Rejection without reason should fail
    await expect(qualityService.rejectQC(String(qc._id), '', 'manager')).rejects.toThrow();

    // Rejection with reason
    const rejected = await qualityService.rejectQC(String(qc._id), 'Moisture 22% severely exceeds allowable ceiling of 18%', 'manager');
    expect(rejected.status).toBe('Rejected');
    expect(rejected.rejectionReason).toContain('severely exceeds allowable ceiling');
    expect(rejected.rejectedBy).toBe('manager');
  });

  // TEST 13: Editing Rules & Audit Trail on Approved QC
  test('13. Should enforce authorization reason and record audit diff when editing Approved QC', async () => {
    const qc = await qualityService.createQC({
      partyType: 'farmer',
      partyId: farmerId,
      commodityId: maizeId,
      vehicleNumber: 'BR-01-EDIT-TEST',
      quantity: 40,
      baseRate: 25000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Moisture', actualValue: 15 }]
    }, 'qc-analyst');

    await qualityService.approveQC(String(qc._id), 'manager');

    // Attempting edit on Approved QC without modification reason should fail
    await expect(qualityService.updateQC(String(qc._id), { quantity: 45 }, 'admin')).rejects.toThrow(/modification reason/i);

    // Editing with modification reason
    const updated = await qualityService.updateQC(String(qc._id), {
      quantity: 45,
      modificationReason: 'Weighbridge slip recalibration corrected quantity from 40 MT to 45 MT'
    }, 'admin');

    expect(updated.quantity).toBe(45);
    const lastAudit = updated.auditTrail[updated.auditTrail.length - 1];
    expect(lastAudit.action).toBe('Modified_After_Approval');
    expect(lastAudit.reason).toContain('Weighbridge slip recalibration');
    expect(lastAudit.previousValues.quantity).toBe(40);
  });

  // TEST 14: Historical QC Calculation Integrity
  test('14. Historical QC calculation should remain immutable even if Master Rule is updated later', async () => {
    // 1. Create QC with current rule
    const qc = await qualityService.createQC({
      partyType: 'farmer',
      partyId: farmerId,
      commodityId: maizeId,
      vehicleNumber: 'BR-HISTORICAL-1',
      quantity: 100,
      baseRate: 25000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Moisture', actualValue: 16 }]
    }, 'qc-user');

    const originalFinalRate = qc.finalRate;
    const originalTotalRebate = qc.totalRebate;

    // 2. Change the Master Rule rate drastically from Rs 300 to Rs 800
    await qualityService.updateRule(ruleMaizeMoistureId, {
      rebateRate: 800
    }, 'admin');

    // 3. Fetch original QC document -> values must not have changed!
    const fetchedQc = await qualityService.getQCById(String(qc._id));
    expect(fetchedQc.finalRate).toBe(originalFinalRate);
    expect(fetchedQc.totalRebate).toBe(originalTotalRebate);
  });

  // TEST 15: Invalid Quality Values Validation
  test('15. Should reject invalid/negative inputs for quantity and rate', async () => {
    // Negative quantity
    await expect(qualityService.createQC({
      partyType: 'supplier',
      partyId: supplierId,
      commodityId: maizeId,
      vehicleNumber: 'BR-INVALID-1',
      quantity: -10,
      baseRate: 25000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate'
    })).rejects.toThrow();

    // Negative base rate
    await expect(qualityService.createQC({
      partyType: 'supplier',
      partyId: supplierId,
      commodityId: maizeId,
      vehicleNumber: 'BR-INVALID-2',
      quantity: 10,
      baseRate: -500,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate'
    })).rejects.toThrow();
  });

  // TEST 16: Duplicate Parameter Code Prevention
  test('16. Should prevent creating duplicate quality parameter names or codes', async () => {
    await expect(qualityService.createParameter({
      name: 'Moisture',
      code: 'MOIST_DIFF',
      unit: '%'
    })).rejects.toThrow(/already exists/i);

    await expect(qualityService.createParameter({
      name: 'Different Moisture',
      code: 'MOIST',
      unit: '%'
    })).rejects.toThrow(/already exists/i);
  });

  // TEST 17: Flat Discount and Low Percentage Discount Edge Cases
  test('17. Should calculate FLAT discounts (including small ₹1/MT) without misclassifying as percentage', () => {
    // Flat discount of ₹1/MT
    const flat1 = calculateQualityRebate({
      quantity: 50,
      baseRate: 20000,
      calculationMethod: 'Discount',
      rebateType: 'Standard Rebate',
      discountRate: 1,
      discountType: 'FLAT'
    });
    expect(flat1.totalRebate).toBe(1);
    expect(flat1.finalRate).toBe(19999);
    expect(flat1.finalValue).toBe(50 * 19999);

    // Flat discount of ₹50/MT
    const flat50 = calculateQualityRebate({
      quantity: 10,
      baseRate: 20000,
      calculationMethod: 'Discount',
      rebateType: 'Standard Rebate',
      discountRate: 50,
      discountType: 'FLAT'
    });
    expect(flat50.totalRebate).toBe(50);
    expect(flat50.finalRate).toBe(19950);

    // Percent discount of 1% (discountRate = 1)
    const pct1 = calculateQualityRebate({
      quantity: 50,
      baseRate: 20000,
      calculationMethod: 'Discount',
      rebateType: 'Standard Rebate',
      discountRate: 1,
      discountType: 'PERCENT'
    });
    expect(pct1.totalRebate).toBe(200); // 1% of 20000
    expect(pct1.finalRate).toBe(19800);

    // Percent discount of 0.5% (discountRate = 0.5)
    const pctHalf = calculateQualityRebate({
      quantity: 50,
      baseRate: 20000,
      calculationMethod: 'Discount',
      rebateType: 'Standard Rebate',
      discountRate: 0.5,
      discountType: 'PERCENT'
    });
    expect(pctHalf.totalRebate).toBe(100); // 0.5% of 20000
    expect(pctHalf.finalRate).toBe(19900);
  });

  // TEST 18: Hybrid 'Both' Calculation (Pro-Rata QC Rebate + Commercial Discount)
  test('18. Should calculate Hybrid (Both) method combining QC Rebate and Commercial Discount', () => {
    const rules = [
      { parameterName: 'Moisture', standardValue: 14, tolerance: 0, rebateBasis: 'Per % Deviation', rebateRate: 300, status: 'Active' }
    ];

    const result = calculateQualityRebate({
      quantity: 100,
      baseRate: 25000,
      calculationMethod: 'Both',
      rebateType: 'Standard Rebate',
      discountRate: 2, // 2% commercial discount -> 500/MT
      discountType: 'PERCENT',
      qualityParameters: [
        { parameterName: 'Moisture', actualValue: 15 } // 1% deviation * 300 = 300/MT QC rebate
      ],
      applicableRules: rules
    });

    // Pro-rata QC Rebate = 300/MT
    // Discount = 2% of 25000 = 500/MT
    // Total Rebate = 300 + 500 = 800/MT
    // Final Rate = 25000 - 800 = 24200/MT
    // Final Value = 100 * 24200 = 2420000
    expect(result.totalRebate).toBe(800);
    expect(result.finalRate).toBe(24200);
    expect(result.baseValue).toBe(2500000);
    expect(result.totalDeduction).toBe(80000);
    expect(result.finalValue).toBe(2420000);
    expect(result.calculationBreakdown.details.length).toBe(2);
  });

  // TEST 19: Pro-Rata 'LOWER_IS_WORSE' (Protein / Oil deficit)
  test('19. Should properly calculate LOWER_IS_WORSE parameters like Protein', () => {
    const rules = [
      { parameterName: 'Protein', standardValue: 45, tolerance: 0.5, direction: 'LOWER_IS_WORSE', rebateBasis: 'Per % Deviation', rebateRate: 200, status: 'Active' }
    ];

    // Standard 45, Actual 41, Tolerance 0.5 -> Deficit 4%, Net Deficit = 3.5% -> 3.5 * 200 = 700/MT
    const result = calculateQualityRebate({
      quantity: 10,
      baseRate: 25000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Protein', actualValue: 41 }],
      applicableRules: rules
    });

    expect(result.totalRebate).toBe(700);
    expect(result.finalRate).toBe(24300);
    expect(result.finalValue).toBe(243000);
  });

  // TEST 20: Percentage of Base Rate Rebate Basis
  test('20. Should calculate Percentage of Base Rate rebate correctly', () => {
    const rules = [
      { parameterName: 'Moisture', standardValue: 14, tolerance: 0, rebateBasis: 'Percentage of Base Rate', rebateRate: 1.5, status: 'Active' }
    ];

    // Base Rate 30000, Dev 2% -> 2% * (1.5% of 30000) = 2 * 450 = 900/MT
    const result = calculateQualityRebate({
      quantity: 10,
      baseRate: 30000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Moisture', actualValue: 16 }],
      applicableRules: rules
    });

    expect(result.totalRebate).toBe(900);
    expect(result.finalRate).toBe(29100);
    expect(result.finalValue).toBe(291000);
  });

  // TEST 21: Flat Rate per MT Rebate Basis
  test('21. Should calculate Flat Rate per MT rebate correctly', () => {
    const rules = [
      { parameterName: 'Admixture', standardValue: 1, tolerance: 0, rebateBasis: 'Flat Rate per MT', rebateRate: 450, status: 'Active' }
    ];

    const result = calculateQualityRebate({
      quantity: 20,
      baseRate: 22000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Admixture', actualValue: 3 }],
      applicableRules: rules
    });

    expect(result.totalRebate).toBe(450);
    expect(result.finalRate).toBe(21550);
    expect(result.finalValue).toBe(20 * 21550);
  });

  // TEST 22: Tiered Slabs with Percentage rateType
  test('22. Should calculate Tiered Slabs with Percentage rateType', () => {
    const rules = [
      {
        parameterName: 'Moisture',
        standardValue: 14,
        tolerance: 0,
        slabs: [
          { minDeviation: 0, maxDeviation: 1, rebateRate: 0, rateType: 'Fixed Amount' },
          { minDeviation: 1.01, maxDeviation: 3, rebateRate: 2, rateType: 'Percentage' } // 2% of base rate
        ],
        status: 'Active'
      }
    ];

    const result = calculateQualityRebate({
      quantity: 10,
      baseRate: 20000,
      calculationMethod: 'Pro-Rata',
      rebateType: 'Standard Rebate',
      qualityParameters: [{ parameterName: 'Moisture', actualValue: 16 }], // Dev 2% -> matches slab [1.01-3] -> 2% of 20000 = 400
      applicableRules: rules
    });

    expect(result.totalRebate).toBe(400);
    expect(result.finalRate).toBe(19600);
  });

  // TEST 23: Clamping when total rebate exceeds base rate
  test('23. Should clamp final rate at 0 when total rebate exceeds base rate', () => {
    const result = calculateQualityRebate({
      quantity: 10,
      baseRate: 500,
      calculationMethod: 'Discount',
      rebateType: 'Standard Rebate',
      discountRate: 600,
      discountType: 'FLAT'
    });

    expect(result.totalRebate).toBe(600);
    expect(result.finalRate).toBe(0);
    expect(result.finalValue).toBe(0);
  });
});
