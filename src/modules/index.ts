import { createRouter } from '@/configs/server.config';
import casesRouter from './cases/cases.route';
import analyticsRouter from './analytics/analytics.route';

const router = createRouter();

router.use('/cases', casesRouter);
router.use('/analytics', analyticsRouter);

export default router;
