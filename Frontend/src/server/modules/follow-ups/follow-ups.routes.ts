import { Router } from 'express';
import {
  authenticate,
  requireActiveAccount,
  validate,
  asyncHandler,
} from '../../middleware';
import { FollowUpsController } from './follow-ups.controller';
import {
  createFollowUpSchema,
  updateFollowUpSchema,
  completeFollowUpSchema,
  rescheduleFollowUpSchema,
  listFollowUpsQuerySchema,
} from './follow-ups.validator';

const router = Router();

router.use(authenticate, requireActiveAccount);

router.get('/', validate({ query: listFollowUpsQuerySchema }), asyncHandler(FollowUpsController.listFollowUps));
router.get('/:id', asyncHandler(FollowUpsController.getFollowUpById));

router.post(
  '/',
  validate({ body: createFollowUpSchema }),
  asyncHandler(FollowUpsController.createFollowUp)
);

router.patch(
  '/:id/complete',
  validate({ body: completeFollowUpSchema }),
  asyncHandler(FollowUpsController.completeFollowUp)
);

router.patch(
  '/:id/reschedule',
  validate({ body: rescheduleFollowUpSchema }),
  asyncHandler(FollowUpsController.rescheduleFollowUp)
);

router.patch(
  '/:id',
  validate({ body: updateFollowUpSchema }),
  asyncHandler(FollowUpsController.updateFollowUp)
);

router.put(
  '/:id',
  validate({ body: updateFollowUpSchema }),
  asyncHandler(FollowUpsController.updateFollowUp)
);

router.delete('/:id', asyncHandler(FollowUpsController.deleteFollowUp));

export const followUpRoutes = router;
