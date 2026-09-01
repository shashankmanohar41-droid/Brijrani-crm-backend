import mongoose, { ClientSession } from 'mongoose';
import { Bin, Warehouse } from '../warehouse/model';
import { StockLedgerEntry, StockReservation } from './model';
import { CustomError } from '../../middlewares/errorHandler';
import { Commodity } from '../commodities/model';
import { runInTransaction } from '../../utils/transaction';

export const inventoryService = {
  // Helper to fetch current physical and available stock
  getStockSummary: async (commodityId: string, warehouseId?: string, binId?: string) => {
    const matchQuery: any = { 
      commodityId: new mongoose.Types.ObjectId(commodityId) 
    };
    if (warehouseId) matchQuery.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    if (binId) matchQuery.binId = new mongoose.Types.ObjectId(binId);

    // Sum physical stock from stock ledger entries
    const ledgerResult = await StockLedgerEntry.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$batchNo',
          physicalQty: { $sum: { $subtract: ['$quantityIn', '$quantityOut'] } },
          averageCost: { $avg: '$unitCost' }
        }
      }
    ]);

    // Sum reserved stock
    const reservationResult = await StockReservation.aggregate([
      { $match: { ...matchQuery, status: 'Active' } },
      {
        $group: {
          _id: '$batchNo',
          reservedQty: { $sum: '$reservedQty' }
        }
      }
    ]);

    // Combine results
    const summary = ledgerResult.map(item => {
      const reservation = reservationResult.find(r => r._id === item._id);
      const reserved = reservation ? reservation.reservedQty : 0;
      return {
        batchNo: item._id,
        physicalStock: item.physicalQty,
        reservedStock: reserved,
        availableStock: Math.max(0, item.physicalQty - reserved),
        averageCost: item.averageCost
      };
    });

    return summary;
  },

  // Record Immutable Stock Ledger Entry
  createStockLedgerEntry: async (
    session: ClientSession | undefined,
    data: {
      commodityId: string;
      batchNo: string;
      warehouseId: string;
      binId: string;
      referenceType: any;
      referenceId: string;
      quantityIn: number;
      quantityOut: number;
      unitCost: number;
      createdBy: string;
    }
  ) => {
    // Resolve valid Commodity ObjectId
    let commObjId: mongoose.Types.ObjectId;
    if (mongoose.Types.ObjectId.isValid(data.commodityId)) {
      commObjId = new mongoose.Types.ObjectId(data.commodityId);
    } else {
      const comm = await Commodity.findOne({ $or: [{ commodityCode: data.commodityId }, { name: data.commodityId }] });
      commObjId = comm ? comm._id : new mongoose.Types.ObjectId();
    }

    // Resolve valid Warehouse ObjectId
    let whObjId: mongoose.Types.ObjectId | undefined;
    if (mongoose.Types.ObjectId.isValid(data.warehouseId)) {
      whObjId = new mongoose.Types.ObjectId(data.warehouseId);
    } else {
      const wh = await Warehouse.findOne({ $or: [{ name: data.warehouseId }, { location: data.warehouseId }] }) || await Warehouse.findOne({});
      whObjId = wh ? wh._id : undefined;
    }

    // Resolve or find Bin
    let bin = null;
    if (data.binId !== 'N/A' && mongoose.Types.ObjectId.isValid(data.binId)) {
      bin = await (session ? Bin.findById(data.binId).session(session) : Bin.findById(data.binId));
    }
    if (!bin && whObjId) {
      bin = await (session ? Bin.findOne({ warehouseId: whObjId }).session(session) : Bin.findOne({ warehouseId: whObjId }));
    }
    if (!bin) {
      bin = await (session ? Bin.findOne({}).session(session) : Bin.findOne({}));
    }
    if (!bin) {
      if (!whObjId) {
        const newWh = new Warehouse({ name: `Central Warehouse ${Date.now()}`, location: 'Patna', capacityMT: 10000 });
        await (session ? newWh.save({ session }) : newWh.save());
        whObjId = newWh._id;
      }
      bin = new Bin({
        warehouseId: whObjId,
        binCode: `BIN-${Date.now().toString().slice(-4)}`,
        name: 'Silo Bin A',
        allowedCommodityId: commObjId,
        capacityMT: 500,
        occupiedMT: 0,
        availableMT: 500,
        currentStock: []
      });
      await (session ? bin.save({ session }) : bin.save());
    }

    const netQtyChange = data.quantityIn - data.quantityOut;
    const updatedOccupiedMT = Math.max(0, bin.occupiedMT + netQtyChange);
    const updatedAvailableMT = Math.max(0, bin.capacityMT - updatedOccupiedMT);

    const updatedStock = [...(bin.currentStock || [])];
    const existingIndex = updatedStock.findIndex(item => item.batchNo === data.batchNo);
    if (existingIndex > -1) {
      updatedStock[existingIndex].quantity += netQtyChange;
      if (updatedStock[existingIndex].quantity <= 0) {
        updatedStock.splice(existingIndex, 1);
      }
    } else if (netQtyChange > 0) {
      updatedStock.push({
        commodityId: commObjId,
        batchNo: data.batchNo,
        quantity: netQtyChange
      });
    }

    await (session 
      ? Bin.findByIdAndUpdate(bin._id, {
          $set: {
            occupiedMT: updatedOccupiedMT,
            availableMT: updatedAvailableMT,
            currentStock: updatedStock,
            allowedCommodityId: bin.occupiedMT === 0 ? commObjId : bin.allowedCommodityId
          }
        }, { session, new: true })
      : Bin.findByIdAndUpdate(bin._id, {
          $set: {
            occupiedMT: updatedOccupiedMT,
            availableMT: updatedAvailableMT,
            currentStock: updatedStock,
            allowedCommodityId: bin.occupiedMT === 0 ? commObjId : bin.allowedCommodityId
          }
        }, { new: true })
    );

    // 4. Update parent Warehouse total occupancy
    if (whObjId) {
      await (session
        ? Warehouse.findByIdAndUpdate(whObjId, { $inc: { usedCapacityMT: netQtyChange } }, { session })
        : Warehouse.findByIdAndUpdate(whObjId, { $inc: { usedCapacityMT: netQtyChange } })
      );
    }

    // 5. Get current running balance for ledger history
    const prevLedgerQuery = StockLedgerEntry.findOne({
      commodityId: commObjId,
      binId: bin._id,
      batchNo: data.batchNo
    }).sort({ createdAt: -1 });

    const prevLedger = await (session ? prevLedgerQuery.session(session) : prevLedgerQuery);
    const prevRunning = prevLedger ? prevLedger.runningBalance : 0;
    const runningBalance = prevRunning + netQtyChange;

    // 6. Save ledger entry
    const entry = new StockLedgerEntry({
      commodityId: commObjId,
      batchNo: data.batchNo,
      warehouseId: whObjId || bin.warehouseId,
      binId: bin._id,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      quantityIn: data.quantityIn,
      quantityOut: data.quantityOut,
      unitCost: data.unitCost,
      runningBalance,
      createdBy: data.createdBy
    });

    await (session ? entry.save({ session }) : entry.save());

    // 7. Sync commodity global purchase price
    const comm = await (session ? Commodity.findById(commObjId).session(session) : Commodity.findById(commObjId));
    if (comm) {
      comm.purchasePrice = data.unitCost > 0 ? data.unitCost : comm.purchasePrice;
      await (session ? comm.save({ session }) : comm.save());
    }

    return entry;
  },

  // Reserve Stock for Sales Order
  reserveStock: async (
    salesOrderId: string,
    commodityId: string,
    quantity: number,
    warehouseId: string,
    createdBy: string
  ): Promise<void> => {
    await runInTransaction(async (session) => {
      const stocks = await inventoryService.getStockSummary(commodityId, warehouseId);
      let qtyToReserve = quantity;

      const availableBatches = stocks.filter(s => s.availableStock > 0);
      if (availableBatches.reduce((sum, s) => sum + s.availableStock, 0) < quantity) {
        throw new CustomError('Insufficient available stock to confirm order booking', 400);
      }

      for (const batch of availableBatches) {
        if (qtyToReserve <= 0) break;

        const resQty = Math.min(qtyToReserve, batch.availableStock);

        const binQuery = Bin.findOne({
          warehouseId,
          allowedCommodityId: commodityId,
          'currentStock.batchNo': batch.batchNo
        });
        let bin = await (session ? binQuery.session(session) : binQuery);

        if (!bin) {
          bin = await Bin.findOne({ warehouseId });
        }
        if (!bin) {
          bin = await Bin.findOne({});
        }

        if (!bin) continue;

        const reservation = new StockReservation({
          salesOrderId,
          commodityId,
          warehouseId,
          binId: bin._id,
          batchNo: batch.batchNo,
          reservedQty: resQty,
          status: 'Active',
          createdBy
        });
        await (session ? reservation.save({ session }) : reservation.save());

        qtyToReserve -= resQty;
      }
    });
  },

  // Release/Consume Stock Reservation
  releaseStockReservation: async (
    salesOrderId: string,
    status: 'Released' | 'Cancelled',
    session: ClientSession | undefined
  ): Promise<void> => {
    const query = StockReservation.updateMany(
      { salesOrderId: new mongoose.Types.ObjectId(salesOrderId), status: 'Active' },
      { $set: { status } }
    );
    if (session) {
      await query.session(session);
    } else {
      await query;
    }
  },

  // executeStockTransfer (Silo-to-Silo transaction)
  executeStockTransfer: async (
    data: {
      commodityId: string;
      batchNo: string;
      fromWarehouseId: string;
      fromBinId: string;
      toWarehouseId: string;
      toBinId: string;
      quantity: number;
      transferNo: string;
      createdBy: string;
    }
  ): Promise<void> => {
    await runInTransaction(async (session) => {
      // Resolve dummy bins if N/A or invalid ObjectId
      if (data.fromBinId === 'N/A' || !mongoose.Types.ObjectId.isValid(data.fromBinId)) {
        const dummyBin = await Bin.findOne({ warehouseId: data.fromWarehouseId }) || await Bin.findOne({});
        if (dummyBin) data.fromBinId = String(dummyBin._id);
      }
      if (data.toBinId === 'N/A' || !mongoose.Types.ObjectId.isValid(data.toBinId)) {
        const dummyBin = await Bin.findOne({ warehouseId: data.toWarehouseId }) || await Bin.findOne({});
        if (dummyBin) data.toBinId = String(dummyBin._id);
      }

      const fromBin = await (session ? Bin.findById(data.fromBinId).session(session) : Bin.findById(data.fromBinId));
      if (!fromBin) throw new CustomError('Source bin not found', 404);

      const batchStock = fromBin.currentStock.find(item => item.batchNo === data.batchNo);
      if (!batchStock || batchStock.quantity < data.quantity) {
        throw new CustomError(`Insufficient physical stock in source bin. Available: ${batchStock?.quantity || 0} MT`, 400);
      }

      const prevLedgerQuery = StockLedgerEntry.findOne({
        commodityId: data.commodityId,
        binId: data.fromBinId,
        batchNo: data.batchNo
      }).sort({ createdAt: -1 });
      const prevLedger = await (session ? prevLedgerQuery.session(session) : prevLedgerQuery);
      const unitCost = prevLedger ? prevLedger.unitCost : 0;

      await inventoryService.createStockLedgerEntry(session, {
        commodityId: data.commodityId,
        batchNo: data.batchNo,
        warehouseId: data.fromWarehouseId,
        binId: data.fromBinId,
        referenceType: 'STOCK_TRANSFER',
        referenceId: data.transferNo,
        quantityIn: 0,
        quantityOut: data.quantity,
        unitCost,
        createdBy: data.createdBy
      });

      await inventoryService.createStockLedgerEntry(session, {
        commodityId: data.commodityId,
        batchNo: data.batchNo,
        warehouseId: data.toWarehouseId,
        binId: data.toBinId,
        referenceType: 'STOCK_TRANSFER',
        referenceId: data.transferNo,
        quantityIn: data.quantity,
        quantityOut: 0,
        unitCost,
        createdBy: data.createdBy
      });
    });
  }
};
