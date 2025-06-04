import express from 'express';
import { User } from '../models/User.js';
import { Story } from '../models/Story.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET user by username
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