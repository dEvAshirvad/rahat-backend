import { createRouter } from '@/configs/server.config';
import { AnalyticsHandler } from './analytics.handler';
import requireUser from '@/middlewares/requireUser';
import requireCollector from '@/middlewares/requireCollector';

const router = createRouter();

// Analytics dashboard - Collector only
router.get(
  '/dashboard',
  requireUser,
  requireCollector,
  AnalyticsHandler.getDashboard
);

export default router;
