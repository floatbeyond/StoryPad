import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import ms from 'ms';
import { User } from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Add these constants at the top
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
const SESSION_DURATION = process.env.SESSION_DURATION || '24h';

// Login route (updated to support new auth system)
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    console.log('Login request:', { email, rememberMe }); // Debug log

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Determine session duration based on "Remember Me"
    const sessionDuration = rememberMe === true 
      ? (process.env.EXTENDED_SESSION_DURATION || '30d')
      : (process.env.SESSION_DURATION || '24h');

    const refreshTokenExpiry = rememberMe === true
      ? (process.env.EXTENDED_REFRESH_TOKEN_EXPIRY || '30d')
      : (process.env.REFRESH_TOKEN_EXPIRY || '7d');
      
    console.log('Session settings:', { rememberMe, sessionDuration, refreshTokenExpiry }); // Debug log

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { 
        id: user._id, 
        type: 'refresh',
        sessionStart: new Date().toISOString(),
        maxSessionDuration: sessionDuration
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: refreshTokenExpiry }
    );

    // Update user with session info
    user.lastLogin = new Date();
    user.refreshToken = refreshToken;
    user.sessionStart = new Date();
    user.maxSessionDuration = sessionDuration;
    await user.save();

    // Calculate expiration times
    const accessTokenExp = new Date(Date.now() + ms(ACCESS_TOKEN_EXPIRY));
    const refreshTokenExp = new Date(Date.now() + ms(refreshTokenExpiry));
    const sessionExp = new Date(Date.now() + ms(sessionDuration));

    res.json({
      success: true,
      message: 'Login successful',
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture
      },
      expiresAt: accessTokenExp.toISOString(),
      refreshExpiresAt: refreshTokenExp.toISOString(),
      sessionExpiresAt: sessionExp.toISOString(),
      maxSessionDuration: sessionDuration
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Refresh token route
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Refresh token required' 
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    // Find user and validate refresh token
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid refresh token' 
      });
    }

    // Check if session has exceeded maximum duration
    const sessionStart = user.sessionStart || new Date(decoded.sessionStart);
    const maxDuration = user.maxSessionDuration || decoded.maxSessionDuration || SESSION_DURATION;
    const sessionExpiry = new Date(sessionStart.getTime() + ms(maxDuration));

    if (new Date() > sessionExpiry) {
      // Session expired, clear refresh token
      user.refreshToken = undefined;
      user.sessionStart = undefined;
      user.maxSessionDuration = undefined;
      await user.save();

      return res.status(401).json({ 
        success: false, 
        message: 'Session expired. Please log in again.',
        sessionExpired: true
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const accessTokenExp = new Date(Date.now() + ms(ACCESS_TOKEN_EXPIRY));

    res.json({
      success: true,
      token: newAccessToken,
      expiresAt: accessTokenExp.toISOString(),
      sessionExpiresAt: sessionExpiry.toISOString(),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid refresh token' 
    });
  }
});

// Logout route
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Clear refresh token from database
    await User.findByIdAndUpdate(req.user.id, { 
      $unset: { 
        refreshToken: 1,
        sessionStart: 1,
        maxSessionDuration: 1
      } 
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Legacy signup route (for backward compatibility)
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ 
          success: false,
          message: 'Email already registered' 
        });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ 
          success: false,
          message: 'Username already taken' 
        });
      }
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// TEST ENDPOINTS - Only in development
if (process.env.NODE_ENV === 'development') {
  // Check session status
  router.get('/test/session-status', authenticateToken, async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const now = new Date();
      const sessionStart = user.sessionStart || new Date();
      const maxDuration = user.maxSessionDuration || SESSION_DURATION;
      const sessionExpiry = new Date(sessionStart.getTime() + ms(maxDuration));
      
      res.json({
        success: true,
        sessionInfo: {
          sessionStart: sessionStart,
          sessionExpiry: sessionExpiry,
          timeRemaining: sessionExpiry.getTime() - now.getTime(),
          timeRemainingFormatted: ms(Math.max(0, sessionExpiry.getTime() - now.getTime())),
          isExpired: now > sessionExpiry,
          maxDuration: maxDuration,
          userId: user._id
        }
      });
    } catch (error) {
      console.error('Session status check error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        message: 'Failed to check session status'
      });
    }
  });

  // Force session expiry for testing
  router.post('/test/expire-session', authenticateToken, async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Set session start to 25 hours ago to force expiry
      user.sessionStart = new Date(Date.now() - (25 * 60 * 60 * 1000));
      await user.save();
      
      res.json({
        success: true,
        message: 'Session artificially expired',
        newSessionStart: user.sessionStart
      });
    } catch (error) {
      console.error('Force expire session error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        message: 'Failed to expire session'
      });
    }
  });
}

export default router;