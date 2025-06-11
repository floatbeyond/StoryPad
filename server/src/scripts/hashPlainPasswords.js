import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

const hashPlainPasswords = async () => {
  try {
    const uri = process.env.MONGODB_URI
      .replace('<USERNAME>', process.env.MONGO_USER)
      .replace('<PASSWORD>', process.env.MONGO_PASSWORD);
    
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Find users with plain text passwords (not starting with $2b$ or $2a$)
    const users = await User.find({
      password: { 
        $not: { 
          $regex: /^\$2[ab]\$/ 
        } 
      }
    });

    console.log(`🔍 Found ${users.length} users with plain text passwords`);

    for (const user of users) {
      console.log(`🔄 Hashing password for: ${user.username}`);
      
      // Hash the plain text password
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Update the user with hashed password
      await User.updateOne(
        { _id: user._id },
        { $set: { password: hashedPassword } }
      );
      
      console.log(`✅ Password hashed for: ${user.username}`);
    }

    console.log('🎉 All plain text passwords have been hashed!');

    // Verify the results
    const updatedUsers = await User.find({}).select('username password');
    console.log('\n📋 Updated password formats:');
    updatedUsers.forEach(user => {
      const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
      console.log(`👤 ${user.username}: ${isHashed ? '✅ Hashed' : '❌ Still plain text'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

hashPlainPasswords();