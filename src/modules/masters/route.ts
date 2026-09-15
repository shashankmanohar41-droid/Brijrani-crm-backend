import { Router } from 'express';
import { mastersController } from './controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

// Public endpoint — no auth needed, used by all browsers to check if DB was cleared
router.get('/db-status', mastersController.getDbStatus);

// Apply authentication middleware to all master data endpoints
router.use(authenticate as any);

// Roles
router.post('/roles', mastersController.createRole);
router.get('/roles', mastersController.listRoles);

// Customers
router.post('/customers', mastersController.createCustomer);
router.get('/customers', mastersController.listCustomers);
router.delete('/customers/:id', mastersController.deleteCustomer);

// Suppliers
router.post('/suppliers', mastersController.createSupplier);
router.get('/suppliers', mastersController.listSuppliers);
router.delete('/suppliers/:id', mastersController.deleteSupplier);

// Farmers
router.post('/farmers', mastersController.createFarmer);
router.get('/farmers', mastersController.listFarmers);
router.delete('/farmers/:id', mastersController.deleteFarmer);

// Commodities
router.post('/commodities', mastersController.createCommodity);
router.get('/commodities', mastersController.listCommodities);
router.get('/commodities/:id', mastersController.getCommodityById);
router.put('/commodities/:id', mastersController.updateCommodity);
router.delete('/commodities/:id', mastersController.deleteCommodity);

// Warehouses
router.post('/warehouses', mastersController.createWarehouse);
router.get('/warehouses', mastersController.listWarehouses);
router.delete('/warehouses/:id', mastersController.deleteWarehouse);

// Bins
router.post('/bins', mastersController.createBin);
router.get('/bins', mastersController.listBins);

// Vehicles
router.post('/vehicles', mastersController.createVehicle);
router.get('/vehicles', mastersController.listVehicles);
router.delete('/vehicles/:id', mastersController.deleteVehicle);

// Drivers
router.post('/drivers', mastersController.createDriver);
router.get('/drivers', mastersController.listDrivers);
router.delete('/drivers/:id', mastersController.deleteDriver);

// System Reset
router.post('/clear-database', mastersController.clearDatabase);

export default router;
