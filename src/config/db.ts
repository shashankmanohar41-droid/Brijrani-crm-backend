import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    const connUri = process.env.MONGODB_URI || 'mongodb+srv://shashankmanohar1734_db_user:hpIe3ev8T1QsKZMM@cluster0.ws2kdbz.mongodb.net/brijrani_erp?retryWrites=true&w=majority';
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
    console.log(`MongoDB Connected successfully.`);
  } catch (error) {
    console.error(`MongoDB Connection Error:`, error);
    // In serverless environments (Vercel), do NOT call process.exit(1) as it crashes the entire lambda container
  }
};
