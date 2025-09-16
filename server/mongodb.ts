import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Use environment variable for MongoDB URI - but make it optional for migration
const MONGODB_URI = process.env.MONGODB_URI || (process.env.DATABASE_URL?.startsWith('mongodb') ? process.env.DATABASE_URL : undefined);

console.log("MongoDB service - checking connection...");

let isConnected = false;

export const connectToMongoDB = async () => {
  if (isConnected) {
    console.log("MongoDB already connected");
    return;
  }

  if (!MONGODB_URI) {
    console.log("⚠️  MongoDB not configured - running with PostgreSQL only");
    console.log("🔄 Some legacy MongoDB features may be unavailable during migration");
    return;
  }

  try {
    // Configure connection options for better reliability
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    isConnected = true;
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.warn("⚠️  MongoDB connection failed, continuing with PostgreSQL:", error instanceof Error ? error.message : String(error));
    // Don't throw error - allow app to continue with PostgreSQL
    return;
  }
};

export const disconnectFromMongoDB = async () => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log("✅ MongoDB disconnected successfully");
  } catch (error) {
    console.error("❌ MongoDB disconnection failed:", error);
    throw error;
  }
};

export { mongoose };