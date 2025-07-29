import { Request, Response } from 'express';
import { CaseService } from './cases.service';
import APIError from '@/lib/errors/APIError';
import Respond from '@/lib/respond';
import { PDFGenerator } from '@/lib/pdf-generator';
import { format } from 'date-fns';
import logger from '@/configs/logger';
import { Case, CaseModel } from './cases.model';
import { FilterQuery } from 'mongoose';
import env from '@/configs/env';
import PDFDocument from 'pdfkit';

export class CaseHandler {
  /**
   * Create a new case
   * POST /cases/create
   * Role: Tehsildar only
   */
  static async createCase(req: Request, res: Response) {
    try {
      if (!req.body) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'MISSING_REQUEST_BODY',
          MESSAGE: 'Request body is required',
        });
      }

      const { name, dob, dod, address, contact, description, caseSDM } =
        req.body;

      // Validate required fields
      if (!name || !dob || !dod || !address || !contact || !description) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'MISSING_REQUIRED_FIELDS',
          MESSAGE:
            'All fields are required: name, dob, dod, address, contact, description',
        });
      }

      logger.info('body', req.body);

      // Validate dates
      const dobDate = new Date(dob);
      const dodDate = new Date(dod);

      if (isNaN(dobDate.getTime()) || isNaN(dodDate.getTime())) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'INVALID_DATE_FORMAT',
          MESSAGE: 'Invalid date format. Use YYYY-MM-DD format',
        });
      }

      // Validate that date of death is not before date of birth
      if (dodDate <= dobDate) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'INVALID_DATE_RANGE',
          MESSAGE: 'Date of death must be after date of birth',
        });
      }

      // Validate contact format (basic validation)
      const contactRegex = /^(\+91)?[6-9]\d{9}$|^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!contactRegex.test(contact)) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'INVALID_CONTACT_FORMAT',
          MESSAGE:
            'Contact must be a valid Indian phone number or email address',
        });
      }

      // Get the SDM for this Tehsildar (from user session or lookup)
      const tehsildarSDM = caseSDM;

      if (!tehsildarSDM) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'MISSING_SDM_ASSIGNMENT',
          MESSAGE: 'Tehsildar must be assigned to an SDM to create cases',
        });
      }

      // Create case data object
      const caseData: any = {
        victim: {
          name,
          dob: dobDate,
          dod: dodDate,
          address,
          contact,
          description,
        },
        caseSDM: tehsildarSDM,
      };

      // Create the case
      const result = await CaseService.createCase(caseData);

      Respond(res, { caseId: result.caseId }, 201);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate PDF for a case
   * GET /cases/:id/pdf
   * Role: All authorized roles
   */
  static async generatePDF(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'MISSING_CASE_ID',
          MESSAGE: 'Case ID is required',
        });
      }

      // Get case from database
      const caseDoc = await CaseService.getCaseByCaseId(id);

      if (!caseDoc) {
        throw new APIError({
          STATUS: 404,
          TITLE: 'CASE_NOT_FOUND',
          MESSAGE: 'Case not found',
        });
      }

      // Generate PDF using government template
      const doc = PDFGenerator.generateCasePDF(caseDoc);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${caseDoc.caseId}.pdf"`
      );
      doc.pipe(res);
      doc.end();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all cases with pagination
   * GET /cases
   * Role: All authorized roles
   */
  static async getCases(req: Request, res: Response) {
    try {
      const { page, limit, search, ...query } = req.query;

      const pageNumber = parseInt(page as string) || 1;
      const limitNumber = parseInt(limit as string) || 10;

      if (pageNumber < 1 || limitNumber < 1 || limitNumber > 100) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'INVALID_PAGINATION',
          MESSAGE: 'Invalid pagination parameters',
        });
      }

      const result = await CaseService.getCases(
        pageNumber,
        limitNumber,
        (query as FilterQuery<Case>) || {},
        search as string
      );

      Respond(
        res,
        {
          ...result,
          message: 'Cases fetched successfully',
        },
        200
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get case by ID
   * GET /cases/:id
   * Role: All authorized roles
   */
  static async getCase(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'MISSING_CASE_ID',
          MESSAGE: 'Case ID is required',
        });
      }

      const caseDoc = await CaseService.getCaseByCaseId(id);

      if (!caseDoc) {
        throw new APIError({
          STATUS: 404,
          TITLE: 'CASE_NOT_FOUND',
          MESSAGE: 'Case not found',
        });
      }

      Respond(res, { ...caseDoc, message: 'Case fetched successfully' }, 200);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload documents for a case
   * POST /cases/:id/documents/upload
   * Role: Tehsildar only
   */
  static async uploadDocuments(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { patwari, ti } = req.body;

      if (!id) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'MISSING_CASE_ID',
          MESSAGE: 'Case ID is required',
        });
      }

      // Validate that at least one document array is provided
      if (
        (!patwari || !Array.isArray(patwari) || patwari.length === 0) &&
        (!ti || !Array.isArray(ti) || ti.length === 0)
      ) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'NO_DOCUMENTS_PROVIDED',
          MESSAGE:
            'At least one document array (patwari or ti) must be provided with valid URLs',
        });
      }

      // Get case from database
      let caseDoc = await CaseService.getCaseByCaseId(id);

      if (!caseDoc) {
        throw new APIError({
          STATUS: 404,
          TITLE: 'CASE_NOT_FOUND',
          MESSAGE: 'Case not found',
        });
      }

      // Validate case is in correct stage for document upload
      if (caseDoc.stage !== 1) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'INVALID_CASE_STAGE',
          MESSAGE:
            'Documents can only be uploaded for cases in Stage 1 (created)',
        });
      }

      // Validate URLs format
      const validateUrls = (urls: string[], type: string) => {
        if (!urls || !Array.isArray(urls)) return [];

        return urls.filter((url) => {
          if (
            typeof url !== 'string' ||
            !url.startsWith(env.FILE_URL + '/api/v1/files/')
          ) {
            throw new APIError({
              STATUS: 400,
              TITLE: 'INVALID_URL_FORMAT',
              MESSAGE: `Invalid URL format for ${type} documents. URLs must be from the file service.`,
            });
          }
          return true;
        });
      };

      const validatedPatwariUrls = validateUrls(patwari, 'patwari');
      const validatedTiUrls = validateUrls(ti, 'thana inspector');

      // Prepare document metadata
      const documents = {
        patwari: validatedPatwariUrls.map((url) => ({
          url,
          type: 'patwari',
          uploadedAt: new Date().toISOString(),
        })),
        ti: validatedTiUrls.map((url) => ({
          url,
          type: 'thana_inspector',
          uploadedAt: new Date().toISOString(),
        })),
      };

      // Upload documents and move to Stage 2 (pendingSDM)
      const newStage = 2;
      const newStatus = 'pendingSDM';
      const remark = `Documents uploaded - Patwari: ${validatedPatwariUrls.length}, TI: ${validatedTiUrls.length}`;

      // Update case with documents and change status
      await CaseService.updateCaseWithDocuments(
        caseDoc.caseId,
        documents,
        newStatus,
        newStage,
        remark,
        req.user?.id
      );

      Respond(
        res,
        {
          message: 'Documents uploaded successfully',
          caseId: caseDoc.caseId,
          documents: {
            patwari: documents.patwari.length,
            ti: documents.ti.length,
            total: documents.patwari.length + documents.ti.length,
          },
          newStatus: newStatus,
          newStage: newStage,
        },
        201
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update case workflow (approve/reject)
   * PUT /cases/:id/update
   * Role: SDM, Rahat Shakha, OIC, Additional Collector, Collector (based on stage)
   */
  static async updateCaseWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, remark } = req.body;

      if (!id) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'MISSING_CASE_ID',
          MESSAGE: 'Case ID is required',
        });
      }

      if (!status || !['approved', 'rejected'].includes(status)) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'INVALID_STATUS',
          MESSAGE: 'Status must be either "approved" or "rejected"',
        });
      }

      if (status === 'rejected' && !remark) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'MISSING_REMARK',
          MESSAGE: 'Remark is required for rejection',
        });
      }

      // Get case from database
      const caseDoc = await CaseService.getCaseByCaseId(id);

      if (!caseDoc) {
        throw new APIError({
          STATUS: 404,
          TITLE: 'CASE_NOT_FOUND',
          MESSAGE: 'Case not found',
        });
      }

      // Validate user has permission for current stage
      const userRole = req.user?.departmentRole;
      const currentStage = caseDoc.stage;

      const stageRoleMap = {
        1: 'tehsildar', // Tehsildar handles Stage 1 (creates case and uploads documents)
        2: 'sdm', // SDM handles Stage 2 (reviews documents)
        3: 'rahat-shakha', // Rahat Shakha handles Stage 3 (reviews)
        4: 'oic', // OIC handles Stage 4 (reviews)
        5: 'additional-collector', // Additional Collector handles Stage 5 (reviews)
        6: 'collector', // Collector handles Stage 6 (reviews) - OBEY starts here
        7: 'additional-collector', // Additional Collector handles Stage 7 (second approval) - OBEY
        8: 'tehsildar', // Tehsildar handles Stage 8 (distributes funds and closes) - OBEY
      };

      // Extended role map for backtracking cases
      const backtrackingRoleMap = {
        1: 'tehsildar', // Tehsildar can handle Stage 1 (returned from SDM)
        2: 'sdm', // SDM can handle Stage 2 (returned from Rahat Shakha)
        3: 'rahat-shakha', // Rahat Shakha can handle Stage 3 (returned from OIC)
        4: 'oic', // OIC can handle Stage 4 (returned from Additional Collector)
        5: 'additional-collector', // Additional Collector can handle Stage 5 (returned from Collector)
        // Stages 6-8 (OBEY orders) cannot reject
      };

      const requiredRole =
        stageRoleMap[currentStage as keyof typeof stageRoleMap];
      const backtrackingRole =
        backtrackingRoleMap[currentStage as keyof typeof backtrackingRoleMap];

      // Check if user has permission for current stage (either normal or backtracking)
      // Handle backward compatibility for 'sdm' role
      let effectiveUserRole = userRole;

      // Only map 'sdm' to 'rahat-shakha' if the required role is not 'sdm'
      if (userRole === 'sdm' && requiredRole !== 'sdm') {
        effectiveUserRole = 'rahat-shakha';
      }

      const hasPermission =
        (requiredRole && effectiveUserRole === requiredRole) ||
        (backtrackingRole && effectiveUserRole === backtrackingRole);

      if (!hasPermission) {
        throw new APIError({
          STATUS: 401,
          TITLE: 'UNAUTHORIZED_FOR_STAGE',
          MESSAGE: `User with role ${userRole} cannot update case in stage ${currentStage}. Required role: ${requiredRole || backtrackingRole}`,
        });
      }

      // For SDM stages (2), validate that the user has proper authorization
      if (currentStage === 2 && userRole === 'sdm') {
        // Additional validation can be added here if needed
        // For now, just ensure the user is SDM
      }

      // For Rahat Shakha stages (3), validate that the user has proper authorization
      if (currentStage === 3 && userRole === 'rahat-shakha') {
        // Additional validation can be added here if needed
        // For now, just ensure the user is Rahat Shakha
      }

      // For OIC stages (4), validate that the user has proper authorization
      if (currentStage === 4 && userRole === 'oic') {
        // Additional validation can be added here if needed
        // For now, just ensure the user is OIC
      }

      // For Additional Collector stages (5), validate that the user has proper authorization
      if (currentStage === 5 && userRole === 'additional-collector') {
        // Additional validation can be added here if needed
        // For now, just ensure the user is Additional Collector
      }

      // For Collector stages (6), validate that the user has proper authorization
      if (currentStage === 6 && userRole === 'collector') {
        // Additional validation can be added here if needed
        // For now, just ensure the user is Collector
      }

      // For Additional Collector 2 stages (7), validate that the user has proper authorization
      if (currentStage === 7 && userRole === 'additional-collector') {
        // Additional validation can be added here if needed
        // For now, just ensure the user is Additional Collector
      }

      // For Tehsildar stages (8), validate that the user has proper authorization
      if (currentStage === 8 && userRole === 'tehsildar') {
        // Additional validation can be added here if needed
        // For now, just ensure the user is Tehsildar
      }

      // Update case workflow
      const result = await CaseService.updateCaseWorkflow(
        caseDoc.caseId,
        status,
        remark,
        req.user?.id
      );

      Respond(
        res,
        {
          message: `Case ${status.toLowerCase()} successfully`,
          caseId: result.caseId,
          newStatus: result.status,
          newStage: result.stage,
          remark: remark || null,
        },
        200
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate final PDF for closed case
   * GET /cases/:id/final-pdf
   * Role: All authorized roles
   */
  static async generateFinalPDF(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'MISSING_CASE_ID',
          MESSAGE: 'Case ID is required',
        });
      }

      // Get case from database
      const caseDoc = await CaseService.getCaseByCaseId(id);

      if (!caseDoc) {
        throw new APIError({
          STATUS: 404,
          TITLE: 'CASE_NOT_FOUND',
          MESSAGE: 'Case not found',
        });
      }

      // Validate case is closed
      if (caseDoc.status !== 'closed' || caseDoc.stage !== 8) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'INVALID_CASE_STAGE',
          MESSAGE: 'Final PDF can only be generated for closed cases (Stage 8)',
        });
      }

      // Generate final PDF with payment details
      logger.info('Generating final PDF for case:', caseDoc.caseId);

      try {
        // Generate optimized final PDF with government styling
        const finalPDF = PDFGenerator.generateFinalCasePDF(caseDoc);

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=RAHAT-FINAL-${caseDoc.caseId}.pdf`
        );

        // Set timeout for PDF generation (30 seconds)
        const timeout = setTimeout(() => {
          if (!res.headersSent) {
            logger.error('PDF generation timeout for case:', caseDoc.caseId);
            res.status(408).json({
              error: 'PDF generation timeout',
              message: 'PDF generation took too long',
            });
          }
        }, 30000);

        // Handle PDF stream errors
        finalPDF.on('error', (error: any) => {
          clearTimeout(timeout);
          logger.error('PDF generation error:', error);
          if (!res.headersSent) {
            res.status(500).json({
              error: 'PDF generation failed',
              message: 'Failed to generate PDF',
            });
          }
        });

        // Handle PDF stream completion
        finalPDF.on('end', () => {
          clearTimeout(timeout);
          logger.info('PDF generation completed for case:', caseDoc.caseId);
        });

        // Stream PDF to client
        finalPDF.pipe(res);
      } catch (error) {
        logger.error('PDF generation failed:', error);
        throw new APIError({
          STATUS: 500,
          TITLE: 'PDF_GENERATION_FAILED',
          MESSAGE: 'Failed to generate final PDF',
        });
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Close case and mark funds distributed
   * PUT /cases/:id/close
   * Role: Tehsildar only (Stage 8)
   */
  static async closeCase(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { paymentRemark } = req.body;

      if (!id) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'MISSING_CASE_ID',
          MESSAGE: 'Case ID is required',
        });
      }

      if (!paymentRemark) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'MISSING_PAYMENT_REMARK',
          MESSAGE: 'Payment remark is required for case closure',
        });
      }

      // Get case from database
      const caseDoc = await CaseService.getCaseByCaseId(id);

      if (!caseDoc) {
        throw new APIError({
          STATUS: 404,
          TITLE: 'CASE_NOT_FOUND',
          MESSAGE: 'Case not found',
        });
      }

      // Validate user is Tehsildar
      const userRole = req.user?.departmentRole;
      if (userRole !== 'tehsildar') {
        throw new APIError({
          STATUS: 401,
          TITLE: 'UNAUTHORIZED_FOR_CLOSURE',
          MESSAGE: 'Only Tehsildar can close cases and mark funds distributed',
        });
      }

      // Check if case is already closed
      if (caseDoc.status === 'closed' && caseDoc.stage === 9) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'CASE_ALREADY_CLOSED',
          MESSAGE: 'Case is already closed and cannot be closed again',
        });
      }

      // Close the case with payment processing
      const result = await CaseService.closeCase(
        caseDoc.caseId,
        paymentRemark,
        req.user?.id
      );

      Respond(
        res,
        {
          message: 'Case closed successfully - Payment processed',
          caseId: result.caseId,
          status: result.status,
          stage: result.stage,
          payment: result.payment,
          finalPDFUrl: `/api/v1/cases/${result.caseId}/final-pdf`,
        },
        200
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fix closed case without payment details (utility endpoint)
   * PUT /cases/:id/fix-payment
   * Role: Tehsildar only
   */
  static async fixClosedCasePayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { paymentRemark } = req.body;

      if (!id) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'MISSING_CASE_ID',
          MESSAGE: 'Case ID is required',
        });
      }

      if (!paymentRemark) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'MISSING_PAYMENT_REMARK',
          MESSAGE: 'Payment remark is required',
        });
      }

      // Get case from database using Mongoose model directly
      const caseDoc = await CaseModel.findOne({ caseId: id });

      if (!caseDoc) {
        throw new APIError({
          STATUS: 404,
          TITLE: 'CASE_NOT_FOUND',
          MESSAGE: 'Case not found',
        });
      }

      // Validate user is Tehsildar
      const userRole = req.user?.departmentRole;
      if (userRole !== 'tehsildar') {
        throw new APIError({
          STATUS: 401,
          TITLE: 'UNAUTHORIZED_FOR_CLOSURE',
          MESSAGE: 'Only Tehsildar can fix payment details',
        });
      }

      // Check if case is closed but missing payment details
      if (caseDoc.status !== 'closed' || caseDoc.stage !== 8) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'INVALID_CASE_STAGE',
          MESSAGE: 'Case must be closed (Stage 8) to fix payment details',
        });
      }

      if (caseDoc.payment) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'PAYMENT_ALREADY_EXISTS',
          MESSAGE: 'Payment details already exist for this case',
        });
      }

      // Add payment details to closed case
      caseDoc.payment = {
        status: 'completed',
        amount: 150000, // ₹1.5 lakh
        remark: paymentRemark,
        date: new Date(),
        processedBy: req.user?.id || 'system',
      };

      // Add payment remark
      caseDoc.remarks.push({
        stage: 8,
        remark: `Payment details added: ${paymentRemark}`,
        userId: req.user?.id || 'system',
        date: new Date(),
      });

      await caseDoc.save();

      Respond(
        res,
        {
          message: 'Payment details added to closed case',
          caseId: caseDoc.caseId,
          status: caseDoc.status,
          stage: caseDoc.stage,
          payment: caseDoc.payment,
          finalPDFUrl: `${env.BASE_URL}/api/v1/cases/${caseDoc.caseId}/final-pdf`,
        },
        200
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get cases by user role (pending cases for approval/rejection)
   * GET /cases/my-pending
   * Role: All authorized roles
   */
  static async getMyPendingCases(req: Request, res: Response) {
    try {
      const { page, limit, search } = req.query;
      const userRole = req.user?.departmentRole;
      const userId = req.user?.id;

      if (!userRole) {
        throw new APIError({
          STATUS: 401,
          TITLE: 'UNAUTHORIZED',
          MESSAGE: 'User role not found',
        });
      }

      const pageNumber = parseInt(page as string) || 1;
      const limitNumber = parseInt(limit as string) || 10;

      if (pageNumber < 1 || limitNumber < 1 || limitNumber > 100) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'INVALID_PAGINATION',
          MESSAGE: 'Invalid pagination parameters',
        });
      }

      // Build query based on user role
      let query: any = {};
      let stageFilter: number | null = null;

      logger.info('userRole', userRole);
      switch (userRole) {
        case 'tehsildar':
          // Tehsildar sees cases they created (Stage 1) and cases pending closure (Stage 8)
          query = {
            $or: [
              {
                stage: 1,
                status: 'created',
                // Add filter to ensure they only see cases they created
                // This assumes we have a createdBy field or can filter by some user identifier
              },
              { stage: 8, status: 'pendingTehsildar' }, // Cases pending closure
            ],
          };
          break;

        case 'sdm':
          // SDM sees cases at Stage 2 (pending SDM review)
          stageFilter = 2;
          query = {
            $or: [
              { stage: 2, status: 'pendingSDM' }, // Cases pending SDM review
            ],
          };
          break;

        case 'rahat-shakha':
          // Rahat Shakha sees cases at Stage 3 (pending Rahat Shakha review)
          stageFilter = 3;
          query = {
            $or: [
              { stage: 3, status: 'pendingRahatShakha' }, // Cases pending Rahat Shakha review
            ],
          };
          break;

        case 'oic':
          // OIC sees cases at Stage 4 (pending OIC review)
          stageFilter = 4;
          query = {
            $or: [
              { stage: 4, status: 'pendingOIC' }, // Cases pending OIC review
            ],
          };
          break;

        case 'additional-collector':
          // Additional Collector sees cases at Stage 5 (first review) and Stage 7 (second review)
          query = {
            $or: [
              { stage: 5, status: 'pendingAdditionalCollector' }, // Cases pending Additional Collector review
              { stage: 7, status: 'pendingAdditionalCollector2' }, // Cases pending Additional Collector 2 review
            ],
          };
          break;

        case 'collector':
          // Collector sees cases at Stage 6 (pending Collector review)
          stageFilter = 6;
          query = {
            $or: [
              { stage: 6, status: 'pendingCollector' }, // Cases pending Collector review
            ],
          };
          break;

        case 'sdm':
          // SDM role is deprecated but we'll map them to Rahat Shakha access for backward compatibility
          stageFilter = 2;
          query = {
            $or: [
              { stage: 2, status: 'pendingRahatShakha' }, // New cases from Tehsildar
              { stage: 3, status: 'pendingOIC' }, // Returned from OIC
            ],
          };
          break;

        default:
          throw new APIError({
            STATUS: 400,
            TITLE: 'INVALID_ROLE',
            MESSAGE: 'Invalid user role for case management',
          });
      }

      // Debug logging
      logger.info('Query for pending cases:', JSON.stringify(query, null, 2));

      const result = await CaseService.getCases(
        pageNumber,
        limitNumber,
        query,
        search as string
      );

      // Add role-specific information to response
      const responseData = {
        ...result,
        userRole,
        stageFilter,
        message: `Pending cases for ${userRole} role`,
      };

      Respond(res, responseData, 200);
    } catch (error) {
      throw error;
    }
  }
}
