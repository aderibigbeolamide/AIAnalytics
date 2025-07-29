import mongoose from 'mongoose';

// Use environment variable for MongoDB URI with fallback for development
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hafiztech56:eventdb@eventdb.b5av4hv.mongodb.net/eventvalidate?retryWrites=true&w=majority';

console.log("Connecting to MongoDB...");

let isConnected = false;

export const connectToMongoDB = async () => {
  if (isConnected) {
    console.log("MongoDB already connected");
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