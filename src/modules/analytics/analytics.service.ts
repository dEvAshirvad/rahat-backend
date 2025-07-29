import { CaseModel } from '../cases/cases.model';
import { Case } from '../cases/cases.model';
import APIError from '@/lib/errors/APIError';
import {
  AnalyticsDashboard,
  StatusOverview,
  DelayAnalysis,
  RejectionAnalysis,
} from './analytics.model';

export class AnalyticsService {
  /**
   * Get analytics dashboard data for Collector
   */
  static async getDashboardAnalytics(): Promise<AnalyticsDashboard> {
    try {
      // Get all cases
      const allCases = await CaseModel.find({});
      const totalCases = allCases.length;

      // Calculate status overview
      const statusOverview = await this.getStatusOverview(allCases);

      // Calculate delay analysis
      const delayAnalysis = await this.getDelayAnalysis(allCases);

      // Calculate rejection analysis
      const rejectionAnalysis = await this.getRejectionAnalysis(allCases);

      // Calculate additional metrics
      const activeCases = allCases.filter((c) => c.status !== 'closed').length;
      const closedCases = allCases.filter((c) => c.status === 'closed').length;
      const averageResolutionTime =
        await this.calculateAverageResolutionTime(allCases);

      return {
        statusOverview,
        delayAnalysis,
        rejectionAnalysis,
        totalCases,
        activeCases,
        closedCases,
        averageResolutionTime,
        lastUpdated: new Date(),
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError({
        STATUS: 500,
        TITLE: 'ANALYTICS_FAILED',
        MESSAGE: 'Failed to generate analytics dashboard',
      });
    }
  }

  /**
   * Calculate status overview with counts and percentages
   */
  private static async getStatusOverview(
    cases: Case[]
  ): Promise<StatusOverview[]> {
    const statusCounts: { [key: string]: number } = {};
    const totalCases = cases.length;

    // Count cases by status
    cases.forEach((caseDoc) => {
      const status = caseDoc.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Convert to array with percentages
    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: totalCases > 0 ? Math.round((count / totalCases) * 100) : 0,
    }));
  }

  /**
   * Calculate delay analysis for cases exceeding timelines
   */
  private static async getDelayAnalysis(cases: Case[]): Promise<DelayAnalysis> {
    const now = new Date();
    const criticalDelays: DelayAnalysis['criticalDelays'] = [];
    const stageDelays: {
      [key: number]: { count: number; totalDelay: number };
    } = {};

    cases.forEach((caseDoc) => {
      const createdAt = new Date(caseDoc.createdAt);
      const daysSinceCreation = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check for critical delays (>15 days total)
      if (daysSinceCreation > 15 && caseDoc.status !== 'closed') {
        criticalDelays.push({
          caseId: caseDoc.caseId,
          stage: caseDoc.stage,
          daysDelayed: daysSinceCreation - 15,
          status: caseDoc.status,
        });
      }

      // Calculate stage-specific delays (>2 days per stage)
      if (caseDoc.status !== 'closed') {
        const stageDelay = daysSinceCreation - caseDoc.stage * 2; // 2 days per stage
        if (stageDelay > 0) {
          if (!stageDelays[caseDoc.stage]) {
            stageDelays[caseDoc.stage] = { count: 0, totalDelay: 0 };
          }
          stageDelays[caseDoc.stage].count++;
          stageDelays[caseDoc.stage].totalDelay += stageDelay;
        }
      }
    });

    // Convert stage delays to array format
    const stageDelaysArray = Object.entries(stageDelays).map(
      ([stage, data]) => ({
        stage: parseInt(stage),
        delayedCount: data.count,
        averageDelay:
          data.count > 0 ? Math.round(data.totalDelay / data.count) : 0,
      })
    );

    return {
      totalDelayed: criticalDelays.length,
      stageDelays: stageDelaysArray,
      criticalDelays,
    };
  }

  /**
   * Calculate rejection analysis from remarks (only for non-closed cases)
   */
  private static async getRejectionAnalysis(
    cases: Case[]
  ): Promise<RejectionAnalysis> {
    const rejectionReasons: { [key: string]: number } = {};
    const rejectionsByStage: {
      [key: number]: { count: number; reasons: string[] };
    } = {};
    let totalRejections = 0;

    // Filter out closed cases - only analyze active cases
    const activeCases = cases.filter((caseDoc) => caseDoc.status !== 'closed');

    activeCases.forEach((caseDoc) => {
      if (caseDoc.remarks && caseDoc.remarks.length > 0) {
        caseDoc.remarks.forEach((remark) => {
          // Check if remark indicates rejection
          if (
            remark.remark.toLowerCase().includes('rejected') ||
            remark.remark.toLowerCase().includes('rejection')
          ) {
            totalRejections++;

            // Track rejection by stage
            if (!rejectionsByStage[remark.stage]) {
              rejectionsByStage[remark.stage] = { count: 0, reasons: [] };
            }
            rejectionsByStage[remark.stage].count++;
            rejectionsByStage[remark.stage].reasons.push(remark.remark);

            // Extract rejection reason (everything after "Rejected:" or "Rejection:")
            const reasonMatch = remark.remark.match(
              /(?:rejected|rejection):?\s*(.+)/i
            );
            if (reasonMatch) {
              const reason = reasonMatch[1].trim();
              rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
            }
          }
        });
      }
    });

    // Convert to array formats
    const rejectionsByStageArray = Object.entries(rejectionsByStage).map(
      ([stage, data]) => ({
        stage: parseInt(stage),
        count: data.count,
        reasons: data.reasons,
      })
    );

    const topRejectionReasons = Object.entries(rejectionReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 reasons

    return {
      totalRejections,
      rejectionsByStage: rejectionsByStageArray,
      topRejectionReasons,
    };
  }

  /**
   * Calculate average resolution time for closed cases
   */
  private static async calculateAverageResolutionTime(
    cases: Case[]
  ): Promise<number> {
    const closedCases = cases.filter((c) => c.status === 'closed');

    if (closedCases.length === 0) {
      return 0;
    }

    const totalResolutionTime = closedCases.reduce((total, caseDoc) => {
      const createdAt = new Date(caseDoc.createdAt);
      const updatedAt = new Date(caseDoc.updatedAt);
      const resolutionTime = Math.floor(
        (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      return total + resolutionTime;
    }, 0);

    return Math.round(totalResolutionTime / closedCases.length);
  }
}
