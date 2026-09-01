import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth';
import { salesService } from './service';
import { sendSuccess } from '../../utils/response';

export const salesController = {
  createEnquiry: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const se = await salesService.createEnquiry(req.body, email);
      sendSuccess(res, 'Sales Enquiry logged successfully', se, 201);
    } catch (err) {
      next(err);
    }
  },

  createQuotation: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const sq = await salesService.createQuotation(req.body, email);
      sendSuccess(res, 'Sales Quotation generated successfully', sq, 201);
    } catch (err) {
      next(err);
    }
  },

  createSO: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const result = await salesService.createSO(req.body, email);
      
      if (result.status === 'INSUFFICIENT_STOCK_ALERT') {
        sendSuccess(res, 'Sales Order logged as DRAFT. Insufficient stock in storage - purchasing manager notified.', result, 200);
      } else {
        sendSuccess(res, 'Sales Order confirmed, stock reserved and picking task assigned', result, 201);
      }
    } catch (err) {
      next(err);
    }
  },

  completePicking: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const { pickingId, qtyPicked, packageType } = req.body;
      const pack = await salesService.completePicking(pickingId, qtyPicked, packageType, email);
      sendSuccess(res, 'Silo picking and package packing slips generated', pack, 200);
    } catch (err) {
      next(err);
    }
  },

  dispatchOrder: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const { soId, vehicleNo, driverName } = req.body;
      const dispatch = await salesService.dispatchOrder(soId, vehicleNo, driverName, email);
      sendSuccess(res, 'Order dispatched, tax invoice generated, and vehicle allocated', dispatch, 200);
    } catch (err) {
      next(err);
    }
  },

  submitPOD: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const pod = await salesService.submitPOD(req.body, email);
      sendSuccess(res, 'Proof of Delivery registered, active inventory decremented', pod, 201);
    } catch (err) {
      next(err);
    }
  },

  listInvoices: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await salesService.listInvoices();
      sendSuccess(res, 'Sales Invoices retrieved successfully', list, 200);
    } catch (err) {
      next(err);
    }
  },

  listEnquiries: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await salesService.listEnquiries();
      sendSuccess(res, 'Sales Enquiries retrieved successfully', list, 200);
    } catch (err) {
      next(err);
    }
  },

  listQuotations: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await salesService.listQuotations();
      sendSuccess(res, 'Sales Quotations retrieved successfully', list, 200);
    } catch (err) {
      next(err);
    }
  },

  listOrders: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await salesService.listOrders();
      sendSuccess(res, 'Sales Orders retrieved successfully', list, 200);
    } catch (err) {
      next(err);
    }
  },

  listPickLists: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await salesService.listPickLists();
      sendSuccess(res, 'Picking Tasks retrieved successfully', list, 200);
    } catch (err) {
      next(err);
    }
  },

  listPackages: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await salesService.listPackages();
      sendSuccess(res, 'Packages retrieved successfully', list, 200);
    } catch (err) {
      next(err);
    }
  },

  listDeliveries: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await salesService.listDeliveries();
      sendSuccess(res, 'Delivery Challans retrieved successfully', list, 200);
    } catch (err) {
      next(err);
    }
  },

  listReturns: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await salesService.listReturns();
      sendSuccess(res, 'Sales Returns retrieved successfully', list, 200);
    } catch (err) {
      next(err);
    }
  },

  listCreditNotes: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await salesService.listCreditNotes();
      sendSuccess(res, 'Credit Notes retrieved successfully', list, 200);
    } catch (err) {
      next(err);
    }
  },

  listRefunds: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await salesService.listRefunds();
      sendSuccess(res, 'Refunds retrieved successfully', list, 200);
    } catch (err) {
      next(err);
    }
  },

  listTargets: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await salesService.listTargets();
      sendSuccess(res, 'Sales Targets retrieved successfully', list, 200);
    } catch (err) {
      next(err);
    }
  },

  createTarget: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const target = await salesService.createTarget(req.body, email);
      sendSuccess(res, 'Sales Target created successfully', target, 201);
    } catch (err) {
      next(err);
    }
  },

  listCommissions: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await salesService.listCommissions();
      sendSuccess(res, 'Sales Commissions retrieved successfully', list, 200);
    } catch (err) {
      next(err);
    }
  },

  updateQuotationStatus: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = (req.user?.id || 'admin') as string;
      const q = await salesService.updateQuotationStatus(req.params.id as string, req.body.status as string, email);
      sendSuccess(res, 'Quotation status updated successfully', q, 200);
    } catch (err) {
      next(err);
    }
  },

  updateOrderStatus: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = (req.user?.id || 'admin') as string;
      const o = await salesService.updateOrderStatus(req.params.id as string, req.body.status as string, email);
      sendSuccess(res, 'Order status updated successfully', o, 200);
    } catch (err) {
      next(err);
    }
  },

  getCustomerStatement: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const statement = await salesService.getCustomerStatement(req.params.id as string);
      sendSuccess(res, 'Customer statement retrieved successfully', statement, 200);
    } catch (err) {
      next(err);
    }
  },

  getReceivableAging: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const aging = await salesService.getReceivableAging();
      sendSuccess(res, 'Receivable aging retrieved successfully', aging, 200);
    } catch (err) {
      next(err);
    }
  },

  getDashboard: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dash = await salesService.getDashboard(req.query);
      sendSuccess(res, 'Dashboard metrics retrieved successfully', dash, 200);
    } catch (err) {
      next(err);
    }
  },

  createReturn: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const sr = await salesService.createReturn(req.body, email);
      sendSuccess(res, 'Sales return request logged successfully', sr, 201);
    } catch (err) {
      next(err);
    }
  },

  inspectReturn: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const result = await salesService.inspectReturn(req.body, email);
      sendSuccess(res, 'Return quality inspection and credit note completed', result, 200);
    } catch (err) {
      next(err);
    }
  }
};
