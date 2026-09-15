import { Customer, ICustomer } from '../customers/model';
import { Supplier, ISupplier } from '../suppliers/model';
import { Farmer, IFarmer } from '../farmers/model';
import { Commodity, ICommodity } from '../commodities/model';
import { Warehouse, Bin, IWarehouse, IBin } from '../warehouse/model';
import { Vehicle, Driver, DeliveryChallan, EWayBill, ProofOfDelivery, IVehicle, IDriver } from '../logistics/model';
import { Role, IRole } from '../roles/model';
import { PurchaseEnquiry, PurchaseQuotation, PurchaseOrder, GRN, QualityInspection, PurchaseInvoice } from '../procurement/model';
import { SalesEnquiry, SalesQuotation, SalesOrder, PickingTask, PackingSlip, SalesInvoice } from '../sales/model';
import { StockLedgerEntry, StockReservation } from '../inventory/model';
import { Voucher, LedgerEntry } from '../finance/model';
import { Lead, Opportunity, Activity, FollowUp, CrmAutomationRule } from '../crm/model';
import { AuditLog } from '../audit/model';
import { MarketPrice, PriceAlert } from '../marketPrices/model';
import { QualityParameter, QualityRebateRule } from '../quality/model';
import { Settings } from '../settings/model';
import { CustomError } from '../../middlewares/errorHandler';
import mongoose from 'mongoose';

