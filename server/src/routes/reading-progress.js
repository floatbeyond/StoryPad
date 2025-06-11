import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import ReadingProgress from '../models/ReadingProgress.js';
import { Story } from '../models/Story.js';

const router = express.Router();

// Get user's reading progress for all stories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const progress = await ReadingProgress.find({ user: req.user.id })
      .populate({
        path: 'story',
        populate: {
          path: 'author',
          select: 'username'
        }
      })
      .sort({ lastReadAt: -1 });

    res.json({ success: true, progress });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch reading progress', error: err.message });
  }
});

// Update reading progress for a story
router.post('/:storyId/progress', authenticateToken, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { chapterId, chapterIndex, scrollPosition = 0 } = req.body;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    const progress = await ReadingProgress.findOneAndUpdate(
      { user: req.user.id, story: storyId },
      {
        currentChapter: chapterId,
        chapterIndex,
        scrollPosition,
        lastReadAt: new Date()
      },
      { upsert: true, new: true }
    ).populate('story');

    res.json({ success: true, progress });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update reading progress', error: err.message });
  }
});

// Get reading progress for a specific story
router.get('/:storyId', authenticateToken, async (req, res) => {
  try {
    const progress = await ReadingProgress.findOne({
      user: req.user.id,
      story: req.params.storyId
    }).populate('story');

    res.json({ success: true, progress });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch reading progress', error: err.message });
  }
});

export default router;