import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// רק אם את עובדת עם ESM (import/export)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// נתיב מוחלט אל קובץ .env בתיקיית הפרויקט הראשית
dotenv.config({ path: path.resolve(__dirname, '../../.env') });


async function connectToMongo() {
  try {
    const uri = process.env.MONGODB_URI
      .replace('<USERNAME>', process.env.MONGO_USER)
      .replace('<PASSWORD>', process.env.MONGO_PASSWORD);

    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(` MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};
