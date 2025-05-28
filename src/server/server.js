import http from 'http';
import express from 'express';
import cors from 'cors';
// import mongoose from 'mongoose'; // Add this import
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { authenticateToken, SECRET_KEY } from './authMiddleware.js';
import { Story } from '../models/Story.js';

const app = express();
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ Express server is working!');
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
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

import mongoose from 'mongoose';

// Stories endpoint - Handle story creation
app.post('/api/stories', async (req, res) => {
  try {
    console.log('📝 Received new story request');
    console.log('Request body:', req.body);
    
    const { title, description, category, language } = req.body;

    // Validate required fields
    if (!title || !description || !category || !language) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Create a valid ObjectId for author
    const authorId = req.user?._id || new mongoose.Types.ObjectId();
    console.log('\n Author Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' Author ID:', authorId);
    console.log('Type:', req.user ? 'Logged In User' : 'Default ObjectId');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const newStory = new Story({
      title,
      description,
      category,
      language,
      author: authorId,
      chapters: [],
      published: false
    });

    // Save to database
    await newStory.save();
    console.log('✅ Story saved successfully:');
    console.log('- Story ID:', newStory._id);
    console.log('- Created at:', newStory.createdAt);

    // Return success response
    res.status(201).json({
      message: 'Story created successfully',
      story: newStory
    });

  } catch (error) {
    console.error('❌ Error creating story:', error);
    res.status(500).json({ 
      message: 'Failed to create story', 
      error: error.message 
    });
  }
});

// Get all stories endpoint
app.get('/api/stories', async (req, res) => {
  try {
    const stories = await Story.find().populate('author', 'username firstName lastName');
    res.json(stories);
  } catch (error) {
    console.error('❌ Error fetching stories:', error);
    res.status(500).json({ 
      message: 'Failed to fetch stories', 
      error: error.message 
    });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    // Create JWT token
    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ username: user.username, token });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Protected route for full chapter content
app.get('/api/story/:id/chapter/:chapterId', authenticateToken, async (req, res) => {
  // For demo, return dummy content. Replace with DB fetch in production.
  const { id, chapterId } = req.params;
  // Example dummy content:
  res.json({
    chapterId,
    content: `<p>This is the full content for chapter ${chapterId} of story ${id}.</p>`
  });
});

// Ensure the app is exported for use in the server setup
export default app;

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Connect to DB and start server
const startServer = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server failed to start:', error);
    process.exit(1);
  }
};

startServer();