import { Router } from 'express';
import { salesController } from './controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.use(authenticate as any);

router.get('/enquiries', salesController.listEnquiries);
router.post('/enquiries', salesController.createEnquiry);

router.get('/quotations', salesController.listQuotations);
router.post('/quotations', salesController.createQuotation);
router.put('/quotations/:id/status', salesController.updateQuotationStatus);

router.get('/orders', salesController.listOrders);
router.post('/orders', salesController.createSO);
router.put('/orders/:id/status', salesController.updateOrderStatus);

router.get('/picking', salesController.listPickLists);
router.post('/picking/complete', salesController.completePicking);

router.get('/packages', salesController.listPackages);
router.get('/deliveries', salesController.listDeliveries);
router.post('/dispatch', salesController.dispatchOrder);
router.post('/pod', salesController.submitPOD);

router.get('/invoices', salesController.listInvoices);

// Return, Credit and Refund workflows
router.get('/returns', salesController.listReturns);
router.post('/returns', salesController.createReturn);
router.post('/returns/inspect', salesController.inspectReturn);

router.get('/credit-notes', salesController.listCreditNotes);
router.get('/refunds', salesController.listRefunds);

// Target and Commission metrics
router.get('/targets', salesController.listTargets);
router.post('/targets', salesController.createTarget);
router.get('/commissions', salesController.listCommissions);

// Analytics, statements and dashboard
router.get('/dashboard', salesController.getDashboard);
router.get('/aging', salesController.getReceivableAging);
router.get('/customer-statement/:id', salesController.getCustomerStatement);

export default router;
