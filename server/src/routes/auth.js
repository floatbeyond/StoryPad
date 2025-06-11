import express from 'express';
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

    // Create a new user
    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password,
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      SECRET_KEY,
      { expiresIn: '3d' }
    ); 

    res.json({
      success: true,
      message: 'Login successful',
      token,
      username: user.username,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || 'user' 
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;