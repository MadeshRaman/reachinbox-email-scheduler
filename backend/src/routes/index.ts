import { Router } from 'express';
import healthRoutes from './health.routes';
import emailRoutes from './email.routes';
import slackRoutes from './slack.routes';
import authRoutes from './auth.routes';

const router = Router();

// Mount sub-routers
router.use('/', healthRoutes);
router.use('/emails', emailRoutes);
router.use('/slack', slackRoutes);
router.use('/auth', authRoutes);

export default router;
