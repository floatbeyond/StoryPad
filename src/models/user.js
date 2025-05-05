import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    match: [
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
      'Password must contain at least one number and one special character'
    ]
  },
  termsAccepted: {
    type: Boolean,
    required: [true, 'You must accept the terms and conditions']
  },
  authProvider: {
    type: String,
    enum: ['local', 'facebook', 'google'],
    default: 'local'
  },
  authProviderId: String,
  profilePicture: {
    type: String,
    default: 'default-avatar.png'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// אינדקסים לחיפוש מהיר
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

// הוק לפני שמירה - עדכון תאריך
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// מתודה סטטית לבדיקת קיום אימייל
userSchema.statics.emailExists = async function(email) {
  const user = await this.findOne({ email });
  return !!user;
};

// מתודה סטטית לבדיקת קיום שם משתמש
userSchema.statics.usernameExists = async function(username) {
  const user = await this.findOne({ username });
  return !!user;
};

const User = mongoose.model('User', userSchema);

export default User;