import { PaginatedResult } from '@/types/global';
import {
  CaseModel,
  zCaseCreate,
  type Case,
  type CaseCreate,
} from './cases.model';
import APIError from '@/lib/errors/APIError';
import logger from '@/configs/logger';
import { FilterQuery } from 'mongoose';

export class CaseService {
  /**
   * Generate a unique case ID in format: RAHAT-YYYY-DDMM-NNNN
   */
  private static generateCaseId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    return `RAHAT-${year}-${day}${month}-${random}`;
  }

  /**
   * Create a new case with validation and unique case ID generation
   */
  static async createCase(
    caseData: Partial<CaseCreate>
  ): Promise<{ caseId: string }> {
    try {
      // Validate input data
      const validatedData = zCaseCreate.partial().parse(caseData);

      logger.info('validatedData', validatedData);

      // Generate unique case ID with retry logic
      let caseId: string;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        caseId = this.generateCaseId();
        attempts++;

        // Check if case ID already exists
        const existingCase = await CaseModel.findOne({ caseId });
        if (!existingCase) break;

        if (attempts >= maxAttempts) {
          throw new APIError({
            STATUS: 500,
            TITLE: 'CASE_ID_GENERATION_FAILED',
            MESSAGE:
              'Failed to generate unique case ID after multiple attempts',
          });
        }
      } while (true);

      // Create the case
      const newCase = new CaseModel({
        ...validatedData,
        caseId,
        status: 'created',
        stage: 1,
        documents: [],
        remarks: [],
      });

      await newCase.save();

      // TODO: Send notification to contact
      // await this.sendNotification(caseId, validatedData.victim.contact);

      return { caseId };
    } catch (error) {
      if ((error as any).code === 11000) {
        // Duplicate case ID (shouldn't happen with our retry logic, but just in case)
        throw new APIError({
          STATUS: 409,
          TITLE: 'DUPLICATE_CASE_ID',
          MESSAGE: 'Case ID already exists. Please try again.',
        });
      }
      throw error;
    }
  }

  /**
   * Get case by case ID
   */
  static async getCaseByCaseId(caseId: string): Promise<Case | null> {
    try {
      const caseDoc = await CaseModel.findOne({ caseId }).lean();
      return caseDoc;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all cases with pagination
   */
  static async getCases(
    page: number = 1,
    limit: number = 10,
    query: FilterQuery<Case> = {},
    search: string = ''
  ): Promise<PaginatedResult<Case>> {
    try {
      const skip = (page - 1) * limit;

      // Build the final query
      let finalQuery = { ...query };

      // Add search functionality if search term is provided
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        if (finalQuery.$and) {
          finalQuery.$and.push({
            $or: [
              { 'victim.name': { $regex: searchRegex } },
              { 'victim.contact': { $regex: searchRegex } },
              { caseId: { $regex: searchRegex } },
            ],
          });
        } else {
          finalQuery.$and = [
            {
              $or: [
                { 'victim.name': { $regex: searchRegex } },
                { 'victim.contact': { $regex: searchRegex } },
                { caseId: { $regex: searchRegex } },
              ],
            },
          ];
        }
      }

      const [cases, total] = await Promise.all([
        CaseModel.find(finalQuery)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        CaseModel.countDocuments(finalQuery),
      ]);

      return {
        docs: cases,
        limit,
        totalDocs: total,
        totalPages: Math.ceil(total / limit),
        page,
        nextPage: page < Math.ceil(total / limit),
        prevPage: page > 1,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update case status and stage
   */
  static async updateCaseStatus(
    caseId: string,
    status:
      | 'created'
      | 'pendingSDM'
      | 'pendingRahatShakha'
      | 'pendingOIC'
      | 'pendingAdditionalCollector'
      | 'pendingCollector'
      | 'pendingAdditionalCollector2'
      | 'pendingTehsildar'
      | 'closed'
      | 'rejected',
    stage: number,
    remark?: string,
    userId?: string
  ): Promise<Case> {
    try {
      const caseDoc = await CaseModel.findOne({ caseId });
      if (!caseDoc) {
        throw new APIError({
          STATUS: 404,
          TITLE: 'CASE_NOT_FOUND',
          MESSAGE: 'Case not found',
        });
      }

      caseDoc.status = status;
      caseDoc.stage = stage;

      if (remark && userId) {
        caseDoc.remarks.push({
          stage,
          remark,
          userId,
          date: new Date(),
        });
      }

      await caseDoc.save();
      return caseDoc;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError({
        STATUS: 500,
        TITLE: 'CASE_UPDATE_FAILED',
        MESSAGE: 'Failed to update case',
      });
    }
  }

  /**
   * Update case with documents and change status
   */
  static async updateCaseWithDocuments(
    caseId: string,
    documents: {
      patwari: Array<{ url: string; type: string; uploadedAt: string }>;
      ti: Array<{ url: string; type: string; uploadedAt: string }>;
    },
    status: 'pendingSDM',
    stage: number,
    remark?: string,
    userId?: string
  ): Promise<Case> {
    try {
      const caseDoc = await CaseModel.findOne({ caseId });
      if (!caseDoc) {
        throw new APIError({
          STATUS: 404,
          TITLE: 'CASE_NOT_FOUND',
          MESSAGE: 'Case not found',
        });
      }

      // Update case status and stage
      caseDoc.status = status;
      caseDoc.stage = stage;

      // Replace all documents (don't add to existing ones)
      caseDoc.documents = [];

      // Add patwari documents
      documents.patwari.forEach((doc) => {
        caseDoc.documents.push({
          url: doc.url,
          type: doc.type,
          uploadedAt: doc.uploadedAt,
        });
      });

      // Add TI documents
      documents.ti.forEach((doc) => {
        caseDoc.documents.push({
          url: doc.url,
          type: doc.type,
          uploadedAt: doc.uploadedAt,
        });
      });

      // Add remark
      if (remark && userId) {
        caseDoc.remarks.push({
          stage,
          remark,
          userId,
          date: new Date(),
        });
      }

      await caseDoc.save();
      return caseDoc;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError({
        STATUS: 500,
        TITLE: 'CASE_UPDATE_FAILED',
        MESSAGE: 'Failed to update case with documents',
      });
    }
  }

  /**
   * Update case workflow (approve/reject)
   */
  static async updateCaseWorkflow(
    caseId: string,
    status: 'approved' | 'rejected',
    remark?: string,
    userId?: string
  ): Promise<Case> {
    try {
      const caseDoc = await CaseModel.findOne({ caseId });
      if (!caseDoc) {
        throw new APIError({
          STATUS: 404,
          TITLE: 'CASE_NOT_FOUND',
          MESSAGE: 'Case not found',
        });
      }

      const currentStage = caseDoc.stage;

      if (status === 'approved') {
        // Handle approval workflow
        const workflowMap = {
          1: { status: 'pendingSDM', stage: 2 }, // Tehsildar uploads documents, goes to SDM
          2: { status: 'pendingRahatShakha', stage: 3 }, // SDM approves, goes to Rahat Shakha
          3: { status: 'pendingOIC', stage: 4 }, // Rahat Shakha approves, goes to OIC
          4: { status: 'pendingAdditionalCollector', stage: 5 }, // OIC approves, goes to Additional Collector
          5: { status: 'pendingCollector', stage: 6 }, // Additional Collector approves, goes to Collector
          6: { status: 'pendingAdditionalCollector2', stage: 7 }, // Collector approves, goes to Additional Collector 2
          7: { status: 'pendingTehsildar', stage: 8 }, // Additional Collector 2 approves, goes to Tehsildar
          8: { status: 'closed', stage: 8 }, // Tehsildar distributes funds and closes
        };

        const nextStep = workflowMap[currentStage as keyof typeof workflowMap];

        if (!nextStep) {
          throw new APIError({
            STATUS: 400,
            TITLE: 'INVALID_STAGE_FOR_APPROVAL',
            MESSAGE: `Cannot approve case in stage ${currentStage}`,
          });
        }

        caseDoc.status = nextStep.status as any;
        caseDoc.stage = nextStep.stage;

        // Add approval remark
        if (remark) {
          caseDoc.remarks.push({
            stage: currentStage,
            remark: `Approved: ${remark}`,
            userId: userId || 'system',
            date: new Date(),
          });
        } else {
          caseDoc.remarks.push({
            stage: currentStage,
            remark: 'Approved',
            userId: userId || 'system',
            date: new Date(),
          });
        }
      } else if (status === 'rejected') {
        // Handle rejection workflow
        if (!remark) {
          throw new APIError({
            STATUS: 400,
            TITLE: 'MISSING_REJECTION_REMARK',
            MESSAGE: 'Remark is required for rejection',
          });
        }

        // Count rejections for current stage
        const stageRejections = caseDoc.remarks.filter(
          (r) =>
            r.stage === currentStage &&
            r.remark.toLowerCase().includes('rejected')
        ).length;

        // Add rejection remark
        caseDoc.remarks.push({
          stage: currentStage,
          remark: `Rejected: ${remark}`,
          userId: userId || 'system',
          date: new Date(),
        });

        // Check if this is the third rejection
        if (stageRejections >= 2) {
          // Escalate to Collector (Stage 6) - OBEY order
          caseDoc.status = 'pendingCollector';
          caseDoc.stage = 6;

          caseDoc.remarks.push({
            stage: 7,
            remark: 'Escalated to Collector due to multiple rejections',
            userId: 'system',
            date: new Date(),
          });
        } else {
          // Handle rejection based on current stage - backtrack to previous stage
          const rejectionMap = {
            2: { stage: 1, status: 'created', role: 'SDM' }, // SDM rejects → back to Tehsildar
            3: { stage: 2, status: 'pendingSDM', role: 'Rahat Shakha' }, // Rahat Shakha rejects → back to SDM
            4: { stage: 3, status: 'pendingRahatShakha', role: 'OIC' }, // OIC rejects → back to Rahat Shakha
            5: { stage: 4, status: 'pendingOIC', role: 'Additional Collector' }, // Additional Collector rejects → back to OIC
            6: {
              stage: 5,
              status: 'pendingAdditionalCollector',
              role: 'Collector',
            }, // Collector rejects → back to Additional Collector
            // Stages 7-8 (OBEY orders) cannot reject
          };

          const rejectionStep =
            rejectionMap[currentStage as keyof typeof rejectionMap];

          if (rejectionStep) {
            caseDoc.stage = rejectionStep.stage;
            caseDoc.status = rejectionStep.status as any;
            caseDoc.remarks.push({
              stage: rejectionStep.stage,
              remark: `Rejected by ${rejectionStep.role}: ${remark} - Case returned to previous stage`,
              userId: userId || 'system',
              date: new Date(),
            });
          } else {
            // Fallback for any unexpected stage
            caseDoc.status = 'rejected';
          }
        }
      }

      await caseDoc.save();
      return caseDoc;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError({
        STATUS: 500,
        TITLE: 'WORKFLOW_UPDATE_FAILED',
        MESSAGE: 'Failed to update case workflow',
      });
    }
  }

  /**
   * Close case and mark funds distributed (Stage 9)
   */
  static async closeCase(
    caseId: string,
    paymentRemark: string,
    userId?: string
  ): Promise<Case> {
    try {
      const caseDoc = await CaseModel.findOne({ caseId });
      if (!caseDoc) {
        throw new APIError({
          STATUS: 404,
          TITLE: 'CASE_NOT_FOUND',
          MESSAGE: 'Case not found',
        });
      }

      // Validate case is in Stage 8 (pendingTehsildar)
      if (caseDoc.stage !== 8 || caseDoc.status !== 'pendingTehsildar') {
        throw new APIError({
          STATUS: 400,
          TITLE: 'INVALID_CASE_STAGE',
          MESSAGE: 'Case must be in Stage 8 (pendingTehsildar) to be closed',
        });
      }

      // Validate payment remark is provided
      if (!paymentRemark) {
        throw new APIError({
          STATUS: 400,
          TITLE: 'MISSING_PAYMENT_REMARK',
          MESSAGE: 'Payment remark is required for case closure',
        });
      }

      // Update case to closed status
      caseDoc.status = 'closed';
      caseDoc.stage = 8; // Move to stage 8 (closed)

      // Add payment details
      caseDoc.payment = {
        status: 'completed',
        amount: 150000, // ₹1.5 lakh
        remark: paymentRemark,
        date: new Date(),
        processedBy: userId || 'system',
      };

      // Add closure remark
      const closureRemark = `Case closed - Payment processed: ${paymentRemark}`;

      caseDoc.remarks.push({
        stage: 8,
        remark: closureRemark,
        userId: userId || 'system',
        date: new Date(),
      });

      await caseDoc.save();
      return caseDoc;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError({
        STATUS: 500,
        TITLE: 'CASE_CLOSURE_FAILED',
        MESSAGE: 'Failed to close case',
      });
    }
  }
}
