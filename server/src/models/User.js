import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Collaboration preferences
  collaborationSettings: {
    allowInvitations: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true }
  }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);