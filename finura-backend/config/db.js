const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    if (!process.env.MONGO_URI) {
      console.warn('⚠️ MONGO_URI is missing. MongoDB connection skipped.');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: process.env.NODE_ENV === 'production' ? 20 : 10,
      retryWrites: true,
      connectTimeoutMS: 10000,
    });

    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    if (process.env.NODE_ENV === 'production' && !isServerless) {
      process.exit(1);
    }
  }
};

module.exports = connectDB;

