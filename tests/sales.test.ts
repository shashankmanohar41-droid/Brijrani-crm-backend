import mongoose from 'mongoose';
import { salesService } from '../src/modules/sales/service';
import { inventoryService } from '../src/modules/inventory/service';
import { Commodity } from '../src/modules/commodities/model';
import { Warehouse, Bin } from '../src/modules/warehouse/model';
import { Customer } from '../src/modules/customers/model';
import { User } from '../src/modules/users/model';
import { SalesOrder, PickingTask } from '../src/modules/sales/model';
import { StockReservation, StockLedgerEntry } from '../src/modules/inventory/model';

const TEST_MONGO_URI = process.env.MONGODB_URI_TEST || 'mongodb+srv://shashankmanohar1734_db_user:hpIe3ev8T1QsKZMM@cluster0.ws2kdbz.mongodb.net/brijrani_erp_test?retryWrites=true&w=majority';

jest.setTimeout(30000);

describe('Sales Workflow & Inventory Reservation Tests', () => {
  let commodityId: string;
  let warehouseId: string;
  let binId: string;
  let customerId: string;

  beforeAll(async () => {
    // 1. Connect to test MongoDB
    await mongoose.connect(TEST_MONGO_URI);
    
    // Clear test DB tables
    await User.deleteMany({});
    await Commodity.deleteMany({});
    await Warehouse.deleteMany({});
    await Bin.deleteMany({});
    await Customer.deleteMany({});
    await SalesOrder.deleteMany({});
    await PickingTask.deleteMany({});
    await StockReservation.deleteMany({});
    await StockLedgerEntry.deleteMany({});

    // 2. Seed Test Masters
    const comm = new Commodity({
      commodityCode: 'TEST-CMD',
      name: 'Test Grain',
      category: 'Grains',
      unit: 'MT',
      hsn: '1001',
      gstRate: 5,
      purchasePrice: 20000,
      sellingPrice: 24000,
      minimumStock: 10,
      maximumStock: 1000,
      batchTracking: true
    });
    await comm.save();
    commodityId = String(comm._id);

    const wh = new Warehouse({
      name: 'Test Warehouse',
      location: 'Test Area',
      capacityMT: 500
    });
    await wh.save();
    warehouseId = String(wh._id);

    const bin = new Bin({
      warehouseId: wh._id,
      binCode: 'BIN-TEST-01',
      name: 'Test Bin',
      allowedCommodityId: comm._id,
      capacityMT: 100,
      occupiedMT: 0,
      availableMT: 100
    });
    await bin.save();
    binId = String(bin._id);

    const cust = new Customer({
      customerCode: 'TEST-CUST',
      name: 'Test Customer Flour Mill',
      gstin: '10AAACR0912K1Z8',
      phone: '+91 9999999999',
      email: 'test@customer.com',
      billingAddress: 'Test Billing Road',
      shippingAddress: 'Test Shipping Road',
      state: 'Bihar'
    });
    await cust.save();
    customerId = String(cust._id);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('Should warn and flag insufficient stock when available quantity is low', async () => {
    // Attempt to book order of 50 MT (available is 0)
    const result = await salesService.createSO({
      customerId,
      commodityId,
      quantity: 50,
      rate: 24000,
      total: 1200000,
      warehouseId,
      deliveryAddress: 'Test Customer Road'
    }, 'test-user');

    expect(result.status).toBe('INSUFFICIENT_STOCK_ALERT');
    expect(result.shortage).toBe(50);
    
    // Check that order status remains draft
    expect(result.so.status).toBe('Draft');
  });

  test('Should reserve stock successfully and assign picking tasks when stock is available', async () => {
    // Seed 80 MT Wheat in Test Bin via stock ledger entry
    await inventoryService.createStockLedgerEntry(undefined, {
      commodityId,
      batchNo: 'TEST-BATCH-001',
      warehouseId,
      binId,
      referenceType: 'OPENING_STOCK',
      referenceId: 'INIT-SEED',
      quantityIn: 80,
      quantityOut: 0,
      unitCost: 20000,
      createdBy: 'seed'
    });

    // Now attempt to book 30 MT
    const result = await salesService.createSO({
      customerId,
      commodityId,
      quantity: 30,
      rate: 24000,
      total: 720000,
      warehouseId,
      deliveryAddress: 'Test Customer Road'
    }, 'test-user');

    expect(result.status).toBe('RESERVED_AND_PICKING');
    expect(result.so.status).toBe('Picking');
    expect(result.pickTask).toBeDefined();
    expect(result.pickTask?.qtyToPick).toBe(30);

    // Verify Stock Reservation document
    const reservation = await StockReservation.findOne({ salesOrderId: result.so._id, status: 'Active' });
    expect(reservation).toBeDefined();
    expect(reservation?.reservedQty).toBe(30);
  });
});
