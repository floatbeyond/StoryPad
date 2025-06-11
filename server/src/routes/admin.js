import express from 'express';
import { User } from '../models/User.js';
import { Story } from '../models/Story.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Admin middleware
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Check role field OR fallback to username/email for existing admins
    const isAdmin = user.role === 'admin' || 
                   user.username === 'admin' || 
                   user.email === 'admin@storypad.com';
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking admin access',
      error: error.message
    });
  }
};

// Get all users
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort('-createdAt');

    res.json({
      success: true,
      users
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// Promote user to admin
router.put('/users/:userId/promote', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { role: 'admin' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `${user.username} has been promoted to admin`,
      user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to promote user',
      error: error.message
    });
  }
});

// Demote admin to regular user
router.put('/users/:userId/demote', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    
    // Prevent self-demotion
    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot demote yourself'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role: 'user' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `${user.username} has been demoted to user`,
      user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to demote user',
      error: error.message
    });
  }
});

// Delete user
router.delete('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    
    // Prevent self-deletion
    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete yourself'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    // Delete user's stories first
    await Story.deleteMany({ author: userId });
    
    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'User and their stories deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// Get system stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStories = await Story.countDocuments();
    const publishedStories = await Story.countDocuments({ published: true });
    
    // Recent activity
    const recentUsers = await User.find({})
      .sort('-createdAt')
      .limit(5)
      .select('username firstName lastName createdAt');
      
    const recentStories = await Story.find({})
      .populate('author', 'username')
      .sort('-createdAt')
      .limit(5)
      .select('title author createdAt');

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalStories,
        publishedStories,
        recentUsers,
        recentStories
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
      error: error.message
    });
  }
});

export default router;