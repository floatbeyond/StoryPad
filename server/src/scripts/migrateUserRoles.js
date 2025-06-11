import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

const migrateUserRoles = async () => {
  try {
    const uri = process.env.MONGODB_URI
          .replace('<USERNAME>', process.env.MONGO_USER)
          .replace('<PASSWORD>', process.env.MONGO_PASSWORD);
    
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // First, let's see what users exist
    const allUsers = await User.find({}).select('username email role');
    console.log('📋 Current users:', allUsers);

    // Set admin role for admin users
    const adminUpdate = await User.updateMany(
      { 
        $or: [
          { username: 'admin' },
          { email: 'admin@storypad.com' }
        ]
      },
      { 
        $set: { role: 'admin' } 
      }
    );

    console.log(`✅ Updated ${adminUpdate.modifiedCount} admin users`);

    // Set 'user' role for all users that don't have a role
    const userUpdate = await User.updateMany(
      { 
        $or: [
          { role: { $exists: false } },
          { role: null },
          { role: '' }
        ]
      },
      { 
        $set: { role: 'user' } 
      }
    );

    console.log(`✅ Updated ${userUpdate.modifiedCount} regular users`);

    // Check the results
    const updatedUsers = await User.find({}).select('username email role');
    console.log('📋 Users after migration:');
    updatedUsers.forEach(user => {
      console.log(`  - ${user.username}: ${user.role}`);
    });

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
};

migrateUserRoles();