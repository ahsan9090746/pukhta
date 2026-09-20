import mongoose from 'mongoose';
import { config } from './index';
import { logger } from '../utils/logger';

const RETRY_BASE_DELAY_MS = 2000;
const RETRY_MAX_DELAY_MS = 15000;
const SERVER_SELECTION_TIMEOUT_MS = 5000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async (): Promise<void> => {
  mongoose.set('strictQuery', true);

  // Keep retrying instead of crashing the whole API when MongoDB is down
  let attempt = 0;
  let connected = false;

  while (!connected) {
    attempt += 1;
    try {
      const conn = await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
        maxPoolSize: 10,
      });
      logger.info(
        `MongoDB Connected: ${conn.connection.host} (db: ${conn.connection.name})`
      );
      connected = true;
    } catch (error) {
      const delay = Math.min(RETRY_BASE_DELAY_MS * attempt, RETRY_MAX_DELAY_MS);
      logger.error(
        `MongoDB connection failed (attempt ${attempt}): ${
          error instanceof Error ? error.message : error
        }. Retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Mongoose will auto-reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination');
    process.exit(0);
  });
};

export default connectDB;
