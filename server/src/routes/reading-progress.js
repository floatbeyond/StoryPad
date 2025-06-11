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

    // Filter out progress records where story is null (deleted stories)
    const validProgress = progress.filter(p => p.story);
    
    // Clean up orphaned progress records
    const orphanedProgress = progress.filter(p => !p.story);
    if (orphanedProgress.length > 0) {
      const orphanedIds = orphanedProgress.map(p => p._id);
      await ReadingProgress.deleteMany({ _id: { $in: orphanedIds } });
      console.log(`Cleaned up ${orphanedIds.length} orphaned progress records`);
    }

    res.json({ success: true, progress: validProgress });
  } catch (err) {
    console.error('Error fetching reading progress:', err);
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

// Delete reading progress for a specific story (remove from library)
router.delete('/:storyId', authenticateToken, async (req, res) => {
  try {
    const { storyId } = req.params;
    
    const deletedProgress = await ReadingProgress.findOneAndDelete({
      user: req.user.id,
      story: storyId
    });

    if (!deletedProgress) {
      return res.status(404).json({ success: false, message: 'Reading progress not found' });
    }

    res.json({ success: true, message: 'Story removed from library' });
  } catch (err) {
    console.error('Error deleting reading progress:', err);
    res.status(500).json({ success: false, message: 'Failed to remove story from library', error: err.message });
  }
});

// Add this route temporarily to clear all reading progress
router.delete('/clear-all', authenticateToken, async (req, res) => {
  try {
    await ReadingProgress.deleteMany({});
    res.json({ success: true, message: 'All reading progress cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear reading progress' });
  }
});

export default router;