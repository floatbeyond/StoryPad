import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { 
    type: String, 
    default: function() {
      return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/default-profile.png`;
    }
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user'
  },
  collaborationSettings: {
    allowInvitations: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true }
  },
  // Session management fields
  refreshToken: String,
  sessionStart: Date,
  maxSessionDuration: String,
  lastLogin: { type: Date, default: Date.now }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);