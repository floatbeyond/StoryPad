import http from 'http';
import express from 'express';
import cors from 'cors';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { authenticateToken, SECRET_KEY } from './authMiddleware.js';
import { Story } from '../models/Story.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));


// Real-time collaboration tracking
const activeUsers = new Map(); // Track users per story
const cursorPositions = new Map(); // Track cursor positions

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('📡 User connected:', socket.id);

  // Join a story room for collaboration
  socket.on('join-story', (data) => {
    const { storyId, username, userId } = data;
    socket.join(storyId);
    
    // Store user info
    activeUsers.set(socket.id, { storyId, username, userId });
    
    console.log(`👤 ${username} joined story ${storyId}`);
    
    // Notify others that user joined
    socket.to(storyId).emit('user-joined', {
      userId,
      username,
      socketId: socket.id
    });
    
    // Send current active users to the new user
    const roomUsers = Array.from(activeUsers.values())
      .filter(user => user.storyId === storyId && user.userId !== userId)
      .map(user => ({ userId: user.userId, username: user.username }));
    
    socket.emit('active-users', roomUsers);
  });


  // Handle text changes
  socket.on('text-change', (data) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      console.log(`📝 Text change from ${user.username} in story ${user.storyId}`);
      // Broadcast the change to all other users in the same story
      socket.to(user.storyId).emit('text-change', {
        ...data,
        userId: user.userId,
        username: user.username
      });
    }
  });

  // Handle cursor position changes
  socket.on('cursor-change', (data) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      cursorPositions.set(socket.id, data);
      // Broadcast cursor position to others
      socket.to(user.storyId).emit('cursor-change', {
        ...data,
        userId: user.userId,
        username: user.username,
        socketId: socket.id
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      console.log(`👋 ${user.username} left story ${user.storyId}`);
      // Notify others that user left
      socket.to(user.storyId).emit('user-left', {
        userId: user.userId,
        username: user.username,
        socketId: socket.id
      });
      
      activeUsers.delete(socket.id);
      cursorPositions.delete(socket.id);
    }
  });
});

// Health check endpoint
app.get('/api/invitations', (req, res) => {
  res.json({ invitations: [] });
});

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

// Stories endpoint - Handle story creation
app.post('/api/stories', authenticateToken, upload.single('cover'), async (req, res) => {
  try {
    console.log('📝 Received new story request');
    
    const { title, description, category, language } = req.body;
    const coverImage = req.file ? `/uploads/${req.file.filename}` : '/default-cover.jpg';

    if (!title || !description || !Array.isArray(JSON.parse(category)) || JSON.parse(category).length === 0 || !language) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required and category must be an array' 
      });
    }

    const authorId = req.user.id;

    const newStory = new Story({
      title,
      description,
      category: JSON.parse(category),
      language,
      author: authorId,
      cover: coverImage,
      chapters: [],
      published: false,
      publishedAt: null,
      lastPublishedAt: null,
      publishedChapters: [],
      views: 0
    });

    await newStory.save();
    console.log('✅ Story saved successfully:');
    console.log('- Story ID:', newStory._id);
    console.log('- Author ID:', newStory.author);
    console.log('- Created at:', newStory.createdAt);

    res.status(201).json({
      success: true,
      message: 'Story created successfully',
      story: newStory
    });

  } catch (error) {
    console.error('❌ Error creating story:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create story', 
      error: error.message 
    });
  }
});

// Update story cover image
app.put('/api/stories/:id/cover', authenticateToken, upload.single('cover'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

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

    // Delete old cover image if it exists and isn't the default
    if (story.cover && story.cover !== '/default-cover.jpg') {
      const oldCoverPath = path.join(__dirname, '..', story.cover);
      if (fs.existsSync(oldCoverPath)) {
        fs.unlinkSync(oldCoverPath);
      }
    }

    const coverUrl = `/uploads/${req.file.filename}`;
    story.cover = coverUrl;
    await story.save();

    res.json({
      success: true,
      message: 'Cover image updated successfully',
      coverUrl
    });

  } catch (error) {
    console.error('❌ Error updating cover image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cover image',
      error: error.message
    });
  }
});

