# Cases Module API Documentation

## Overview

The Cases module handles case creation, document management, and workflow progression for Project Rahat's financial assistance cases.

## Endpoints

### 1. Create Case

**POST** `/api/v1/cases/create`

**Role:** Tehsildar only

**Request Body:**

```json
{
  "name": "John Doe",
  "dob": "1990-01-15",
  "dod": "2024-07-28",
  "address": "123 Main Street, Raipur, Chhattisgarh",
  "contact": "+919876543210",
  "description": "Drowning accident in local pond"
}
```

**Note:** The system automatically assigns the case to the Tehsildar's appointed SDM (`caseSDM` field).

**Response:**

```json
{
  "caseId": "RAHAT-2025-2807-0001"
}
```

### 2. Generate PDF

**GET** `/api/v1/cases/:id/pdf`

**Role:** All authorized roles

**Response:** PDF file stream with government-style template

### 3. Get All Cases

**GET** `/api/v1/cases`

**Role:** All authorized roles

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search term for case ID, victim name, address, contact, or description

**Response:**

```json
{
  "cases": [...],
  "total": 150,
  "page": 1,
  "totalPages": 15,
  "message": "Cases fetched successfully"
}
```

### 3.5. Get My Pending Cases

**GET** `/api/v1/cases/my-pending`

**Role:** All authorized roles (role-based filtering)

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search term for case ID, victim name, address, contact, or description

**Role-Specific Cases:**

- **Tehsildar:** Cases they created (Stage 1) + Cases pending closure (Stage 8)
- **SDM:** Cases at Stage 2 (pending SDM review)
- **Rahat Shakha:** Cases at Stage 3 (pending Rahat Shakha review)
- **OIC:** Cases at Stage 4 (pending OIC review)
- **Additional Collector:** Cases at Stage 5 (first review) + Cases at Stage 7 (second review)
- **Collector:** Cases at Stage 6 (pending Collector review)

**Response:**

```json
{
  "cases": [...],
  "total": 5,
  "page": 1,
  "totalPages": 1,
  "userRole": "sdm",
  "stageFilter": 2,
  "message": "Pending cases for sdm role"
}
```

### 4. Get Case by ID

**GET** `/api/v1/cases/:id`

**Role:** All authorized roles

**Response:**

```json
{
  "caseId": "RAHAT-2025-2807-0001",
  "victim": {...},
  "status": "created",
  "stage": 1,
  "documents": [...],
  "remarks": [...],
  "message": "Case fetched successfully"
}
```

### 5. Upload Documents

**POST** `/api/v1/cases/:id/documents/upload`

**Role:** Tehsildar only (Stage 1)

**Request Body:**

```json
{
  "patwari": [
    "http://localhost:3034/api/v1/files/6887e3465dfd05c35ab06333/serve"
  ],
  "ti": ["http://localhost:3034/api/v1/files/6887e3465dfd05c35ab06333/serve"]
}
```

**Response:**

```json
{
  "message": "Documents uploaded successfully",
  "caseId": "RAHAT-2025-2807-0001",
  "documents": {
    "patwari": 1,
    "ti": 1,
    "total": 2
  },
  "newStatus": "pendingSDM",
  "newStage": 2
}
```

**Features:**

- ✅ **Document Replacement:** New documents completely replace old ones
- ✅ **No Accumulation:** Previous documents are removed when new ones are uploaded
- ✅ **Clean State:** Each upload starts with a fresh document set

### 6. Update Case Workflow

**PUT** `/api/v1/cases/:id/update`

**Role:** Role-based access based on current stage:

- Stage 1: Tehsildar (`tehsildar`) - Creates case and uploads documents
- Stage 2: SDM (`sdm`) - Reviews documents
- Stage 3: Rahat Shakha (`rahat-shakha`) - Reviews case
- Stage 4: OIC (`oic`) - Reviews case
- Stage 5: Additional Collector (`additional-collector`) - Reviews case
- Stage 6: Collector (`collector`) - Reviews case (OBEY starts here)
- Stage 7: Additional Collector (`additional-collector`) - Second review (OBEY)
- Stage 8: Tehsildar (`tehsildar`) - Distributes funds and closes case (OBEY)

**Request Body:**

```json
{
  "status": "approved",
  "remark": "All documents verified and approved"
}
```

**Response:**

```json
{
  "message": "Case approved successfully",
  "caseId": "RAHAT-2025-2807-0001",
  "newStatus": "pendingRahatShakha",
  "newStage": 3,
  "remark": "All documents verified and approved"
}
```

