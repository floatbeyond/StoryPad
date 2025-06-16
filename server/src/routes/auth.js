import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { SECRET_KEY } from '../middleware/auth.js';

const router = express.Router();

// Signup endpoint
router.post('/signup', async (req, res) => {
  const { firstName, lastName, username, email, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create a new user
    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword, // Save hashed password
    });

    await newUser.save();
    res.status(201).json({ 
      success: true, 
      message: 'User created successfully' 
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    console.log('🔍 Login attempt for:', email);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log('✅ User found:', user.username);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Password mismatch for:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log('✅ Password matches for:', user.username);

    // Generate token
    const token = jwt.sign(
      { 
        id: user._id.toString(), // ✅ Ensure it's a clean string
        username: user.username,
        role: user.role || 'user'
      },
      SECRET_KEY,
      { expiresIn: '7d' }
    ); 

    console.log('✅ Token generated for:', user.username);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role || 'user'
      }
    });

    console.log('✅ Login response sent for:', user.username);

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

export default router;