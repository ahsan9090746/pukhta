import mongoose from 'mongoose';
import { config } from '../config';
import { seed } from './seed';

async function runSeed(): Promise<void> {
  try {
    await seed();
    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

runSeed();
