# Analytics Module

This module provides real-time analytics and dashboard functionality for the Collector to monitor case progress and performance.

## Endpoints

### 1. Analytics Dashboard

**GET** `/api/v1/analytics/dashboard`

**Role:** Collector only

**Description:** Provides comprehensive analytics data for the Collector's dashboard including case status overview, delay analysis, and rejection patterns.

**Response:**

```json
{
  "message": "Analytics dashboard generated successfully",
  "data": {
    "statusOverview": [
      {
        "status": "created",
        "count": 15,
        "percentage": 25
      },
      {
        "status": "pendingSDM",
        "count": 12,
        "percentage": 20
      },
      {
        "status": "closed",
        "count": 20,
        "percentage": 33
      }
    ],
    "delayAnalysis": {
      "totalDelayed": 5,
      "stageDelays": [
        {
          "stage": 2,
          "delayedCount": 3,
          "averageDelay": 4
        },
        {
          "stage": 3,
          "delayedCount": 2,
          "averageDelay": 6
        }
      ],
      "criticalDelays": [
        {
          "caseId": "RAHAT-2025-2807-0001",
          "stage": 2,
          "daysDelayed": 8,
          "status": "pendingSDM"
        }
      ]
    },
    "rejectionAnalysis": {
      "totalRejections": 8,
      "rejectionsByStage": [
        {
          "stage": 2,
          "count": 5,
          "reasons": [
            "Rejected: Need more details in case",
            "Rejected: Documents incomplete"
          ]
        },
        {
          "stage": 3,
          "count": 3,
          "reasons": ["Rejected: Verification required"]
        }
      ],
      "topRejectionReasons": [
        {
          "reason": "Need more details in case",
          "count": 3
        },
        {
          "reason": "Documents incomplete",
          "count": 2
        }
      ]
    },
    "totalCases": 60,
    "activeCases": 40,
    "closedCases": 20,
    "averageResolutionTime": 12,
    "lastUpdated": "2025-07-29T06:00:00.000Z"
  }
}
```

**Features:**

- ✅ **Status Overview:** Count and percentage of cases by status
- ✅ **Delay Analysis:** Cases exceeding 15-day total timeline or 2-day per-stage timeline
- ✅ **Rejection Analysis:** Rejection patterns by stage with reasons (active cases only)
- ✅ **Performance Metrics:** Average resolution time and case counts
- ✅ **Real-time Data:** Live analytics from MongoDB case collection
- ✅ **Role-based Access:** Collector-only access with RBAC validation

## Analytics Metrics

### Status Overview

- Counts cases by current status (created, pendingSDM, pendingRahatShakha, etc.)
- Calculates percentage distribution across all statuses
- Helps identify bottlenecks in workflow

### Delay Analysis

- **Critical Delays:** Cases exceeding 15-day total resolution target
- **Stage Delays:** Cases exceeding 2-day per-stage timeline
- **Average Delay:** Calculates average delay per stage
- **Case Details:** Lists specific delayed cases with details

### Rejection Analysis

- **Total Rejections:** Overall rejection count across all stages (active cases only)
- **Stage-wise Rejections:** Rejection count and reasons by stage (active cases only)
- **Top Reasons:** Most common rejection reasons (top 10)
- **Pattern Analysis:** Helps identify recurring issues in active cases
- **Active Cases Only:** Excludes closed cases since they have been successfully processed

### Performance Metrics

- **Total Cases:** Overall case count
- **Active Cases:** Non-closed cases
- **Closed Cases:** Successfully completed cases
- **Average Resolution Time:** Average days to close a case

## Usage Examples

### Get Dashboard Analytics

```bash
GET /api/v1/analytics/dashboard
Authorization: Bearer <collector_jwt_token>
```

### Response Analysis

```javascript
// Check for critical delays
const criticalDelays = response.data.delayAnalysis.criticalDelays;
if (criticalDelays.length > 0) {
  console.log('Critical delays detected:', criticalDelays);
}

// Check rejection patterns
const topReasons = response.data.rejectionAnalysis.topRejectionReasons;
console.log('Most common rejection reasons:', topReasons);

// Check workflow efficiency
const avgResolutionTime = response.data.averageResolutionTime;
console.log('Average resolution time:', avgResolutionTime, 'days');
```

## Error Handling

- **401 Unauthorized:** Non-Collector users attempting to access
- **500 Internal Server Error:** Analytics calculation failures
- **Validation Errors:** Invalid data or calculation errors

## Performance Considerations

- **Caching:** Consider implementing Redis caching for large datasets
- **Pagination:** For very large case volumes, consider paginated analytics
- **Real-time Updates:** WebSocket integration for live dashboard updates
- **Data Retention:** Historical analytics for trend analysis
