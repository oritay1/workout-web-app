import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is not defined');
  }
  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connected');
}
