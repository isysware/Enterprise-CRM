import { Router } from 'express';
import { metaRoutes } from './meta';
import { whatsappRoutes } from './whatsapp';

const router = Router();

router.use('/meta', metaRoutes);
router.use('/whatsapp', whatsappRoutes);

export const integrationRoutes = router;
