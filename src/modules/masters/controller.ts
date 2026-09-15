import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth';
import { CustomError } from '../../middlewares/errorHandler';
import { mastersService } from './service';
import { sendSuccess } from '../../utils/response';

export const mastersController = {
  createRole: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = await mastersService.createRole(req.body);
      sendSuccess(res, 'Role created successfully', role, 201);
    } catch (err) {
      next(err);
    }
  },

  listRoles: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await mastersService.listRoles();
      sendSuccess(res, 'Roles retrieved successfully', roles);
    } catch (err) {
      next(err);
    }
  },

  createCustomer: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customer = await mastersService.createCustomer(req.body);
      sendSuccess(res, 'Customer registered successfully', customer, 201);
    } catch (err) {
      next(err);
    }
  },

  listCustomers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const search = req.query.search as string;
      const list = await mastersService.listCustomers(search);
      sendSuccess(res, 'Customers retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  createSupplier: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplier = await mastersService.createSupplier(req.body);
      sendSuccess(res, 'Supplier registered successfully', supplier, 201);
    } catch (err) {
      next(err);
    }
  },

  listSuppliers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const search = req.query.search as string;
      const list = await mastersService.listSuppliers(search);
      sendSuccess(res, 'Suppliers retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  createFarmer: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmer = await mastersService.createFarmer(req.body);
      sendSuccess(res, 'Farmer registered successfully', farmer, 201);
    } catch (err) {
      next(err);
    }
  },

  listFarmers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const search = req.query.search as string;
      const list = await mastersService.listFarmers(search);
      sendSuccess(res, 'Farmers retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  createCommodity: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const commodity = await mastersService.createCommodity(req.body);
      sendSuccess(res, 'Commodity added successfully', commodity, 201);
    } catch (err) {
      next(err);
    }
  },

  updateCommodity: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const commodity = await mastersService.updateCommodity(req.params.id as string, req.body);
      sendSuccess(res, 'Commodity updated successfully', commodity);
    } catch (err) {
      next(err);
    }
  },

  getCommodityById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const commodity = await mastersService.getCommodityById(req.params.id as string);
      if (!commodity) {
        throw new CustomError('Commodity not found', 404);
      }
      sendSuccess(res, 'Commodity retrieved successfully', commodity);
    } catch (err) {
      next(err);
    }
  },

  listCommodities: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await mastersService.listCommodities();
      sendSuccess(res, 'Commodities retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  createWarehouse: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const wh = await mastersService.createWarehouse(req.body);
      sendSuccess(res, 'Warehouse added successfully', wh, 201);
    } catch (err) {
      next(err);
    }
  },

  listWarehouses: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await mastersService.listWarehouses();
      sendSuccess(res, 'Warehouses retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  createBin: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const bin = await mastersService.createBin(req.body);
      sendSuccess(res, 'Silo Bin created successfully', bin, 201);
    } catch (err) {
      next(err);
    }
  },

  listBins: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const whId = req.query.warehouseId as string;
      const list = await mastersService.listBins(whId);
      sendSuccess(res, 'Bins retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  createVehicle: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const vehicle = await mastersService.createVehicle(req.body);
      sendSuccess(res, 'Vehicle registered successfully', vehicle, 201);
    } catch (err) {
      next(err);
    }
  },

  listVehicles: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await mastersService.listVehicles();
      sendSuccess(res, 'Vehicles retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  createDriver: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driver = await mastersService.createDriver(req.body);
      sendSuccess(res, 'Driver registered successfully', driver, 201);
    } catch (err) {
      next(err);
    }
  },

  listDrivers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await mastersService.listDrivers();
      sendSuccess(res, 'Drivers retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  deleteCustomer: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await mastersService.deleteCustomer(req.params.id as string);
      sendSuccess(res, 'Customer deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  deleteSupplier: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await mastersService.deleteSupplier(req.params.id as string);
      sendSuccess(res, 'Supplier deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  deleteFarmer: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await mastersService.deleteFarmer(req.params.id as string);
      sendSuccess(res, 'Farmer deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  deleteCommodity: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await mastersService.deleteCommodity(req.params.id as string);
      sendSuccess(res, 'Commodity deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  deleteWarehouse: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await mastersService.deleteWarehouse(req.params.id as string);
      sendSuccess(res, 'Warehouse deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  deleteVehicle: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await mastersService.deleteVehicle(req.params.id as string);
      sendSuccess(res, 'Vehicle deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  deleteDriver: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await mastersService.deleteDriver(req.params.id as string);
      sendSuccess(res, 'Driver deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  clearDatabase: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.role !== 'Super Admin') {
        throw new CustomError('Unauthorized: Only Super Admin can clear the database', 403);
      }
      await mastersService.clearDatabase();
      sendSuccess(res, 'All database collections cleared successfully');
    } catch (err) {
      next(err);
    }
  },

  getDbStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { Settings } = await import('../settings/model');
      const settings = await Settings.findOne({});
      res.json({ clearedAt: settings?.clearedAt ?? null });
    } catch (err) {
      next(err);
    }
  }
};
