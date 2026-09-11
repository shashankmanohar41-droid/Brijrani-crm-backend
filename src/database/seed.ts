import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// Load Env variables
dotenv.config();

import { Role } from '../modules/roles/model';
import { User } from '../modules/users/model';
import { Commodity } from '../modules/commodities/model';
import { Warehouse, Bin } from '../modules/warehouse/model';
import { Customer } from '../modules/customers/model';
import { Supplier } from '../modules/suppliers/model';
import { Farmer } from '../modules/farmers/model';
import { Vehicle, Driver } from '../modules/logistics/model';
import { CrmAutomationRule } from '../modules/crm/model';
import { PurchaseOrder, PurchaseEnquiry, PurchaseQuotation } from '../modules/procurement/model';
import { SalesInvoice, SalesOrder } from '../modules/sales/model';
import { Voucher } from '../modules/finance/model';
import { QualityParameter, QualityRebateRule, QualityControl } from '../modules/quality/model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://shashankmanohar1734_db_user:hpIe3ev8T1QsKZMM@cluster0.ws2kdbz.mongodb.net/brijrani_erp?retryWrites=true&w=majority';

const seedDatabase = async () => {
  try {
    console.log('[SEED] Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('[SEED] Connected. Cleaning collections...');

    // Clear existing collections
    await Role.deleteMany({});
    await User.deleteMany({});
    await Commodity.deleteMany({});
    await Warehouse.deleteMany({});
    await Bin.deleteMany({});
    await Customer.deleteMany({});
    await Supplier.deleteMany({});
    await Farmer.deleteMany({});
    await Vehicle.deleteMany({});
    await Driver.deleteMany({});
    await CrmAutomationRule.deleteMany({});
    await PurchaseEnquiry.deleteMany({});
    await PurchaseQuotation.deleteMany({});
    await PurchaseOrder.deleteMany({});
    await SalesOrder.deleteMany({});
    await SalesInvoice.deleteMany({});
    await Voucher.deleteMany({});
    await QualityParameter.deleteMany({});
    await QualityRebateRule.deleteMany({});
    await QualityControl.deleteMany({});

    console.log('[SEED] Seeding Roles & Permissions...');
    const allPermissions = [
      'auth.manage',
      'masters.manage',
      'procurement.read', 'procurement.create', 'procurement.approve', 'procurement.cancel',
      'sales.read', 'sales.create', 'sales.approve', 'sales.cancel',
      'warehouse.read', 'warehouse.inward', 'warehouse.transfer', 'warehouse.adjust',
      'logistics.read', 'logistics.dispatch', 'logistics.pod',
      'crm.read', 'crm.leads', 'crm.automation',
      'finance.read', 'finance.voucher', 'finance.ledger', 'finance.aging'
    ];

    const adminRole = new Role({
      name: 'Super Admin',
      description: 'Super Administrator with access to all modules.',
      permissions: allPermissions
    });
    await adminRole.save();

    const buyerRole = new Role({
      name: 'Purchase Manager',
      description: 'Manager of procurement and QC.',
      permissions: ['procurement.read', 'procurement.create', 'procurement.approve', 'masters.manage']
    });
    await buyerRole.save();

    const whRole = new Role({
      name: 'Warehouse Manager',
      description: 'Manager of silo space and picking.',
      permissions: ['warehouse.read', 'warehouse.inward', 'warehouse.transfer', 'logistics.read', 'logistics.pod']
    });
    await whRole.save();

    const acctRole = new Role({
      name: 'Accountant',
      description: 'Reconciles books and payables.',
      permissions: ['finance.read', 'finance.voucher', 'finance.ledger', 'finance.aging']
    });
    await acctRole.save();

    console.log('[SEED] Seeding User Accounts...');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@brijrani.com',
      passwordHash,
      role: 'Super Admin',
      status: 'Active',
      companyId: 'company-001',
      branchId: 'branch-001',
      isVerified: true
    });
    await adminUser.save();

    const pmUser = new User({
      name: 'Deepak Kumar',
      email: 'deepak@brijrani.com',
      passwordHash,
      role: 'Purchase Manager',
      status: 'Active',
      companyId: 'company-001',
      branchId: 'branch-001',
      isVerified: true
    });
    await pmUser.save();

    const whUser = new User({
      name: 'Raman Singh',
      email: 'raman@brijrani.com',
      passwordHash,
      role: 'Warehouse Staff',
      status: 'Active',
      companyId: 'company-001',
      branchId: 'branch-001',
      isVerified: true
    });
    await whUser.save();

    const acctUser = new User({
      name: 'Sanjay Verma',
      email: 'sanjay@brijrani.com',
      passwordHash,
      role: 'Accountant',
      status: 'Active',
      companyId: 'company-001',
      branchId: 'branch-001',
      isVerified: true
    });
    await acctUser.save();

    console.log('[SEED] Seeding Commodities (Wheat, Paddy, Mustard)...');
    const wheat = new Commodity({
      commodityCode: 'CMD-001',
      name: 'Wheat (Gehun)',
      category: 'Grains',
      unit: 'MT',
      hsn: '10019910',
      gstRate: 5,
      purchasePrice: 22000,
      sellingPrice: 24500,
      minimumStock: 20,
      maximumStock: 1000,
      batchTracking: true,
      qualityParameters: [
        { name: 'Moisture Percent', minLimit: 9, maxLimit: 12.5 },
        { name: 'Foreign Material Percent', minLimit: 0, maxLimit: 1.5 }
      ]
    });
    await wheat.save();

    const paddy = new Commodity({
      commodityCode: 'CMD-002',
      name: 'Paddy (Dhan)',
      category: 'Grains',
      unit: 'MT',
      hsn: '10061010',
      gstRate: 5,
      purchasePrice: 19500,
      sellingPrice: 21800,
      minimumStock: 30,
      maximumStock: 1500,
      batchTracking: true
    });
    await paddy.save();

    const mustard = new Commodity({
      commodityCode: 'CMD-003',
      name: 'Mustard Seeds (Sarso)',
      category: 'Oilseeds',
      unit: 'MT',
      hsn: '12075000',
      gstRate: 5,
      purchasePrice: 52000,
      sellingPrice: 56500,
      minimumStock: 10,
      maximumStock: 500,
      batchTracking: true
    });
    await mustard.save();

    const maize = new Commodity({
      commodityCode: 'CMD-004',
      name: 'Maize (Makka / Corn)',
      category: 'Grains',
      unit: 'MT',
      hsn: '10059000',
      gstRate: 5,
      purchasePrice: 21500,
      sellingPrice: 23800,
      minimumStock: 25,
      maximumStock: 1200,
      batchTracking: true
    });
    await maize.save();

    const soybean = new Commodity({
      commodityCode: 'CMD-005',
      name: 'Soybean (Yellow)',
      category: 'Oilseeds',
      unit: 'MT',
      hsn: '12019000',
      gstRate: 5,
      purchasePrice: 46000,
      sellingPrice: 49500,
      minimumStock: 15,
      maximumStock: 800,
      batchTracking: true
    });
    await soybean.save();

    console.log('[SEED] Seeding Warehouses & Silo Bins...');
    const whPatna = new Warehouse({
      name: 'Patna Central Silos',
      location: 'Didarganj Industrial Area, Patna Bypass Road',
      capacityMT: 1000
    });
    await whPatna.save();

    const whBihta = new Warehouse({
      name: 'Bihta Grain Terminal',
      location: 'Bihta Dry Port Highway, Patna Rural',
      capacityMT: 800
    });
    await whBihta.save();

    // Silo Bins
    const bin1 = new Bin({
      warehouseId: whPatna._id,
      binCode: 'BIN-PA-S01',
      name: 'Patna Silo 1 - Wheat Exclusive',
      allowedCommodityId: wheat._id,
      capacityMT: 200,
      occupiedMT: 0,
      availableMT: 200
    });
    await bin1.save();

    const bin2 = new Bin({
      warehouseId: whPatna._id,
      binCode: 'BIN-PA-S02',
      name: 'Patna Silo 2 - Paddy Storage',
      allowedCommodityId: paddy._id,
      capacityMT: 300,
      occupiedMT: 0,
      availableMT: 300
    });
    await bin2.save();

    console.log('[SEED] Seeding Partners (Customers, Suppliers, Farmers)...');
    const cust1 = new Customer({
      customerCode: 'CUS-1001',
      name: 'Bihar Roller Flour Mills',
      companyName: 'Roller Grain Processing Group',
      gstin: '10AAACR0912K1Z8',
      phone: '+91 9988776655',
      email: 'procurement@biharflour.com',
      billingAddress: 'Fatuha Industrial Estate, Patna, Bihar, 803201',
      shippingAddress: 'Fatuha Industrial Estate, Patna, Bihar, 803201',
      creditLimit: 5000000,
      paymentTerms: 'Net 30',
      openingBalance: 0,
      balance: 0
    });
    await cust1.save();

    const sup1 = new Supplier({
      supplierCode: 'SUP-2001',
      name: 'Chhapra Grain Sourcing Agency',
      companyName: 'Chhapra Agricultural Wholesale',
      gstin: '10AAACS8931M2Z1',
      phone: '+91 9988112233',
      email: 'sourcing@chhapragrain.com',
      billingAddress: 'Mandi Road, Chhapra, Saran, Bihar',
      shippingAddress: 'Mandi Road, Chhapra, Saran, Bihar',
      paymentTerms: 'Net 15',
      openingBalance: 0,
      balance: 0
    });
    await sup1.save();

    const farmer1 = new Farmer({
      farmerCode: 'FRM-3001',
      name: 'Ramesh Singh (Mokama)',
      phone: '+91 9431020304',
      village: 'Mokama Diara',
      district: 'Patna',
      state: 'Bihar',
      farmSizeAcres: 12,
      soilType: 'Alluvial Clay',
      bankName: 'State Bank of India',
      bankAccountNo: '30489201932',
      bankIfsc: 'SBIN0001053',
      openingBalance: 0,
      balance: 0
    });
    await farmer1.save();

    console.log('[SEED] Seeding Logistics Fleet...');
    const truck1 = new Vehicle({
      registrationNo: 'BR-01-GB-1234',
      type: 'Tata 1613 Multi-axle Truck',
      capacityMT: 16,
      owner: 'Mithila Transports'
    });
    await truck1.save();

    const driver1 = new Driver({
      name: 'Satish Yadav',
      phone: '+91 8877665544',
      licenseNo: 'DL-10202611989'
    });
    await driver1.save();

    console.log('[SEED] Seeding Custom CRM Automation Rules...');
    const rule1 = new CrmAutomationRule({
      name: 'Quotation Follow-up Rule',
      trigger: 'quotation_sent',
      conditions: {
        total: { $gt: 500000 }
      },
      actions: [
        {
          type: 'create_task',
          details: {
            taskType: 'Call',
            notes: 'Quotation sent over 2 days ago. Follow up with client regarding price approvals.',
            daysOffset: 2,
            priority: 'High'
          }
        }
      ],
      isActive: true
    });
    await rule1.save();

    const rule2 = new CrmAutomationRule({
      name: 'High-Value Invoice Alert Rule',
      trigger: 'quotation_created',
      conditions: {
        total: { $gt: 1000000 }
      },
      actions: [
        {
          type: 'notify_manager',
          details: {
            notes: 'High-value quotation created. Super Admin approval requested.'
          }
        }
      ],
      isActive: true
    });
    await rule2.save();

    console.log('[SEED] Seeding Transactional Data (Purchase Orders, Sales Invoices, Vouchers)...');

    // Seed a Purchase Enquiry
    const pe1 = new PurchaseEnquiry({
      enquiryNo: 'PE-2026-0001',
      date: new Date('2026-08-01'),
      requiredByDate: new Date('2026-08-10'),
      department: 'Production',
      requestedBy: 'Rahul (Production Head)',
      priority: 'Medium',
      warehouseId: whPatna._id,
      purpose: 'Bulk sourcing test',
      status: 'RFQ Created',
      createdBy: 'admin@brijrani.com',
      items: [{
        item: wheat._id,
        description: 'Sonalika Wheat Seeds',
        sku: 'CMD-001',
        quantity: 100,
        unit: 'MT',
        estimatedRate: 22000,
        estimatedAmount: 2200000,
        requiredDate: new Date('2026-08-15'),
        remarks: 'Direct sourcing requirement'
      }]
    });
    await pe1.save();

    // Seed a Purchase Quotation Under Negotiation
    const pq1 = new PurchaseQuotation({
      quotationNo: 'PQ/BR/2026-27/001',
      enquiryNo: 'PE-2026-0001',
      date: new Date('2026-08-01'),
      partyType: 'supplier',
      partyId: sup1._id,
      validUntil: new Date('2026-08-28'),
      paymentTerms: '30 Day',
      deliveryDays: 5,
      freight: 0,
      discount: 0,
      tax: 0,
      grandTotal: 0,
      status: 'Under Negotiation',
      createdBy: 'admin@brijrani.com',
      items: [{
        item: wheat._id,
        description: 'Sonalika Wheat Seeds',
        sku: 'CMD-001',
        quantity: 100,
        unit: 'MT',
        rate: 23000,
        discount: 0,
        taxPercent: 5,
        taxAmount: 115000,
        lineTotal: 2415000,
        deliveryDate: new Date('2026-08-15')
      }]
    });
    await pq1.save();

    // Seed a Purchase Quotation Converted
    const pq2 = new PurchaseQuotation({
      quotationNo: 'PQ/BR/2026-27/002',
      enquiryNo: 'PE-2026-0001',
      date: new Date('2026-08-01'),
      partyType: 'supplier',
      partyId: sup1._id,
      validUntil: new Date('2026-08-30'),
      paymentTerms: 'Standard Net 30',
      deliveryDays: 5,
      freight: 15000,
      discount: 0,
      tax: 110000,
      grandTotal: 2330000,
      status: 'Converted',
      createdBy: 'admin@brijrani.com',
      items: [{
        item: wheat._id,
        description: 'Sonalika Wheat Seeds',
        sku: 'CMD-001',
        quantity: 100,
        unit: 'MT',
        rate: 22000,
        discount: 0,
        taxPercent: 5,
        taxAmount: 110000,
        lineTotal: 2310000,
        deliveryDate: new Date('2026-08-15')
      }]
    });
    await pq2.save();

    // Seed a Purchase Order
    const po1 = new PurchaseOrder({
      poNo: 'PO/BR/2026-27/001',
      date: new Date('2026-08-02'),
      partyType: 'supplier',
      partyId: sup1._id,
      buyer: 'Admin User',
      department: 'Purchase',
      expectedDelivery: new Date('2026-08-15'),
      freight: 15000,
      otherCharges: 5000,
      discount: 0,
      tax: 110000,
      total: 2330000, // (100 * 22000) + 15000 + 5000 + 110000 = 2330000
      warehouseId: whPatna._id,
      status: 'Approved',
      createdBy: 'admin@brijrani.com',
      items: [{
        item: wheat._id,
        description: 'Sonalika Wheat Seeds',
        sku: 'CMD-001',
        quantity: 100,
        unit: 'MT',
        rate: 22000,
        discount: 0,
        taxPercent: 5,
        taxAmount: 110000,
        amount: 2200000,
        expectedDelivery: new Date('2026-08-15')
      }]
    });
    await po1.save();

    // Seed a Sales Order first
    const so1 = new SalesOrder({
      soNo: 'SO/BR/2026-27/001',
      date: new Date('2026-08-03'),
      customerId: cust1._id,
      commodityId: wheat._id,
      quantity: 20,
      rate: 27500,
      total: 550000,
      warehouseId: whPatna._id,
      deliveryAddress: 'Fatuha Industrial Estate, Patna, Bihar, 803201',
      status: 'Completed',
      createdBy: 'admin@brijrani.com'
    });
    await so1.save();

    // Seed a Sales Invoice
    const inv1 = new SalesInvoice({
      invoiceNo: 'INV/BR/2026-27/001',
      soId: so1._id,
      invoiceDate: new Date('2026-08-04'),
      customerId: cust1._id,
      gstin: '10AAACR0912K1Z8',
      billingAddress: 'Fatuha Industrial Estate, Patna, Bihar, 803201',
      shippingAddress: 'Fatuha Industrial Estate, Patna, Bihar, 803201',
      items: [
        {
          commodityId: wheat._id,
          hsn: '10019910',
          quantity: 20,
          rate: 27500,
          discount: 0,
          taxableAmount: 550000,
          cgst: 13750,
          sgst: 13750,
          igst: 0,
          total: 577500
        }
      ],
      taxableAmount: 550000,
      cgst: 13750,
      sgst: 13750,
      igst: 0,
      freightCost: 0,
      otherCharges: 0,
      grandTotal: 577500,
      dueDate: new Date('2026-09-04'),
      placeOfSupply: 'Bihar',
      paymentStatus: 'Paid',
      createdBy: 'admin@brijrani.com'
    });
    await inv1.save();

    // Seed Vouchers (Expenses)
    const v1 = new Voucher({
      voucherNumber: 'EXP/2026-27/001',
      date: new Date('2026-08-05'),
      voucherType: 'Expense',
      partyType: 'other',
      amount: 45000,
      paymentMode: 'Bank Transfer',
      reference: 'TXN-8293029',
      narration: 'Monthly rental for grain silo structures',
      status: 'Approved',
      createdBy: 'admin@brijrani.com'
    });
    await v1.save();

    const v2 = new Voucher({
      voucherNumber: 'EXP/2026-27/002',
      date: new Date('2026-08-08'),
      voucherType: 'Expense',
      partyType: 'other',
      amount: 18500,
      paymentMode: 'Cash',
      reference: 'CASH-9921',
      narration: 'Wages for truck loading and unloading helpers',
      status: 'Approved',
      createdBy: 'admin@brijrani.com'
    });
    await v2.save();

    console.log('[SEED] Seeding Quality Parameters...');
    const qpMoisture = await new QualityParameter({
      name: 'Moisture',
      code: 'MOIST',
      unit: '%',
      description: 'Moisture content percentage in agricultural grain',
      status: 'Active',
      standardValue: 14,
      minLimit: 8,
      maxLimit: 18,
      createdBy: 'Super Admin'
    }).save();

    const qpProtein = await new QualityParameter({
      name: 'Protein',
      code: 'PROT',
      unit: '%',
      description: 'Crude protein content percentage',
      status: 'Active',
      standardValue: 45,
      minLimit: 38,
      maxLimit: 52,
      createdBy: 'Super Admin'
    }).save();

    const qpOil = await new QualityParameter({
      name: 'Oil Content',
      code: 'OIL',
      unit: '%',
      description: 'Oil percentage for oilseed commodities',
      status: 'Active',
      standardValue: 40,
      minLimit: 32,
      maxLimit: 48,
      createdBy: 'Super Admin'
    }).save();

    const qpForeignMatter = await new QualityParameter({
      name: 'Foreign Matter',
      code: 'FM',
      unit: '%',
      description: 'Inorganic & organic matter foreign to commodity',
      status: 'Active',
      standardValue: 1.5,
      minLimit: 0,
      maxLimit: 5,
      createdBy: 'Super Admin'
    }).save();

    const qpBroken = await new QualityParameter({
      name: 'Broken Grain',
      code: 'BRK',
      unit: '%',
      description: 'Percentage of broken and split kernels',
      status: 'Active',
      standardValue: 3,
      minLimit: 0,
      maxLimit: 10,
      createdBy: 'Super Admin'
    }).save();

    const qpAdmixture = await new QualityParameter({
      name: 'Admixture',
      code: 'ADMIX',
      unit: '%',
      description: 'Admixture of other grain varieties',
      status: 'Active',
      standardValue: 2,
      minLimit: 0,
      maxLimit: 8,
      createdBy: 'Super Admin'
    }).save();

    const qpDamaged = await new QualityParameter({
      name: 'Damaged Grain',
      code: 'DMG',
      unit: '%',
      description: 'Kernels damaged by insect, heat, or fungus',
      status: 'Active',
      standardValue: 2,
      minLimit: 0,
      maxLimit: 6,
      createdBy: 'Super Admin'
    }).save();

    console.log('[SEED] Seeding Quality Rebate Master Rules...');
    // Rule 1: Maize - Moisture (Pro-Rata with tiered slabs & tolerance)
    const ruleMaizeMoist = await new QualityRebateRule({
      ruleCode: 'QRR-MAIZE-MOIST-01',
      commodityId: maize._id,
      commodityName: 'Maize (Makka / Corn)',
      parameterId: qpMoisture._id,
      parameterName: 'Moisture',
      unit: '%',
      standardValue: 14,
      minValue: 10,
      maxValue: 20,
      tolerance: 1, // 1% tolerance buffer
      rebateType: 'Standard Rebate',
      calculationMethod: 'Pro-Rata',
      rebateBasis: 'Tiered Slabs',
      rebateRate: 300,
      slabs: [
        { minDeviation: 0, maxDeviation: 1, rebateRate: 0, rateType: 'Fixed Amount', description: '0–1% Deviation -> No Rebate (Within Tolerance)' },
        { minDeviation: 1.01, maxDeviation: 2, rebateRate: 200, rateType: 'Per Unit Deviation', description: '1–2% Deviation -> ₹200/MT per 1% net deviation' },
        { minDeviation: 2.01, maxDeviation: 3, rebateRate: 300, rateType: 'Per Unit Deviation', description: '2–3% Deviation -> ₹300/MT per 1% net deviation' },
        { minDeviation: 3.01, maxDeviation: 6, rebateRate: 450, rateType: 'Per Unit Deviation', description: '3–6% Deviation -> ₹450/MT per 1% net deviation' }
      ],
      direction: 'HIGHER_IS_WORSE',
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: undefined,
      status: 'Active',
      notes: 'Standard Maize Quality Rebate Schedule for Kharif & Rabi seasons',
      createdBy: 'Super Admin'
    }).save();

    // Rule 2: Maize - Protein (Lower is worse)
    const ruleMaizeProtein = await new QualityRebateRule({
      ruleCode: 'QRR-MAIZE-PROT-01',
      commodityId: maize._id,
      commodityName: 'Maize (Makka / Corn)',
      parameterId: qpProtein._id,
      parameterName: 'Protein',
      unit: '%',
      standardValue: 45,
      minValue: 35,
      maxValue: 55,
      tolerance: 0.5,
      rebateType: 'Double Rebate',
      calculationMethod: 'Pro-Rata',
      rebateBasis: 'Per % Deviation',
      rebateRate: 200, // ₹200 per 1% deficit
      slabs: [],
      direction: 'LOWER_IS_WORSE',
      effectiveFrom: new Date('2026-01-01'),
      status: 'Active',
      notes: 'Feed Grade Protein Benchmark Rule',
      createdBy: 'Super Admin'
    }).save();

    // Rule 3: Wheat - Moisture
    const ruleWheatMoist = await new QualityRebateRule({
      ruleCode: 'QRR-WHEAT-MOIST-01',
      commodityId: wheat._id,
      commodityName: 'Wheat (Gehun)',
      parameterId: qpMoisture._id,
      parameterName: 'Moisture',
      unit: '%',
      standardValue: 12,
      minValue: 9,
      maxValue: 16,
      tolerance: 0.5,
      rebateType: 'Standard Rebate',
      calculationMethod: 'Pro-Rata',
      rebateBasis: 'Per % Deviation',
      rebateRate: 250,
      slabs: [],
      direction: 'HIGHER_IS_WORSE',
      effectiveFrom: new Date('2026-01-01'),
      status: 'Active',
      notes: 'Milling Wheat standard procurement rebate schedule',
      createdBy: 'Super Admin'
    }).save();

    // Rule 4: Soybean - Oil Content
    const ruleSoyOil = await new QualityRebateRule({
      ruleCode: 'QRR-SOY-OIL-01',
      commodityId: soybean._id,
      commodityName: 'Soybean (Yellow)',
      parameterId: qpOil._id,
      parameterName: 'Oil Content',
      unit: '%',
      standardValue: 18,
      minValue: 14,
      maxValue: 24,
      tolerance: 0.5,
      rebateType: 'Single Rebate',
      calculationMethod: 'Pro-Rata',
      rebateBasis: 'Percentage of Base Rate',
      rebateRate: 1.5, // 1.5% of base rate per 1% deficit
      slabs: [],
      direction: 'LOWER_IS_WORSE',
      effectiveFrom: new Date('2026-01-01'),
      status: 'Active',
      notes: 'Oil processing grade benchmark rule',
      createdBy: 'Super Admin'
    }).save();

    console.log('[SEED] Seeding Sample Quality Control Records...');
    // Seed QC 1: Maize with Double Rebate (Moisture 16% + Protein 43%)
    const qc1 = new QualityControl({
      qcNumber: 'QC-202609-0001',
      partyType: 'farmer',
      partyId: farmer1._id,
      partyName: farmer1.name,
      commodityId: maize._id,
      commodityName: 'Maize (Makka / Corn)',
      vehicleNumber: 'BR-01-GB-4590',
      quantity: 100, // 100 MT
      unit: 'MT',
      baseRate: 25000, // ₹25,000/MT
      date: new Date('2026-09-08'),
      referenceNumber: 'PO-2026-001',
      rebateType: 'Double Rebate',
      calculationMethod: 'Pro-Rata',
      discountRate: 0,
      discountAmount: 0,
      qualityParameters: [
        {
          parameterName: 'Moisture',
          unit: '%',
          standardValue: 14,
          actualValue: 16,
          deviation: 2,
          tolerance: 1,
          applicableRuleId: ruleMaizeMoist._id,
          ruleCode: 'QRR-MAIZE-MOIST-01',
          rebateBasis: 'Tiered Slabs',
          rebateRate: 200,
          rebatePerUnit: 200,
          rebateTotal: 20000,
          formulaDescription: 'Deviation (2.00%) matches Slab [1.01-2%]: Net Dev (1.00%) × ₹200 = ₹200/MT',
          status: 'WARN'
        },
        {
          parameterName: 'Protein',
          unit: '%',
          standardValue: 45,
          actualValue: 43,
          deviation: 2,
          tolerance: 0.5,
          applicableRuleId: ruleMaizeProtein._id,
          ruleCode: 'QRR-MAIZE-PROT-01',
          rebateBasis: 'Per % Deviation',
          rebateRate: 200,
          rebatePerUnit: 300,
          rebateTotal: 30000,
          formulaDescription: 'Net Dev (1.50%) × ₹200/unit = ₹300/MT',
          status: 'WARN'
        }
      ],
      totalRebate: 500, // ₹500/MT
      totalDeduction: 50000, // ₹50,000
      baseValue: 2500000, // ₹25,00,000
      finalRate: 24500, // ₹24,500/MT
      finalValue: 2450000, // ₹24,50,000
      calculationBreakdown: {
        method: 'Pro-Rata',
        rebateType: 'Double Rebate',
        baseRate: 25000,
        quantity: 100,
        totalRebatePerUnit: 500,
        totalDeduction: 50000,
        finalRate: 24500,
        finalValue: 2450000,
        summaryText: 'Pro-Rata (Double Rebate): Base Rate ₹25,000 - Total Quality Rebate ₹500 = Final Rate ₹24,500/unit. Total Final Value = ₹24,50,000',
        details: [
          'Moisture: Standard 14%, Actual 16%, Deviation 2.00% (Tol: 1%). Rebate: ₹200/unit (Total: ₹20000)',
          'Protein: Standard 45%, Actual 43%, Deviation 2.00% (Tol: 0.5%). Rebate: ₹300/unit (Total: ₹30000)'
        ]
      },
      status: 'Approved',
      inspector: 'Amit Sharma (QC Head)',
      approvedBy: 'Prakash Chandra',
      approvedAt: new Date('2026-09-08T16:30:00Z'),
      createdBy: 'admin@brijrani.com',
      auditTrail: [
        { action: 'Created', user: 'admin@brijrani.com', timestamp: new Date('2026-09-08T10:00:00Z'), reason: 'Initial QC entry' },
        { action: 'Submitted', user: 'admin@brijrani.com', timestamp: new Date('2026-09-08T11:00:00Z'), reason: 'Submitted for managerial verification' },
        { action: 'Approved', user: 'Prakash Chandra', timestamp: new Date('2026-09-08T16:30:00Z'), reason: 'QC verified with dual-parameter rebate deduction' }
      ]
    });
    await qc1.save();

    // Seed QC 2: Wheat with Discount method (Draft)
    const qc2 = new QualityControl({
      qcNumber: 'QC-202609-0002',
      partyType: 'supplier',
      partyId: sup1._id,
      partyName: sup1.name,
      commodityId: wheat._id,
      commodityName: 'Wheat (Gehun)',
      vehicleNumber: 'BR-01-AX-9921',
      quantity: 50,
      unit: 'MT',
      baseRate: 22000,
      date: new Date('2026-09-09'),
      referenceNumber: 'GRN-2026-042',
      rebateType: 'Single Rebate',
      calculationMethod: 'Discount',
      discountRate: 0.02, // 2%
      discountAmount: 440,
      qualityParameters: [],
      totalRebate: 440,
      totalDeduction: 22000,
      baseValue: 1100000,
      finalRate: 21560,
      finalValue: 1078000,
      calculationBreakdown: {
        method: 'Discount',
        rebateType: 'Single Rebate',
        baseRate: 22000,
        quantity: 50,
        totalRebatePerUnit: 440,
        totalDeduction: 22000,
        finalRate: 21560,
        finalValue: 1078000,
        summaryText: 'Discount calculation applied: Base Rate ₹22,000 - Discount ₹440 = Final Rate ₹21,560. Total Final Value = ₹10,78,000',
        details: ['Discount Amount = Base Rate (₹22,000) × Discount Rate (2.00%) = ₹440/unit']
      },
      status: 'Draft',
      inspector: 'QC Analyst',
      createdBy: 'admin@brijrani.com',
      auditTrail: [
        { action: 'Created', user: 'admin@brijrani.com', timestamp: new Date('2026-09-09T09:15:00Z'), reason: 'Initial QC Draft' }
      ]
    });
    await qc2.save();

    console.log('[SEED] Seeding successful! Disconnecting database...');
    await mongoose.disconnect();
    console.log('[SEED] Seeding complete.');
  } catch (err) {
    console.error('[SEED] Seeding Critical Failure:', err);
    process.exit(1);
  }
};

seedDatabase();
