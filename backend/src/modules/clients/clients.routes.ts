import { Router } from 'express';
import {
  authenticate,
  requirePermission,
  requireActiveAccount,
  validate,
  asyncHandler,
} from '../../middleware';
import { ClientsController } from './clients.controller';
import {
  convertLeadToClientSchema,
  updateClientSchema,
  revertClientSchema,
  listClientsQuerySchema,
} from './clients.validator';

const router = Router();

router.use(authenticate, requireActiveAccount);

router.get(
  '/',
  requirePermission('canViewClients'),
  validate({ query: listClientsQuerySchema }),
  asyncHandler(ClientsController.listClients)
);

router.get(
  '/:id',
  requirePermission('canViewClients'),
  asyncHandler(ClientsController.getClientById)
);

router.post(
  '/convert-lead',
  validate({ body: convertLeadToClientSchema }),
  asyncHandler(ClientsController.convertLead)
);

router.post(
  '/:id/revert',
  validate({ body: revertClientSchema }),
  asyncHandler(ClientsController.revertClient)
);

router.put(
  '/:id',
  validate({ body: updateClientSchema }),
  asyncHandler(ClientsController.updateClient)
);

export const clientRoutes = router;
