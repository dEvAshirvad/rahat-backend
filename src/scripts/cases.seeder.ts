import mongoose from 'mongoose';
import env from '../configs/env';
import { CaseModel } from '../modules/cases/cases.model';
import logger from '../configs/logger';

export class CasesSeeder {
  /**
   * Seed test cases
   */
  static async seed(count: number = 5): Promise<void> {
    try {
      logger.info(`🌱 Seeding ${count} test cases...`);

      const testCases = [];

      for (let i = 1; i <= count; i++) {
        const caseId = `RAHAT-2025-${String(i).padStart(4, '0')}`;

        const testCase = {
          caseId,
          victim: {
            name: `Test Victim ${i}`,
            dob: new Date('1990-01-01'),
            dod: new Date('2025-01-15'),
            address: `Test Address ${i}, Raipur, Chhattisgarh`,
            contact: `+9198765432${String(i).padStart(2, '0')}`,
            description: `Test case ${i} - Drowning accident`,
          },
          caseSDM: '68857406b8952ea08cecc71e', // Test SDM ID
          status: this.getRandomStatus(),
          stage: this.getRandomStage(),
          documents: this.generateTestDocuments(),
          remarks: this.generateTestRemarks(i),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        testCases.push(testCase);
      }

      // Insert test cases
      await CaseModel.insertMany(testCases);
      logger.info(`✅ Successfully seeded ${count} test cases`);
    } catch (error) {
      logger.error('❌ Failed to seed test cases:', error);
      throw error;
    }
  }

  /**
   * Clear all cases
   */
  static async clear(): Promise<void> {
    try {
      logger.info('🗑️  Clearing all cases...');

      const result = await CaseModel.deleteMany({});
      logger.info(`✅ Cleared ${result.deletedCount} cases`);
    } catch (error) {
      logger.error('❌ Failed to clear cases:', error);
      throw error;
    }
  }

  /**
   * Reset cases (clear and reseed)
   */
  static async reset(count: number = 5): Promise<void> {
    try {
      logger.info('🔄 Resetting cases...');

      await this.clear();
      await this.seed(count);

      logger.info('✅ Cases reset successfully!');
    } catch (error) {
      logger.error('❌ Failed to reset cases:', error);
      throw error;
    }
  }

  /**
   * Get random status for test cases
   */
  private static getRandomStatus(): string {
    const statuses = [
      'created',
      'pendingSDM',
      'pendingRahatShakha',
      'pendingOIC',
      'pendingAdditionalCollector',
      'pendingCollector',
      'pendingAdditionalCollector2',
      'pendingTehsildar',
      'closed',
      'rejected',
    ];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  /**
   * Get random stage for test cases
   */
  private static getRandomStage(): number {
    return Math.floor(Math.random() * 8) + 1;
  }

  /**
   * Generate test documents
   */
  private static generateTestDocuments(): Array<{
    url: string;
    type: string;
    uploadedAt: Date;
  }> {
    const documentTypes = ['patwari', 'thana_inspector'];
    const documents = [];

    for (const type of documentTypes) {
      if (Math.random() > 0.3) {
        // 70% chance to have documents
        documents.push({
          url: `http://localhost:3034/api/v1/files/test-${type}-${Date.now()}/serve`,
          type,
          uploadedAt: new Date(),
        });
      }
    }

    return documents;
  }

  /**
   * Generate test remarks
   */
  private static generateTestRemarks(caseNumber: number): Array<{
    stage: number;
    remark: string;
    userId: string;
    date: Date;
  }> {
    const remarks = [];
    const stages = [1, 2, 3, 4, 5, 6, 7, 8];

    // Generate 1-3 random remarks
    const numRemarks = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < numRemarks; i++) {
      const stage = stages[Math.floor(Math.random() * stages.length)];
      const remark = this.getRandomRemark(stage);

      remarks.push({
        stage,
        remark,
        userId: 'test-user-id',
        date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
      });
    }

    return remarks;
  }

  /**
   * Get random remark for a stage
   */
  private static getRandomRemark(stage: number): string {
    const remarks = {
      1: ['Case created successfully', 'Initial documentation started'],
      2: ['Documents uploaded for review', 'SDM review pending'],
      3: ['Rahat Shakha review completed', 'Case forwarded to next stage'],
      4: ['OIC review in progress', 'Additional verification required'],
      5: ['Additional Collector review pending', 'Case under scrutiny'],
      6: ['Collector review completed', 'Final approval pending'],
      7: ['Additional Collector 2 review', 'OBEY order processing'],
      8: ['Funds distributed successfully', 'Case closed and completed'],
    };

    const stageRemarks = remarks[stage as keyof typeof remarks] || [
      'Stage review completed',
    ];
    return stageRemarks[Math.floor(Math.random() * stageRemarks.length)];
  }
}

// Export for use in main seeder
export const casesSeeder = new CasesSeeder();
