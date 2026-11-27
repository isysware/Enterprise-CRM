import { Router } from 'express';
import {
  authenticate,
  requirePermission,
  requireActiveAccount,
  validate,
  asyncHandler,
} from '../../middleware';
import { TeamsController } from './teams.controller';
import { createTeamSchema, updateTeamSchema, addTeamMemberSchema } from './teams.validator';

const router = Router();

router.use(authenticate, requireActiveAccount);

router.get('/', asyncHandler(TeamsController.listTeams));
router.get('/:id', asyncHandler(TeamsController.getTeamById));

router.post(
  '/',
  requirePermission('canManageTeams'),
  validate({ body: createTeamSchema }),
  asyncHandler(TeamsController.createTeam)
);

router.put(
  '/:id',
  requirePermission('canManageTeams'),
  validate({ body: updateTeamSchema }),
  asyncHandler(TeamsController.updateTeam)
);

router.delete(
  '/:id',
  requirePermission('canManageTeams'),
  asyncHandler(TeamsController.deleteTeam)
);

router.post(
  '/:id/members',
  requirePermission('canManageTeams'),
  validate({ body: addTeamMemberSchema }),
  asyncHandler(TeamsController.addMember)
);

router.delete(
  '/:id/members/:userId',
  requirePermission('canManageTeams'),
  asyncHandler(TeamsController.removeMember)
);

export const teamRoutes = router;
