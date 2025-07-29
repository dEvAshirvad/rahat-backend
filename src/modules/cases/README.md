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

- **Tehsildar:** Cases they created (Stage 1) + Cases needing document fixes (Stage 2) + Cases pending closure (Stage 9)
- **SDM:** Cases at Stage 3 (new) + Cases at Stage 4 (returned from Rahat Shakha)
- **Rahat Shakha:** Cases at Stage 4 (new) + Cases at Stage 5 (returned from OIC)
- **OIC:** Cases at Stage 5 (new) + Cases at Stage 6 (returned from Additional Collector)
- **Additional Collector:** Cases at Stage 6 (new) + Cases at Stage 7 (returned from Collector) + Cases at Stage 8 (second approval)
- **Collector:** Cases at Stage 7 (new) + Cases at Stage 8 (returned from Additional Collector 2)

**Response:**

```json
{
  "cases": [...],
  "total": 5,
  "page": 1,
  "totalPages": 1,
  "userRole": "sdm",
  "stageFilter": 3,
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

- Stage 2: SDM (`sdm`) - Only the assigned SDM can approve
- Stage 3: Rahat Shakha (`rahat-shakha`)
- Stage 4: OIC (`oic`)
- Stage 5: Additional Collector (`additional-collector`)
- Stage 6: Collector (`collector`)
- Stage 7: Additional Collector (`additional-collector`)
- Stage 8: Tehsildar (`tehsildar`)

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
  "newStage": 4,
  "remark": "All documents verified and approved"
}
```

### 7. Generate Final PDF

**GET** `/api/v1/cases/:id/final-pdf`

**Role:** All authorized roles

**Description:** Generate final PDF with payment details and closure certificate for closed cases.

**Response:** PDF file download

**Features:**

- ✅ Only works for closed cases (Stage 9, status: `closed`)
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
  "stage": 9,
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

1. **Stage 1:** Created (Tehsildar creates case or if SDM rejects)
2. **Stage 2:** Pending SDM (Tehsildar uploads docs or if Rahat Shakha rejects)
3. **Stage 3:** Pending Rahat Shakha (SDM approved or if OIC rejects)
4. **Stage 4:** Pending OIC (Rahat Shakha approved or if Additional Collector rejects)
5. **Stage 5:** Pending Additional Collector (OIC approved or if Collector rejects)
6. **Stage 6:** Pending Collector (Additional Collector approved - **OBEY**)
7. **Stage 7:** Pending Additional Collector 2 (Collector approved - **OBEY**)
8. **Stage 8:** Pending Tehsildar (Additional Collector 2 approved - **OBEY**)
9. **Stage 9:** Closed (Tehsildar marks funds distributed)

### Status Values:

- `created` - Initial case creation
- `pendingSDM` - Waiting for assigned SDM review
- `pendingRahatShakha` - Waiting for Rahat Shakha review
- `pendingOIC` - Waiting for OIC review
- `pendingAdditionalCollector` - Waiting for Additional Collector review
- `pendingCollector` - Waiting for Collector review (OBEY)
- `pendingAdditionalCollector2` - Waiting for second Additional Collector review (OBEY)
- `pendingTehsildar` - Waiting for Tehsildar to close case and distribute funds (OBEY)
- `rejected` - Case rejected
- `closed` - Case closed (funds distributed)

### Case Assignment:

- **caseSDM:** Each case is automatically assigned to the Tehsildar's appointed SDM
- **SDM Validation:** Only the assigned SDM can approve cases at Stage 3
- **Hierarchy:** Tehsildar → Assigned SDM → Other roles (single user each)

### Simplified Workflow:

1. **Stage 1:** Tehsildar creates case
2. **Stage 2:** Tehsildar uploads documents → SDM reviews
3. **Stage 3:** SDM approves → Rahat Shakha reviews
4. **Stage 4:** Rahat Shakha approves → OIC reviews
5. **Stage 5:** OIC approves → Additional Collector reviews
6. **Stage 6:** Additional Collector approves → **Collector reviews (OBEY)**
7. **Stage 7:** Collector approves → **Additional Collector 2 reviews (OBEY)**
8. **Stage 8:** Additional Collector 2 approves → **Tehsildar closes (OBEY)**
9. **Stage 9:** Tehsildar distributes funds and closes case

### Rejection Workflow:

- **Any stage can reject** → Case goes back to previous stage
- **Collector onwards (Stages 6-8):** No rejection allowed - **OBEY** orders
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
