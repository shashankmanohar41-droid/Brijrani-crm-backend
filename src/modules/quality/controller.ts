import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth';
import { qualityService } from './service';
import { sendSuccess } from '../../utils/response';

export const qualityController = {
  // ==========================================
  // 1. QUALITY PARAMETERS
  // ==========================================
  createParameter: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user?.id || 'Admin';
      const param = await qualityService.createParameter(req.body, user);
      sendSuccess(res, 'Quality parameter created successfully', param, 201);
    } catch (err) {
      next(err);
    }
  },

  listParameters: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await qualityService.listParameters(req.query);
      sendSuccess(res, 'Quality parameters retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  getParameterById: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const param = await qualityService.getParameterById(req.params.id as string);
      sendSuccess(res, 'Quality parameter retrieved successfully', param);
    } catch (err) {
      next(err);
    }
  },

  updateParameter: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user?.id || 'Admin';
      const param = await qualityService.updateParameter(req.params.id as string, req.body, user);
      sendSuccess(res, 'Quality parameter updated successfully', param);
    } catch (err) {
      next(err);
    }
  },

  deleteParameter: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await qualityService.deleteParameter(req.params.id as string);
      sendSuccess(res, 'Quality parameter deleted successfully', result);
    } catch (err) {
      next(err);
    }
  },

  // ==========================================
  // 2. QUALITY REBATE RULES
  // ==========================================
  createRule: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user?.id || 'Admin';
      const rule = await qualityService.createRule(req.body, user);
      sendSuccess(res, 'Quality rebate rule created successfully', rule, 201);
    } catch (err) {
      next(err);
    }
  },

  listRules: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await qualityService.listRules(req.query);
      sendSuccess(res, 'Quality rebate rules retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  getRuleById: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rule = await qualityService.getRuleById(req.params.id as string);
      sendSuccess(res, 'Quality rebate rule retrieved successfully', rule);
    } catch (err) {
      next(err);
    }
  },

  updateRule: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user?.id || 'Admin';
      const rule = await qualityService.updateRule(req.params.id as string, req.body, user);
      sendSuccess(res, 'Quality rebate rule updated successfully', rule);
    } catch (err) {
      next(err);
    }
  },

  deleteRule: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await qualityService.deleteRule(req.params.id as string);
      sendSuccess(res, 'Quality rebate rule deleted successfully', result);
    } catch (err) {
      next(err);
    }
  },

  duplicateRule: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user?.id || 'Admin';
      const duplicated = await qualityService.duplicateRule(req.params.id as string, user);
      sendSuccess(res, 'Quality rebate rule duplicated successfully', duplicated, 201);
    } catch (err) {
      next(err);
    }
  },

  toggleRuleStatus: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await qualityService.toggleRuleStatus(req.params.id as string);
      sendSuccess(res, `Rule status toggled to ${updated.status}`, updated);
    } catch (err) {
      next(err);
    }
  },

  // ==========================================
  // 3. QC CALCULATION PREVIEW
  // ==========================================
  calculatePreview: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await qualityService.calculatePreview(req.body);
      sendSuccess(res, 'Quality rebate calculation evaluated', result);
    } catch (err) {
      next(err);
    }
  },

  // ==========================================
  // 4. QUALITY CONTROL
  // ==========================================
  createQC: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user?.id || 'Admin';
      const qc = await qualityService.createQC(req.body, user);
      sendSuccess(res, 'Quality control record created successfully', qc, 201);
    } catch (err) {
      next(err);
    }
  },

  listQC: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await qualityService.listQC(req.query);
      sendSuccess(res, 'Quality control records retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  },

  getQCById: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const qc = await qualityService.getQCById(req.params.id as string);
      sendSuccess(res, 'Quality control record retrieved successfully', qc);
    } catch (err) {
      next(err);
    }
  },

  updateQC: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user?.id || 'Admin';
      const updated = await qualityService.updateQC(req.params.id as string, req.body, user);
      sendSuccess(res, 'Quality control record updated successfully', updated);
    } catch (err) {
      next(err);
    }
  },

  submitQC: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user?.id || 'Admin';
      const submitted = await qualityService.submitQC(req.params.id as string, user);
      sendSuccess(res, 'Quality control record submitted for approval', submitted);
    } catch (err) {
      next(err);
    }
  },

  approveQC: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user?.id || 'Admin';
      const approved = await qualityService.approveQC(req.params.id as string, user);
      sendSuccess(res, 'Quality control record approved and finalized', approved);
    } catch (err) {
      next(err);
    }
  },

  rejectQC: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user?.id || 'Admin';
      const rejected = await qualityService.rejectQC(req.params.id as string, req.body.reason, user);
      sendSuccess(res, 'Quality control record rejected', rejected);
    } catch (err) {
      next(err);
    }
  },

  deleteQC: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user?.id || 'Admin';
      const result = await qualityService.deleteQC(req.params.id as string, user);
      sendSuccess(res, 'Quality control record deleted', result);
    } catch (err) {
      next(err);
    }
  }
};
