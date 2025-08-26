import mongoose from 'mongoose';

// Use environment variable for MongoDB URI
const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGODB_URI;

console.log("Connecting to MongoDB...");

let isConnected = false;

export const connectToMongoDB = async () => {
  if (isConnected) {
    console.log("MongoDB already connected");
    return;
  }

  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI environment variable is not set");
    console.log("⚠️  Running in development mode without MongoDB - some features may be limited");
    return;
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