export const mastersService = {
  // --- ROLES & PERMISSIONS ---
  createRole: async (data: any): Promise<IRole> => {
    const existing = await Role.findOne({ name: data.name });
    if (existing) throw new CustomError(`Role ${data.name} already exists`, 400);

    const role = new Role({
      name: data.name,
      description: data.description,
      permissions: data.permissions || []
    });
    return await role.save();
  },

  listRoles: async (): Promise<IRole[]> => {
    return await Role.find({});
  },

  // --- CUSTOMERS ---
  createCustomer: async (data: any): Promise<ICustomer> => {
    const existing = await Customer.findOne({ name: data.name });
    if (existing) throw new CustomError(`Customer name "${data.name}" already registered`, 400);

    const code = `CUS-${Date.now().toString().slice(-6)}`;
    const customer = new Customer({
      customerCode: code,
      name: data.name,
      companyName: data.companyName,
      gstin: data.gstin,
      pan: data.pan,
      phone: data.phone,
      email: data.email,
      billingAddress: data.billingAddress,
      shippingAddress: data.shippingAddress,
      creditLimit: data.creditLimit || 0,
      paymentTerms: data.paymentTerms || 'Net 30',
      openingBalance: data.openingBalance || 0,
      balance: data.openingBalance || 0
    });
    return await customer.save();
  },

  listCustomers: async (search?: string): Promise<ICustomer[]> => {
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    return await Customer.find(query);
  },

  // --- SUPPLIERS ---
  createSupplier: async (data: any): Promise<ISupplier> => {
    const existing = await Supplier.findOne({ name: data.name });
    if (existing) throw new CustomError(`Supplier name "${data.name}" already registered`, 400);

    const code = `SUP-${Date.now().toString().slice(-6)}`;
    const supplier = new Supplier({
      supplierCode: code,
      name: data.name,
      companyName: data.companyName,
      gstin: data.gstin,
      pan: data.pan,
      phone: data.phone,
      email: data.email,
      billingAddress: data.billingAddress,
      shippingAddress: data.shippingAddress,
      paymentTerms: data.paymentTerms || 'Net 30',
      openingBalance: data.openingBalance || 0,
      balance: data.openingBalance || 0
    });
    return await supplier.save();
  },

  listSuppliers: async (search?: string): Promise<ISupplier[]> => {
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    return await Supplier.find(query);
  },

  // --- FARMERS ---
  createFarmer: async (data: any): Promise<IFarmer> => {
    const existing = await Farmer.findOne({ name: data.name });
    if (existing) throw new CustomError(`Farmer name "${data.name}" already registered`, 400);

    const code = `FRM-${Date.now().toString().slice(-6)}`;
    const farmer = new Farmer({
      farmerCode: code,
      name: data.name,
      phone: data.phone,
      email: data.email,
      village: data.village,
      district: data.district,
      state: data.state || 'Bihar',
      farmSizeAcres: data.farmSizeAcres,
      soilType: data.soilType,
      bankName: data.bankName,
      bankAccountNo: data.bankAccountNo,
      bankIfsc: data.bankIfsc,
      openingBalance: data.openingBalance || 0,
      balance: data.openingBalance || 0
    });
    return await farmer.save();
  },

  listFarmers: async (search?: string): Promise<IFarmer[]> => {
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    return await Farmer.find(query);
  },

  // --- COMMODITIES ---
  createCommodity: async (data: any): Promise<ICommodity> => {
    const existing = await Commodity.findOne({ name: data.name });
    if (existing) throw new CustomError(`Commodity "${data.name}" already exists`, 400);

    const code = data.commodityCode || data.sku || `CMD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const commodity = new Commodity({
      commodityCode: code,
      name: data.name,
      category: data.category || 'Grains',
      unit: data.unit || 'MT',
      hsn: data.hsn || '1001',
      gstRate: data.gstRate !== undefined ? Number(data.gstRate) : 5,
      purchasePrice: data.purchasePrice || 0,
      sellingPrice: data.sellingPrice || 0,
      minimumStock: data.minimumStock || 10,
      maximumStock: data.maximumStock || 10000,
      batchTracking: data.batchTracking !== false,
      qualityParameters: data.qualityParameters || []
    });
    const saved = await commodity.save();

    // If qualityRebateRules were supplied, persist/sync them
    if (Array.isArray(data.qualityRebateRules) && data.qualityRebateRules.length > 0) {
      for (const rule of data.qualityRebateRules) {
        try {
          const ruleCode = rule.ruleCode || `QRR-${(saved.name || 'COMM').slice(0, 4).toUpperCase()}-${(rule.parameterName || 'PARAM').slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-3)}`;
          await QualityRebateRule.create({
            ruleCode,
            commodityId: saved._id,
            commodityName: saved.name,
            parameterName: rule.parameterName,
            unit: rule.unit || '%',
            standardValue: Number(rule.standardValue ?? 0),
            minValue: rule.minValue !== undefined && rule.minValue !== '' ? Number(rule.minValue) : undefined,
            maxValue: rule.maxValue !== undefined && rule.maxValue !== '' ? Number(rule.maxValue) : undefined,
            tolerance: Number(rule.tolerance || 0),
            rebateType: rule.rebateType || 'Standard Rebate',
            calculationMethod: rule.calculationMethod || 'Pro-Rata',
            rebateBasis: rule.rebateBasis || 'Tiered Slabs',
            rebateRate: Number(rule.rebateRate || 0),
            slabs: rule.slabs || [],
            direction: rule.direction || 'HIGHER_IS_WORSE',
            effectiveFrom: rule.effectiveFrom ? new Date(rule.effectiveFrom) : new Date(),
            effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : undefined,
            status: rule.status || 'Active',
            notes: rule.notes || `Created with commodity ${saved.name}`
          });
        } catch (err) {
          console.warn(`[createCommodity] Failed to create rule ${rule.parameterName}:`, err);
        }
      }
    }

    return saved;
  },

  updateCommodity: async (id: string, data: any): Promise<ICommodity> => {
    const commodity = await Commodity.findById(id);
    if (!commodity) throw new CustomError('Commodity not found', 404);

    if (data.name && data.name !== commodity.name) {
      const existing = await Commodity.findOne({ name: data.name, _id: { $ne: id } });
      if (existing) throw new CustomError(`Commodity "${data.name}" already exists`, 400);
      commodity.name = data.name;
    }
    if (data.category) commodity.category = data.category;
    if (data.unit) commodity.unit = data.unit;
    if (data.hsn) commodity.hsn = data.hsn;
    if (data.gstRate !== undefined) commodity.gstRate = Number(data.gstRate);
    if (data.purchasePrice !== undefined) commodity.purchasePrice = Number(data.purchasePrice);
    if (data.sellingPrice !== undefined) commodity.sellingPrice = Number(data.sellingPrice);
    if (data.minimumStock !== undefined) commodity.minimumStock = Number(data.minimumStock);
    if (data.maximumStock !== undefined) commodity.maximumStock = Number(data.maximumStock);
    if (data.batchTracking !== undefined) commodity.batchTracking = data.batchTracking;
    if (data.qualityParameters) commodity.qualityParameters = data.qualityParameters;

    const saved = await commodity.save();

    // If qualityRebateRules were supplied, sync them with backend QualityRebateRule collection
    if (Array.isArray(data.qualityRebateRules) && data.qualityRebateRules.length > 0) {
      for (const rule of data.qualityRebateRules) {
        try {
          const rulePayload = {
            commodityId: saved._id,
            commodityName: saved.name,
            parameterName: rule.parameterName,
            unit: rule.unit || '%',
            standardValue: Number(rule.standardValue ?? 0),
            minValue: rule.minValue !== undefined && rule.minValue !== '' ? Number(rule.minValue) : undefined,
            maxValue: rule.maxValue !== undefined && rule.maxValue !== '' ? Number(rule.maxValue) : undefined,
            tolerance: Number(rule.tolerance || 0),
            rebateType: rule.rebateType || 'Standard Rebate',
            calculationMethod: rule.calculationMethod || 'Pro-Rata',
            rebateBasis: rule.rebateBasis || 'Tiered Slabs',
            rebateRate: Number(rule.rebateRate || 0),
            slabs: rule.slabs || [],
            direction: rule.direction || 'HIGHER_IS_WORSE',
            effectiveFrom: rule.effectiveFrom ? new Date(rule.effectiveFrom) : new Date(),
            effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : undefined,
            status: rule.status || 'Active',
            notes: rule.notes || `Updated with commodity ${saved.name}`
          };

          if (rule.id || rule._id) {
            await QualityRebateRule.findByIdAndUpdate(rule.id || rule._id, rulePayload, { new: true });
          } else {
            const ruleCode = rule.ruleCode || `QRR-${(saved.name || 'COMM').slice(0, 4).toUpperCase()}-${(rule.parameterName || 'PARAM').slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-3)}`;
            await QualityRebateRule.create({ ...rulePayload, ruleCode });
          }
        } catch (err) {
          console.warn(`[updateCommodity] Failed to sync rule ${rule.parameterName}:`, err);
        }
      }
    }

    return saved;
  },

  getCommodityById: async (id: string): Promise<ICommodity | null> => {
    return await Commodity.findById(id);
  },

  listCommodities: async (): Promise<ICommodity[]> => {
    return await Commodity.find({});
  },

  // --- WAREHOUSES & BINS ---
  createWarehouse: async (data: any): Promise<IWarehouse> => {
    const warehouse = new Warehouse({
      name: data.name,
      location: data.location,
      capacityMT: data.capacityMT || 1000
    });
    return await warehouse.save();
  },

  listWarehouses: async (): Promise<IWarehouse[]> => {
    return await Warehouse.find({});
  },

  createBin: async (data: any): Promise<IBin> => {
    const wh = await Warehouse.findById(data.warehouseId);
    if (!wh) throw new CustomError('Warehouse not found', 404);

    const comm = await Commodity.findById(data.allowedCommodityId);
    if (!comm) throw new CustomError('Allowed commodity not found', 404);

    const binCode = `BIN-${wh.name.slice(0,2).toUpperCase()}-${data.binCode.toUpperCase()}`;
    const existing = await Bin.findOne({ binCode });
    if (existing) throw new CustomError(`Bin code ${binCode} already exists`, 400);

    const bin = new Bin({
      warehouseId: wh._id,
      binCode,
      name: data.name || `${wh.name} - ${data.binCode}`,
      allowedCommodityId: comm._id,
      capacityMT: data.capacityMT || 50,
      occupiedMT: 0,
      availableMT: data.capacityMT || 50,
      currentStock: []
    });
    return await bin.save();
  },

  listBins: async (warehouseId?: string): Promise<IBin[]> => {
    const query = warehouseId ? { warehouseId: new mongoose.Types.ObjectId(warehouseId) } : {};
    return await Bin.find(query).populate('allowedCommodityId', 'name');
  },

  // --- VEHICLES & DRIVERS ---
  createVehicle: async (data: any): Promise<IVehicle> => {
    const vehicle = new Vehicle({
      registrationNo: data.registrationNo.toUpperCase(),
      type: data.type,
      capacityMT: data.capacityMT,
      owner: data.owner
    });
    return await vehicle.save();
  },

  listVehicles: async (): Promise<IVehicle[]> => {
    return await Vehicle.find({});
  },

  createDriver: async (data: any): Promise<IDriver> => {
    const driver = new Driver({
      name: data.name,
      phone: data.phone,
      licenseNo: data.licenseNo.toUpperCase()
    });
    return await driver.save();
  },

  listDrivers: async (): Promise<IDriver[]> => {
    return await Driver.find({});
  },

  // --- DELETE METHODS ---
  deleteCustomer: async (id: string): Promise<void> => {
    await Customer.findByIdAndDelete(id);
  },
  deleteSupplier: async (id: string): Promise<void> => {
    await Supplier.findByIdAndDelete(id);
  },
  deleteFarmer: async (id: string): Promise<void> => {
    await Farmer.findByIdAndDelete(id);
  },
  deleteCommodity: async (id: string): Promise<void> => {
    await Commodity.findByIdAndDelete(id);
  },
  deleteWarehouse: async (id: string): Promise<void> => {
    await Warehouse.findByIdAndDelete(id);
  },
  deleteVehicle: async (id: string): Promise<void> => {
    await Vehicle.findByIdAndDelete(id);
  },
  deleteDriver: async (id: string): Promise<void> => {
    await Driver.findByIdAndDelete(id);
  },

  clearDatabase: async (): Promise<void> => {
    await Promise.all([
      Customer.deleteMany({}),
      Supplier.deleteMany({}),
      Farmer.deleteMany({}),
      Commodity.deleteMany({}),
      Warehouse.deleteMany({}),
      Bin.deleteMany({}),
      Vehicle.deleteMany({}),
      Driver.deleteMany({}),
      PurchaseEnquiry.deleteMany({}),
      PurchaseQuotation.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      GRN.deleteMany({}),
      QualityInspection.deleteMany({}),
      PurchaseInvoice.deleteMany({}),
      SalesEnquiry.deleteMany({}),
      SalesQuotation.deleteMany({}),
      SalesOrder.deleteMany({}),
      PickingTask.deleteMany({}),
      PackingSlip.deleteMany({}),
      SalesInvoice.deleteMany({}),
      DeliveryChallan.deleteMany({}),
      EWayBill.deleteMany({}),
      ProofOfDelivery.deleteMany({}),
      StockLedgerEntry.deleteMany({}),
      StockReservation.deleteMany({}),
      Voucher.deleteMany({}),
      LedgerEntry.deleteMany({}),
      Lead.deleteMany({}),
      Opportunity.deleteMany({}),
      Activity.deleteMany({}),
      FollowUp.deleteMany({}),
      CrmAutomationRule.deleteMany({}),
      AuditLog.deleteMany({}),
      MarketPrice.deleteMany({}),
      PriceAlert.deleteMany({})
    ]);
    // Stamp the cleared time so all browsers can detect the wipe on next load
    await Settings.updateOne({}, { $set: { clearedAt: new Date() } }, { upsert: true });
  }
};