// Get published stories endpoint
app.get('/api/stories/published', async (req, res) => {
  try {
    const stories = await Story.find({ 
      published: true,
      'chapters.published': true 
    })
    .populate('author', 'username')
    .select('title description category language author publishedAt chapters')
    .sort('-lastPublishedAt');

    const processedStories = stories.map(story => ({
      ...story.toObject(),
      chapters: story.chapters.filter(ch => ch.published)
    }));

    res.json({
      success: true,
      stories: processedStories
    });

  } catch (error) {
    console.error('Error fetching published stories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch published stories',
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

// Get story with collaboration check
app.get('/api/stories/:id', authenticateToken, async (req, res) => {
  try {
    console.log(`📖 Fetching story ${req.params.id} for user ${req.user.id}`);
    
    const story = await Story.findById(req.params.id)
      .populate('author', 'username firstName lastName')
      .populate('collaborators.user', 'username firstName lastName');

    if (!story) {
      return res.status(404).json({ 
        success: false,
        message: 'Story not found' 
      });
    }

    console.log('Story author:', story.author);
    console.log('Requesting user:', req.user.id);

    // Check if user has access (owner or collaborator)
    const isOwner = story.author && story.author._id.toString() === req.user.id;
    const isCollaborator = story.collaborators && story.collaborators.some(
      collab => collab.user && collab.user._id.toString() === req.user.id
    );

    if (!isOwner && !isCollaborator) {
      console.log(`❌ Access denied for user ${req.user.id} to story ${req.params.id}`);
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    console.log(`✅ Story access granted for user ${req.user.id}`);
    res.json({
      success: true,
      story
    });
  } catch (error) {
    console.error('❌ Error fetching story:', error);
    res.status(500).json({ 
      message: 'Failed to create story',
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

// GET user by username
app.get('/api/users/:username', async (req, res) => {
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

// Publish chapters endpoint
app.put('/api/stories/:id/publish', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { publishedChapters } = req.body;

    // Find story and verify ownership
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
        message: 'Only the author can publish chapters' 
      });
    }

    // Update chapters publish status
    story.chapters = story.chapters.map((chapter, idx) => ({
      ...chapter,
      published: publishedChapters.includes(idx),
      publishedAt: publishedChapters.includes(idx) ? new Date() : chapter.publishedAt
    }));

    // Update story publish status
    story.published = story.chapters.some(ch => ch.published);
    if (story.published && !story.publishedAt) {
      story.publishedAt = new Date();
    }
    story.lastPublishedAt = new Date();
    story.publishedChapters = publishedChapters;

    await story.save();

    res.json({
      success: true,
      message: 'Chapters published successfully',
      story
    });

  } catch (error) {
    console.error('Error publishing chapters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish chapters',
      error: error.message
    });
  }
});

// Publish chapters endpoint
app.put('/api/stories/:id/publish', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { publishedChapters } = req.body;

    // Find story and verify ownership
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
        message: 'Only the author can publish chapters' 
      });
    }

    // Update chapters publish status
    story.chapters = story.chapters.map((chapter, idx) => ({
      ...chapter,
      published: publishedChapters.includes(idx),
      publishedAt: publishedChapters.includes(idx) ? new Date() : chapter.publishedAt
    }));

    // Update story publish status
    story.published = story.chapters.some(ch => ch.published);
    if (story.published && !story.publishedAt) {
      story.publishedAt = new Date();
    }
    story.lastPublishedAt = new Date();
    story.publishedChapters = publishedChapters;

    await story.save();

    res.json({
      success: true,
      message: 'Chapters published successfully',
      story
    });

  } catch (error) {
    console.error('Error publishing chapters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish chapters',
      error: error.message
    });
  }
});

// Update story endpoint
app.put('/api/stories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, language, chapters } = req.body;

    // Find the story and verify ownership/collaboration
    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if user has edit access (owner or collaborator)
    const isOwner = story.author.toString() === req.user.id;
    const isCollaborator = story.collaborators.some(
      collab => collab.user.toString() === req.user.id
    );

    if (!isOwner && !isCollaborator) {
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
        lastPublishedAt: story.published ? new Date() : story.lastPublishedAt,
        updatedAt: new Date()
      }
    },
    { new: true }
  );

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
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
