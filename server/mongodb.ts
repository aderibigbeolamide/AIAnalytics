import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.DATABASE_URL;

console.log("Connecting to MongoDB...");

if (!MONGODB_URI) {
  throw new Error("DATABASE_URL environment variable is not defined.");
}

let isConnected = false;

export const connectToMongoDB = async () => {
  if (isConnected) {
    console.log("MongoDB already connected");
    await mongoose.connect(MONGODB_URI as string);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
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