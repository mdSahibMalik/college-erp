import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/college-erp';

const connectDB = async()=>{

   try {
     const con = await mongoose.connect(uri);
     console.log(`db connected successfully at ${con.connection.host}`);
   } catch (error) {
     console.error('Database connection error:', error);
     process.exit(1);
   }
}

export default connectDB;