### 7. Generate Final PDF

**GET** `/api/v1/cases/:id/final-pdf`

**Role:** All authorized roles

**Description:** Generate final PDF with payment details and closure certificate for closed cases.

**Response:** PDF file download

**Features:**

- ✅ Only works for closed cases (Stage 8, status: `closed`)
- ✅ Includes payment details and closure certificate
- ✅ Government-style formatting
- ✅ Automatic filename: `RAHAT-FINAL-{caseId}.pdf`

### 8. Close Case and Mark Funds Distributed

**PUT** `/api/v1/cases/:id/close`

**Role:** Tehsildar only (Stage 8)

**Request Body:**

```json
{
  "paymentRemark": "₹1.5 lakh transferred on 28-07-2025"
}
```

**Response:**

```json
{
  "message": "Case closed successfully - Payment processed",
  "caseId": "RAHAT-2025-2807-0001",
  "status": "closed",
  "stage": 8,
  "payment": {
    "status": "Completed",
    "amount": 150000,
    "remark": "₹1.5 lakh transferred on 28-07-2025",
    "date": "2025-01-30T10:30:00.000Z",
    "processedBy": "tehsildar_user_id"
  },
  "finalPDFUrl": "/api/v1/cases/RAHAT-2025-2807-0001/final-pdf"
}
```

**Features:**

- ✅ Validates case is in Stage 8 with `pendingTehsildar` status
- ✅ Records payment details (₹1.5 lakh amount)
- ✅ Updates case status to `closed`
- ✅ Creates audit trail with payment processing details
- ✅ Returns URL to generate final PDF separately

## Workflow Stages

### Stage Progression:

1. **Stage 1:** Created Waiting for Documents (Tehsildar creates case and uploads documents)
2. **Stage 2:** SDM Review Pending (SDM reviews documents)
3. **Stage 3:** Rahat Shakha Review Pending (Rahat Shakha reviews case)
4. **Stage 4:** OIC Review Pending (OIC reviews case)
5. **Stage 5:** Additional Collector Review Pending (Additional Collector reviews case)
6. **Stage 6:** Collector Review Pending (Collector reviews case) - **OBEY** starts here
7. **Stage 7:** Additional Collector Job Pending (Additional Collector second review) - **OBEY**
8. **Stage 8:** Tehsildar distributes funds and closes case - **OBEY**

### Status Values:

- `created` - Initial case creation
- `pendingSDM` - Waiting for SDM review
- `pendingRahatShakha` - Waiting for Rahat Shakha review
- `pendingOIC` - Waiting for OIC review
- `pendingAdditionalCollector` - Waiting for Additional Collector review
- `pendingCollector` - Waiting for Collector review
- `pendingAdditionalCollector2` - Waiting for Additional Collector 2 review
- `pendingTehsildar` - Waiting for Tehsildar to close case and distribute funds
- `rejected` - Case rejected
- `closed` - Case closed (funds distributed)

### Role Responsibilities:

- **Tehsildar:**
  - Stage 1: Creates case and uploads documents
  - Stage 8: Distributes funds and closes case
- **SDM:**
  - Stage 2: Reviews documents
- **Rahat Shakha:**
  - Stage 3: Reviews case
- **OIC:**
  - Stage 4: Reviews case
- **Additional Collector:**
  - Stage 5: First review
  - Stage 7: Second review (OBEY)
- **Collector:**
  - Stage 6: Final review (OBEY starts here)

### OBEY Orders:

After Collector approval (Stage 6), no rejection is allowed. The workflow becomes an "OBEY" order where:

- Stage 7: Additional Collector must approve
- Stage 8: Tehsildar must distribute funds and close

### Rejection Workflow:

- **Stages 1-6 can reject** → Case goes back to previous stage
- **Stages 7-8 (OBEY orders):** No rejection allowed
- **Simple backtracking:** Each rejection moves case back one stage

## Error Handling

All endpoints return standardized error responses:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**

- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid role)
- `404` - Not Found (case not found)
- `409` - Conflict (duplicate case ID)
- `500` - Internal Server Error

## Security Features

- **Role-Based Access Control:** Each endpoint enforces appropriate role restrictions
- **Input Validation:** All inputs are validated using Zod schemas
- **Error Logging:** Comprehensive error logging for debugging
- **Case ID Uniqueness:** Ensures unique case IDs with retry logic
