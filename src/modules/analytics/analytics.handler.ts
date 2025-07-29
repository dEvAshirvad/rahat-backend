import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import APIError from '@/lib/errors/APIError';
import Respond from '@/lib/respond';
import logger from '@/configs/logger';

export class AnalyticsHandler {
  /**
   * Get analytics dashboard for Collector
   * GET /analytics/dashboard
   * Role: Collector only
   */
  static async getDashboard(req: Request, res: Response) {
    try {
      logger.info('Generating analytics dashboard for Collector');

      // Get analytics data
      const analytics = await AnalyticsService.getDashboardAnalytics();

      Respond(
        res,
        {
          message: 'Analytics dashboard generated successfully',
          data: analytics,
        },
        200
      );
    } catch (error) {
      throw error;
    }
  }
}
