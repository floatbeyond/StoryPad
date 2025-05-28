import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Story } from '../models/Story.js';
import jwt from 'jsonwebtoken';
import { authenticateToken, SECRET_KEY } from './authMiddleware.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
}));
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.send('✅ Express server is working!');
});

// Auth endpoints
app.post('/api/signup', async (req, res) => {
  try {
    const { firstName, lastName, username, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }

    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password,
    });

    await newUser.save();
    res.status(201).json({ 
      success: true, 
      message: 'User created successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || user.password !== password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email }, 
      SECRET_KEY, 
      { expiresIn: '1h' }
    );

    res.json({ 
      success: true, 
      username: user.username, 
      token 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Stories endpoints
app.post('/api/stories', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, language } = req.body;

    if (!title || !description || !category || !language) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const newStory = new Story({
      title,
      description,
      category,
      language,
      author: req.user.id,
      chapters: [],
      published: false
    });

    await newStory.save();

    res.status(201).json({
      success: true,
      message: 'Story created successfully',
      story: newStory
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to create story',
      error: error.message 
    });
  }
});

// Add a new chapter to a story
app.post('/api/stories/:storyId/chapters', authenticateToken, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { title, content, published } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required for the chapter'
      });
    }

    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    // Verify the user is the author of the story
    if (story.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to add chapter to this story' });
    }

    // Add the new chapter to the story
    story.chapters.push({
      title,
      content,
      published: published ?? false
    });

    await story.save();

    res.status(201).json({
      success: true,
      message: 'Chapter added successfully',
      story
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add chapter',
      error: error.message
    });
  }
});


// Get all stories endpoint
app.get('/api/stories', async (req, res) => {
  try {
    const stories = await Story.find()
      .populate('author', 'username firstName lastName')
      .select('-chapters.content');
    
    res.json({
      success: true,
      stories
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch stories', 
      error: error.message 
    });
  }
});

// Get user stories endpoint
app.get('/api/user/:userId/stories', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these stories'
      });
    }

    const stories = await Story.find({ author: userId })
      .select('title description category language published chapters createdAt updatedAt')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      count: stories.length,
      stories: stories.map(story => ({
        _id: story._id,
        title: story.title,
        description: story.description,
        category: story.category,
        language: story.language,
        published: story.published,
        chapters: story.chapters.map(ch => ({
          title: ch.title,
          content: ch.content,
          published: ch.published || false // ודא שיש שדה published בפרק
        })),
        createdAt: story.createdAt,
        updatedAt: story.updatedAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user stories',
      error: error.message
    });
  }
});

// Get single story endpoint
app.get('/api/stories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const story = await Story.findById(id);
    
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Verify the user is the author
    if (story.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this story'
      });
    }

    res.json({
      success: true,
      story: {
        _id: story._id,
        title: story.title,
        description: story.description,
        category: story.category,
        language: story.language,
        published: story.published,
        chapters: story.chapters || [],
        createdAt: story.createdAt,
        updatedAt: story.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch story',
      error: error.message
    });
  }
});

// Update story endpoint
app.put('/api/stories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, language, chapters } = req.body;

    // Find the story and verify ownership
    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    if (story.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this story'
      });
    }

    // Update the story with new data
    const updatedStory = await Story.findByIdAndUpdate(
      id,
      {
        $set: {
          title,
          description,
          category,
          language,
          chapters,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Story updated successfully',
      story: updatedStory
    });

  } catch (error) {
    console.error('Error updating story:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update story',
      error: error.message
    });
  }
});

// Server startup
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  }
};

startServer();

export default app;