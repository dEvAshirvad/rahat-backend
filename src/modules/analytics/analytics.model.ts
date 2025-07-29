import { z } from 'zod';

// Analytics response schemas
export const zStatusOverview = z.object({
  status: z.string(),
  count: z.number(),
  percentage: z.number(),
});

export const zDelayAnalysis = z.object({
  totalDelayed: z.number(),
  stageDelays: z.array(
    z.object({
      stage: z.number(),
      delayedCount: z.number(),
      averageDelay: z.number(),
    })
  ),
  criticalDelays: z.array(
    z.object({
      caseId: z.string(),
      stage: z.number(),
      daysDelayed: z.number(),
      status: z.string(),
    })
  ),
});

export const zRejectionAnalysis = z.object({
  totalRejections: z.number(),
  rejectionsByStage: z.array(
    z.object({
      stage: z.number(),
      count: z.number(),
      reasons: z.array(z.string()),
    })
  ),
  topRejectionReasons: z.array(
    z.object({
      reason: z.string(),
      count: z.number(),
    })
  ),
});

export const zAnalyticsDashboard = z.object({
  statusOverview: z.array(zStatusOverview),
  delayAnalysis: zDelayAnalysis,
  rejectionAnalysis: zRejectionAnalysis,
  totalCases: z.number(),
  activeCases: z.number(),
  closedCases: z.number(),
  averageResolutionTime: z.number(),
  lastUpdated: z.date(),
});

// TypeScript types
export type StatusOverview = z.infer<typeof zStatusOverview>;
export type DelayAnalysis = z.infer<typeof zDelayAnalysis>;
export type RejectionAnalysis = z.infer<typeof zRejectionAnalysis>;
export type AnalyticsDashboard = z.infer<typeof zAnalyticsDashboard>;
