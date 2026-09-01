import { Router } from 'express';
import { procurementController } from './controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.use(authenticate as any);

router.get('/enquiries', procurementController.getEnquiries);
router.post('/enquiries', procurementController.createEnquiry);
router.patch('/enquiries/:id', procurementController.updateEnquiry);
router.delete('/enquiries/:id', procurementController.deleteEnquiry);

router.get('/quotations', procurementController.getQuotations);
router.post('/quotations', procurementController.createQuotation);
router.patch('/quotations/:id', procurementController.updateQuotation);
router.delete('/quotations/:id', procurementController.deleteQuotation);
router.get('/quotations/compare', procurementController.compareQuotations);

router.get('/orders', procurementController.getPOs);
router.post('/orders', procurementController.createPO);
router.patch('/orders/:id/approve', procurementController.approvePO);
router.patch('/orders/:id', procurementController.updatePO);
router.delete('/orders/:id', procurementController.deletePO);

router.get('/grns', procurementController.getGRNs);
router.post('/grns', procurementController.createGRN);
router.patch('/grns/:id', procurementController.updateGRN);
router.delete('/grns/:id', procurementController.deleteGRN);

router.get('/quality-inspections/dashboard', procurementController.getQcDashboard);
router.get('/quality-inspections/specs', procurementController.getSpecs);
router.post('/quality-inspections/specs', procurementController.createSpec);
router.delete('/quality-inspections/specs/:id', procurementController.deleteSpec);
router.get('/quality-inspections/samples', procurementController.getSamples);
router.post('/quality-inspections/samples', procurementController.createSample);
router.get('/quality-inspections/audits/:id', procurementController.getAuditLogs);
router.get('/quality-inspections', procurementController.getQualityInspections);
router.post('/quality-inspections', procurementController.submitQualityInspection);
router.patch('/quality-inspections/:id', procurementController.updateQualityInspection);

router.get('/invoices', procurementController.getInvoices);
router.post('/invoices', procurementController.createInvoice);
router.patch('/invoices/:id/approve', procurementController.approveInvoice);
router.patch('/invoices/:id', procurementController.updateInvoice);
router.delete('/invoices/:id', procurementController.deleteInvoice);

router.get('/purchase-returns', procurementController.getPurchaseReturns);
router.post('/purchase-returns', procurementController.createPurchaseReturn);
router.get('/purchase-returns/:id', procurementController.getPurchaseReturnById);
router.post('/purchase-returns/:id/submit', procurementController.submitPurchaseReturn);
router.post('/purchase-returns/:id/approve', procurementController.approvePurchaseReturn);
router.post('/purchase-returns/:id/reject', procurementController.rejectPurchaseReturn);
router.post('/purchase-returns/:id/dispatch', procurementController.dispatchPurchaseReturn);
router.post('/purchase-returns/:id/complete', procurementController.completePurchaseReturn);
router.delete('/purchase-returns/:id', procurementController.deletePurchaseReturn);
router.delete('/quality-inspections/:id', procurementController.deleteQualityInspection);

export default router;
