import { Router } from 'express';
import {
  authenticate,
  requirePermission,
  requireActiveAccount,
  validate,
  asyncHandler,
} from '../../middleware';
import { ProposalsController } from './proposals.controller';
import {
  createProposalSchema,
  updateProposalSchema,
  updateProposalStatusSchema,
} from './proposals.validator';

const router = Router();

router.use(authenticate, requireActiveAccount);

router.get('/', asyncHandler(ProposalsController.listProposals));
router.get('/:id', asyncHandler(ProposalsController.getProposalById));

router.post(
  '/',
  requirePermission('canGenerateProposals'),
  validate({ body: createProposalSchema }),
  asyncHandler(ProposalsController.createProposal)
);

router.put(
  '/:id',
  requirePermission('canGenerateProposals'),
  validate({ body: updateProposalSchema }),
  asyncHandler(ProposalsController.updateProposal)
);

router.patch(
  '/:id/status',
  requirePermission('canGenerateProposals'),
  validate({ body: updateProposalStatusSchema }),
  asyncHandler(ProposalsController.updateStatus)
);

export const proposalRoutes = router;
