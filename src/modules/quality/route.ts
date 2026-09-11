import { Router } from 'express';
import { qualityController } from './controller';
import { authenticate } from '../../middlewares/auth';

// 1. Quality Parameters Router
export const qualityParametersRouter = Router();
qualityParametersRouter.use(authenticate as any);
qualityParametersRouter.get('/', qualityController.listParameters);
qualityParametersRouter.post('/', qualityController.createParameter);
qualityParametersRouter.get('/:id', qualityController.getParameterById);
qualityParametersRouter.put('/:id', qualityController.updateParameter);
qualityParametersRouter.delete('/:id', qualityController.deleteParameter);

// 2. Quality Rebate Rules Router
export const qualityRebateRulesRouter = Router();
qualityRebateRulesRouter.use(authenticate as any);
qualityRebateRulesRouter.get('/', qualityController.listRules);
qualityRebateRulesRouter.post('/', qualityController.createRule);
qualityRebateRulesRouter.get('/:id', qualityController.getRuleById);
qualityRebateRulesRouter.put('/:id', qualityController.updateRule);
qualityRebateRulesRouter.delete('/:id', qualityController.deleteRule);
qualityRebateRulesRouter.post('/:id/duplicate', qualityController.duplicateRule);
qualityRebateRulesRouter.patch('/:id/toggle-status', qualityController.toggleRuleStatus);

// 3. Quality Control (QC) Router
export const qualityControlRouter = Router();
qualityControlRouter.use(authenticate as any);
qualityControlRouter.get('/', qualityController.listQC);
qualityControlRouter.post('/', qualityController.createQC);
qualityControlRouter.post('/calculate', qualityController.calculatePreview);
qualityControlRouter.get('/:id', qualityController.getQCById);
qualityControlRouter.put('/:id', qualityController.updateQC);
qualityControlRouter.delete('/:id', qualityController.deleteQC);
qualityControlRouter.post('/:id/submit', qualityController.submitQC);
qualityControlRouter.post('/:id/approve', qualityController.approveQC);
qualityControlRouter.post('/:id/reject', qualityController.rejectQC);

// Default export unified router
const qualityRouter = Router();
qualityRouter.use('/quality-parameters', qualityParametersRouter);
qualityRouter.use('/quality-rebate-rules', qualityRebateRulesRouter);
qualityRouter.use('/quality-control', qualityControlRouter);

export default qualityRouter;
