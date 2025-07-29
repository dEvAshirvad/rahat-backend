import mongoose from 'mongoose';
import env from '../configs/env';
import logger from '../configs/logger';
import { CasesSeeder } from './cases.seeder';

export interface SeederOptions {
  clear?: boolean;
  reset?: boolean;
  cases?: boolean;
  casesCount?: number;
}

export class DatabaseSeeder {
  private static connection: mongoose.Connection | null = null;

  /**
   * Connect to MongoDB
   */
  static async connect(): Promise<void> {
    try {
      const mongoUri =
        env.MONGO_URI ||
        `mongodb://${env.MONGO_INITDB_ROOT_USERNAME}:${env.MONGO_INITDB_ROOT_PASSWORD}@${env.MONGO_HOST}:${env.MONGO_PORT}/${env.MONGO_INITDB_ROOT_DATABASE}`;
      await mongoose.connect(mongoUri);
      this.connection = mongoose.connection;
      logger.info('✅ Connected to MongoDB for seeding');
    } catch (error) {
      logger.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  static async disconnect(): Promise<void> {
    if (this.connection) {
      await mongoose.disconnect();
      logger.info('✅ Disconnected from MongoDB');
    }
  }

  /**
   * Clear entire database
   */
  static async clearDatabase(): Promise<void> {
    try {
      if (!this.connection) {
        throw new Error('Not connected to database');
      }

      logger.info('🗑️  Clearing entire database...');

      // Store connection in local variable to satisfy TypeScript
      const connection = this.connection;
      const db = connection.db;

      if (!db) {
        throw new Error('Database not available');
      }

      // Drop all collections
      const collections = await db.listCollections().toArray();

      for (const collection of collections) {
        await db.dropCollection(collection.name);
        logger.info(`🗑️  Dropped collection: ${collection.name}`);
      }

      logger.info('✅ Database cleared successfully');
    } catch (error) {
      logger.error('❌ Failed to clear database:', error);
      throw error;
    }
  }

  /**
   * Run all seeders
   */
  static async runAll(options: SeederOptions = {}): Promise<void> {
    console.log('🚀 Starting database seeding...\n');

    try {
      await this.connect();

      if (options.reset) {
        console.log('🔄 Reset mode: Clearing and reseeding all data...\n');
        await this.resetAll(options);
        return;
      }

      if (options.clear) {
        console.log('🗑️  Clear mode: Removing all seeded data...\n');
        await this.clearAll();
        return;
      }

      // Seed cases
      if (options.cases !== false) {
        const count = options.casesCount || 5;
        await CasesSeeder.seed(count);
        console.log('');
      }

      console.log('✅ Database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Clear all seeded data
   */
  static async clearAll(): Promise<void> {
    console.log('🗑️  Clearing all seeded data...\n');

    try {
      await CasesSeeder.clear();
      console.log('✅ All seeded data cleared successfully!');
    } catch (error) {
      console.error('❌ Error clearing seeded data:', error);
      throw error;
    }
  }

  /**
   * Reset all data (clear and reseed)
   */
  static async resetAll(options: SeederOptions = {}): Promise<void> {
    console.log('🔄 Resetting all data...\n');

    try {
      const count = options.casesCount || 5;
      await CasesSeeder.reset(count);
      console.log('✅ All data reset successfully!');
    } catch (error) {
      console.error('❌ Error resetting data:', error);
      throw error;
    }
  }

  /**
   * Seed only cases
   */
  static async seedCases(count: number = 5): Promise<void> {
    console.log('🌱 Seeding cases...\n');
    await CasesSeeder.seed(count);
    console.log('✅ Cases seeding completed!');
  }

  /**
   * Clear only cases
   */
  static async clearCases(): Promise<void> {
    console.log('🗑️  Clearing cases...\n');
    await CasesSeeder.clear();
    console.log('✅ Cases cleared!');
  }

  /**
   * Reset only cases
   */
  static async resetCases(count: number = 5): Promise<void> {
    console.log('🔄 Resetting cases...\n');
    await CasesSeeder.reset(count);
    console.log('✅ Cases reset!');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: SeederOptions = {
    clear: args.includes('--clear') || args.includes('-c'),
    reset: args.includes('--reset') || args.includes('-r'),
    cases: !args.includes('--no-cases'),
    casesCount: parseInt(
      args.find((arg) => arg.startsWith('--cases='))?.split('=')[1] || '5'
    ),
  };

  if (!options.clear && !options.reset && !args.includes('--help')) {
    console.log(`
🚀 Database Seeder Utility

Usage:
  npx ts-node src/scripts/database.seeder.ts [options]

Options:
  --clear, -c                    Clear all seeded data
  --reset, -r                    Reset all data (clear and reseed)
  --no-cases                     Skip seeding cases
  --cases=<number>               Number of test cases to seed (default: 5)
  --help                         Show this help message

Examples:
  npx ts-node src/scripts/database.seeder.ts --clear
  npx ts-node src/scripts/database.seeder.ts --reset
  npx ts-node src/scripts/database.seeder.ts --reset --cases=10
  npx ts-node src/scripts/database.seeder.ts --no-cases

Available Commands:
  npm run seeder:clear           Clear all data
  npm run seeder:seed            Seed test data
  npm run seeder:reset           Reset all data
    `);
    process.exit(0);
  }

  await DatabaseSeeder.runAll(options);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
  });
}

export { DatabaseSeeder as default };
