import mongoose from 'mongoose'

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MongoDB connection string missing. Set MONGO_URI in backend/.env");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });

  console.log("MongoDB connected");
};

export default connectDB;
