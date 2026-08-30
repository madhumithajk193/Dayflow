import { db } from './database.js';
import { runMigrations } from './migrate.js';
import { SeedService } from '../services/SeedService.js';
import * as dotenv from 'dotenv';

dotenv.config();

export async function runSeed() {
  console.log('🌱 Starting Dayflow HRMS PostgreSQL database seed process...');
  
  // 1. Ensure migrations run first
  await runMigrations();

  // 2. Initialize db connection
  await db.init();

  // 3. Reset and seed
  await SeedService.seed();

  console.log('✨ Database seeding complete!');
}

if (process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')) {
  runSeed()
    .then(() => {
      console.log('Seed process finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal seed error:', err);
      process.exit(1);
    });
}
