import express from 'express';
import { User } from '../models/User.js';
import { Story } from '../models/Story.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload, cloudinary } from '../config/upload.js';
import bcrypt from 'bcrypt';
import fs from 'fs';

const router = express.Router();

// Search users
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        users: []
      });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
    .select('username firstName lastName email')
    .limit(10);

    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message
    });
  }
});

// Get current user's profile - MOVED UP
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get user stats
    const storiesCount = await Story.countDocuments({ author: req.user.id });
    const stories = await Story.find({ author: req.user.id });
    const totalViews = stories.reduce((sum, story) => sum + (story.views || 0), 0);
    const totalLikes = stories.reduce((sum, story) => sum + (story.likes?.length || 0), 0);

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        stats: {
          storiesCount,
          totalViews,
          totalLikes
        }
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's pending invitations
router.get('/profile/invitations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('📨 Fetching invitations for user:', userId);
    
    // Find all stories with pending invitations for this user
    const stories = await Story.find({
      'pendingInvitations.invitedUser': userId,
      'pendingInvitations.status': 'pending'
    })
    .populate('author', 'username firstName lastName')
    .populate('pendingInvitations.invitedBy', 'username firstName lastName')
    .select('title description pendingInvitations author');

    // Extract only the relevant invitations
    const invitations = [];
    stories.forEach(story => {
      const userInvitations = story.pendingInvitations.filter(
        inv => inv.invitedUser.toString() === userId && inv.status === 'pending'
      );
      
      userInvitations.forEach(invitation => {
        invitations.push({
          _id: invitation._id,
          story: {
            _id: story._id,
            title: story.title,
            description: story.description,
            author: story.author
          },
          invitedBy: invitation.invitedBy,
          role: invitation.role,
          invitedAt: invitation.invitedAt
        });
      });
    });

    console.log('✅ Found invitations:', invitations.length);
    
    res.json({
      success: true,
      invitations
    });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invitations',
      error: error.message
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, username, email } = req.body;
    const userId = req.user.id;

    // Check if username is taken by another user
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username is already taken' 
        });
      }
    }

    // Check if email is taken by another user
    if (email) {
      const existingEmail = await User.findOne({ 
        email, 
        _id: { $ne: userId } 
      });
      if (existingEmail) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email is already registered' 
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, username, email },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update profile picture
router.put('/profile-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    console.log('📸 Profile picture upload request:', {
      file: req.file ? 'File received' : 'No file',
      userId: req.user.id
    });

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    console.log('📁 File details:', {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: `storypad/profiles/${new Date().getFullYear()}`,
      public_id: `${req.user.id}_${Date.now()}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
        { format: 'auto' }
      ]
    });

    console.log('☁️ Cloudinary upload result:', {
      public_id: result.public_id,
      secure_url: result.secure_url
    });

    // Update user profile picture
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: result.secure_url },
      { new: true }
    ).select('-password');

    // Clean up temp file
    try {
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Temp file cleaned up');
      }
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup temp file:', cleanupError.message);
    }

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      profilePicture: result.secure_url,
      user
    });
  } catch (error) {
    console.error('❌ Profile picture upload error:', error);
    
    // Clean up temp file on error
    try {
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Temp file cleaned up after error');
      }
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup temp file after error:', cleanupError.message);
    }

    // Return more specific error messages
    if (error.code === 'ENOENT') {
      return res.status(500).json({ 
        success: false, 
        message: 'File upload failed - file not found' 
      });
    }
    
    if (error.http_code) {
      return res.status(500).json({ 
        success: false, 
        message: `Cloudinary error: ${error.message}` 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload profile picture',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { collaborationSettings } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { collaborationSettings },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Settings updated successfully',
      user
    });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user with password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await User.findByIdAndUpdate(userId, { password: hashedNewPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete user's stories
    await Story.deleteMany({ author: userId });

    // Remove user from collaborations
    await Story.updateMany(
      { 'collaborators.user': userId },
      { $pull: { collaborators: { user: userId } } }
    );

    // Delete user account
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Check username availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const existingUser = await User.findOne({ username });
    
    res.json({
      success: true,
      available: !existingUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's pending invitations - ADD BACKWARD COMPATIBILITY
router.get('/invitations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('📨 Fetching invitations for user:', userId);
    
    // Find all stories with pending invitations for this user
    const stories = await Story.find({
      'pendingInvitations.invitedUser': userId,
      'pendingInvitations.status': 'pending'
    })
    .populate('author', 'username firstName lastName')
    .populate('pendingInvitations.invitedBy', 'username firstName lastName')
    .select('title description pendingInvitations author');

    // Extract only the relevant invitations
    const invitations = [];
    stories.forEach(story => {
      const userInvitations = story.pendingInvitations.filter(
        inv => inv.invitedUser.toString() === userId && inv.status === 'pending'
      );
      
      userInvitations.forEach(invitation => {
        invitations.push({
          _id: invitation._id,
          story: {
            _id: story._id,
            title: story.title,
            description: story.description,
            author: story.author
          },
          invitedBy: invitation.invitedBy,
          role: invitation.role,
          invitedAt: invitation.invitedAt
        });
      });
    });

    console.log('✅ Found invitations:', invitations.length);
    
    res.json({
      success: true,
      invitations
    });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invitations',
      error: error.message
    });
  }
});

// GET user by username - MOVED TO END
router.get('/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      username: user.username,
      joined: user.createdAt,
      storiesCount: user.storiesCount || 0,
      followers: user.followers || 0,
      likes: user.likes || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's own stories
router.get('/:userId/stories', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user is requesting their own stories
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const stories = await Story.find({
      author: userId
    })
    .populate('author', 'username firstName lastName')
    .populate('collaborators.user', 'username firstName lastName')
    .sort('-createdAt');

    res.json({
      success: true,
      stories
    });

  } catch (error) {
    console.error('Error fetching user stories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user stories',
      error: error.message
    });
  }
});

// Get user's collaborative stories
router.get('/:userId/collaborative-stories', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user is requesting their own collaborative stories
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const stories = await Story.find({
      'collaborators.user': userId,
      author: { $ne: userId } // Exclude stories they own
    })
    .populate('author', 'username firstName lastName')
    .populate('collaborators.user', 'username firstName lastName')
    .sort('-createdAt');

    res.json({
      success: true,
      stories
    });

  } catch (error) {
    console.error('Error fetching collaborative stories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collaborative stories',
      error: error.message
    });
  }
});

export default router;