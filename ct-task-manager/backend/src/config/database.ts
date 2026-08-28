import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';
const DATABASE_NAME = process.env.DATABASE_NAME || 'ct_task_manager';

export const connectDatabase = async (): Promise<void> => {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(MONGODB_URI, {
      dbName: DATABASE_NAME,
    });

    console.log(`✅ MongoDB connected successfully`);
    console.log(`📦 Database: ${DATABASE_NAME}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ MongoDB connection failed: ${error.message}`);
    } else {
      console.error('❌ MongoDB connection failed: Unknown error');
    }
    process.exit(1);
  }
};

export const getDatabaseStatus = (): string => {
  const state = mongoose.connection.readyState;
  switch (state) {
    case 0:
      return 'disconnected';
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'unknown';
  }
};
