import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth';
import { procurementService } from './service';
import { sendSuccess } from '../../utils/response';
import { uploadToCloudinary, uploadToCloud } from '../../config/storage';
import { CustomError } from '../../middlewares/errorHandler';

export const procurementController = {
  createEnquiry: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const pe = await procurementService.createEnquiry(req.body, email);
      sendSuccess(res, 'Purchase Enquiry created successfully', pe, 201);
    } catch (err) {
      next(err);
    }
  },

  updateEnquiry: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pe = await procurementService.updateEnquiry(req.params.id as string, req.body);
      sendSuccess(res, 'Purchase Enquiry updated successfully', pe);
    } catch (err) {
      next(err);
    }
  },

  createQuotation: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const pq = await procurementService.createQuotation(req.body, email);
      sendSuccess(res, 'Purchase Quotation logged successfully', pq, 201);
    } catch (err) {
      next(err);
    }
  },

  compareQuotations: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const enquiryNo = req.query.enquiryNo as string;
      const comparison = await procurementService.compareQuotations(enquiryNo);
      sendSuccess(res, 'Quotation comparison generated', comparison);
    } catch (err) {
      next(err);
    }
  },

  createPO: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const po = await procurementService.createPO(req.body, email);
      sendSuccess(res, 'Purchase Order created successfully', po, 201);
    } catch (err) {
      next(err);
    }
  },

  approvePO: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const username = req.user?.id || 'admin';
      const po = await procurementService.approvePO(req.params.id as string, username);
      sendSuccess(res, 'Purchase Order approved', po);
    } catch (err) {
      next(err);
    }
  },

  createGRN: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const grn = await procurementService.createGRN(req.body, email);
      sendSuccess(res, 'Goods Receipt Note logged successfully', grn, 201);
    } catch (err) {
      next(err);
    }
  },

  submitQualityInspection: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const qi = await procurementService.submitQualityInspection(req.body, email);
      sendSuccess(res, 'Quality Inspection logged and inventory updated successfully', qi, 201);
    } catch (err) {
      next(err);
    }
  },

  createInvoice: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const invoice = await procurementService.createInvoice(req.body, email);
      sendSuccess(res, 'Purchase Invoice created successfully', invoice, 201);
    } catch (err) {
      next(err);
    }
  },

  approveInvoice: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const username = req.user?.id || 'admin';
      const invoice = await procurementService.approveInvoice(req.params.id as string, username);
      sendSuccess(res, 'Purchase Invoice approved', invoice);
    } catch (err) {
      next(err);
    }
  },

  getEnquiries: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await procurementService.getEnquiries();
      sendSuccess(res, 'Enquiries fetched', list);
    } catch (err) {
      next(err);
    }
  },

  getQuotations: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await procurementService.getQuotations();
      sendSuccess(res, 'Quotations fetched', list);
    } catch (err) {
      next(err);
    }
  },

  getPOs: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await procurementService.getPOs();
      sendSuccess(res, 'Purchase Orders fetched', list);
    } catch (err) {
      next(err);
    }
  },

  getGRNs: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await procurementService.getGRNs();
      sendSuccess(res, 'GRNs fetched', list);
    } catch (err) {
      next(err);
    }
  },

  getQualityInspections: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await procurementService.getQualityInspections();
      sendSuccess(res, 'Quality Inspections fetched', list);
    } catch (err) {
      next(err);
    }
  },

  getInvoices: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await procurementService.getInvoices();
      sendSuccess(res, 'Invoices fetched', list);
    } catch (err) {
      next(err);
    }
  },

  updateInvoice: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoice = await procurementService.updateInvoice(req.params.id as string, req.body);
      sendSuccess(res, 'Purchase Invoice updated successfully', invoice);
    } catch (err) {
      next(err);
    }
  },

  updatePO: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const po = await procurementService.updatePO(req.params.id as string, req.body);
      sendSuccess(res, 'Purchase Order updated successfully', po);
    } catch (err) {
      next(err);
    }
  },

  updateGRN: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const grn = await procurementService.updateGRN(req.params.id as string, req.body);
      sendSuccess(res, 'GRN updated successfully', grn);
    } catch (err) {
      next(err);
    }
  },

  updateQualityInspection: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const qi = await procurementService.updateQualityInspection(req.params.id as string, req.body, email);
      sendSuccess(res, 'Quality Inspection updated successfully', qi);
    } catch (err) {
      next(err);
    }
  },

  updateQuotation: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = await procurementService.updateQuotation(req.params.id as string, req.body);
      sendSuccess(res, 'Purchase Quotation updated successfully', q);
    } catch (err) {
      next(err);
    }
  },

  getSpecs: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await procurementService.getSpecs(req.query.commodityId as string);
      sendSuccess(res, 'Specs retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  createSpec: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const spec = await procurementService.createSpec(req.body);
      sendSuccess(res, 'Spec created successfully', spec, 201);
    } catch (err) {
      next(err);
    }
  },

  deleteSpec: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const spec = await procurementService.deleteSpec(req.params.id as string);
      sendSuccess(res, 'Spec deleted successfully', spec);
    } catch (err) {
      next(err);
    }
  },

  getSamples: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await procurementService.getSamples();
      sendSuccess(res, 'Samples retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  createSample: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const sample = await procurementService.createSample(req.body, email);
      sendSuccess(res, 'Sample tag created successfully', sample, 201);
    } catch (err) {
      next(err);
    }
  },

  getAuditLogs: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await procurementService.getAuditLogs(req.params.id as string);
      sendSuccess(res, 'Audit logs retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  getQcDashboard: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await procurementService.getQcDashboard();
      sendSuccess(res, 'QC stats dashboard retrieved successfully', stats);
    } catch (err) {
      next(err);
    }
  },

  getPurchaseReturns: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await procurementService.getPurchaseReturns();
      sendSuccess(res, 'Purchase Returns retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  getPurchaseReturnById: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pr = await procurementService.getPurchaseReturnById(req.params.id as string);
      sendSuccess(res, 'Purchase Return retrieved successfully', pr);
    } catch (err) {
      next(err);
    }
  },

  createPurchaseReturn: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const pr = await procurementService.createPurchaseReturn(req.body, email);
      sendSuccess(res, 'Purchase Return request created successfully', pr, 201);
    } catch (err) {
      next(err);
    }
  },

  submitPurchaseReturn: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pr = await procurementService.submitPurchaseReturn(req.params.id as string);
      sendSuccess(res, 'Purchase Return request submitted successfully', pr);
    } catch (err) {
      next(err);
    }
  },

  approvePurchaseReturn: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const pr = await procurementService.approvePurchaseReturn(req.params.id as string, email);
      sendSuccess(res, 'Purchase Return approved successfully', pr);
    } catch (err) {
      next(err);
    }
  },

  rejectPurchaseReturn: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pr = await procurementService.rejectPurchaseReturn(req.params.id as string);
      sendSuccess(res, 'Purchase Return request rejected', pr);
    } catch (err) {
      next(err);
    }
  },

  dispatchPurchaseReturn: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.user?.id || 'admin';
      const pr = await procurementService.dispatchPurchaseReturn(req.params.id as string, email);
      sendSuccess(res, 'Purchase Return dispatched & stock deducted successfully', pr);
    } catch (err) {
      next(err);
    }
  },

  completePurchaseReturn: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pr = await procurementService.completePurchaseReturn(req.params.id as string);
      sendSuccess(res, 'Purchase Return completed & supplier balance adjusted successfully', pr);
    } catch (err) {
      next(err);
    }
  },

  deleteEnquiry: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await procurementService.deleteEnquiry(req.params.id as string);
      sendSuccess(res, 'Purchase Enquiry deleted successfully', data);
    } catch (err) {
      next(err);
    }
  },

  deleteQuotation: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await procurementService.deleteQuotation(req.params.id as string);
      sendSuccess(res, 'Purchase Quotation deleted successfully', data);
    } catch (err) {
      next(err);
    }
  },

  deletePO: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await procurementService.deletePO(req.params.id as string);
      sendSuccess(res, 'Purchase Order deleted successfully', data);
    } catch (err) {
      next(err);
    }
  },

  deleteGRN: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await procurementService.deleteGRN(req.params.id as string);
      sendSuccess(res, 'GRN deleted successfully', data);
    } catch (err) {
      next(err);
    }
  },

  deleteInvoice: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await procurementService.deleteInvoice(req.params.id as string);
      sendSuccess(res, 'Purchase Invoice deleted successfully', data);
    } catch (err) {
      next(err);
    }
  },

  deletePurchaseReturn: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await procurementService.deletePurchaseReturn(req.params.id as string);
      sendSuccess(res, 'Purchase Return deleted successfully', data);
    } catch (err) {
      next(err);
    }
  },

  deleteQualityInspection: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await procurementService.deleteQualityInspection(req.params.id as string);
      sendSuccess(res, 'Quality Inspection deleted successfully', data);
    } catch (err) {
      next(err);
    }
  },

  uploadPhoto: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. If file uploaded via multipart multer
      if (req.file) {
        const url = await uploadToCloud(req.file, 'brijrani_erp/grn_photos');
        sendSuccess(res, 'Photo uploaded successfully to Cloudinary', { url, secure_url: url }, 201);
        return;
      }

      // 2. If multiple files uploaded via multer
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const urls: string[] = [];
        for (const file of req.files) {
          const url = await uploadToCloud(file, 'brijrani_erp/grn_photos');
          urls.push(url);
        }
        sendSuccess(res, 'Photos uploaded successfully to Cloudinary', { urls, url: urls[0] }, 201);
        return;
      }

      // 3. If base64 data string passed in JSON body
      if (req.body && req.body.image) {
        const base64Data = req.body.image;
        const uploadRes = await uploadToCloudinary(base64Data, 'brijrani_erp/grn_photos');
        sendSuccess(res, 'Photo uploaded successfully to Cloudinary', { url: uploadRes.secure_url, secure_url: uploadRes.secure_url, public_id: uploadRes.public_id }, 201);
        return;
      }

      // 4. If array of base64 images passed in JSON body
      if (req.body && Array.isArray(req.body.images)) {
        const urls: string[] = [];
        for (const img of req.body.images) {
          const uploadRes = await uploadToCloudinary(img, 'brijrani_erp/grn_photos');
          urls.push(uploadRes.secure_url);
        }
        sendSuccess(res, 'Photos uploaded successfully to Cloudinary', { urls, url: urls[0] }, 201);
        return;
      }

      throw new CustomError('No photo file or image data provided for upload', 400);
    } catch (err) {
      next(err);
    }
  }
};
