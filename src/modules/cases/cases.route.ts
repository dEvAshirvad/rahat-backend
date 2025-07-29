import { createRouter } from '@/configs/server.config';
import { CaseHandler } from './cases.handler';
import requireUser from '@/middlewares/requireUser';
import requireTehsildar from '@/middlewares/requireTehsildar';

const router = createRouter();

// Case creation - Tehsildar only
router.post('/create', requireUser, requireTehsildar, CaseHandler.createCase);

// Get all cases with pagination
router.get('/', requireUser, CaseHandler.getCases);

// Get my pending cases (role-based)
router.get('/my-pending', requireUser, CaseHandler.getMyPendingCases);

// Get case by ID
router.get('/:id', requireUser, CaseHandler.getCase);

// Generate PDF for case
router.get('/:id/pdf', requireUser, CaseHandler.generatePDF);

// Generate final PDF for closed case
router.get('/:id/final-pdf', requireUser, CaseHandler.generateFinalPDF);

// Upload documents for case - Tehsildar only
router.post(
  '/:id/documents/upload',
  requireUser,
  requireTehsildar,
  CaseHandler.uploadDocuments
);

// Update case workflow (approve/reject) - Role-based access
router.put('/:id/update', requireUser, CaseHandler.updateCaseWorkflow);

// Close case and mark funds distributed - Tehsildar only (Stage 8)
router.put('/:id/close', requireUser, requireTehsildar, CaseHandler.closeCase);

// Fix payment details for closed case - Tehsildar only (utility endpoint)
router.put(
  '/:id/fix-payment',
  requireUser,
  requireTehsildar,
  CaseHandler.fixClosedCasePayment
);

export default router;
