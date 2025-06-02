import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Story } from '../models/Story.js';
import jwt from 'jsonwebtoken';
import { authenticateToken, SECRET_KEY } from './authMiddleware.js';
import { Server } from 'socket.io';

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",           // Local development  
      "https://story-pad-two.vercel.app", // Vercel domain
      "https://story-pad-git-prod-alons-projects-8fad2814.vercel.app", // Vercel domain
      "https://*.vercel.app", // Allow all Vercel subdomains for texting 
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",           // Local development  
    "https://story-pad-two.vercel.app", // Vercel domain
    "https://story-pad-git-prod-alons-projects-8fad2814.vercel.app", // Vercel domain
    "https://*.vercel.app", // Allow all Vercel subdomains for testing
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
}));
app.use(express.json());

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
app.get('/', (req, res) => {
  res.send('✅ Express server is working with Socket.IO!');
});

// Auth endpoints
app.post('/api/signup', async (req, res) => {
  console.log('🚀 SIGNUP REQUEST RECEIVED');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Request headers:', req.headers);
  
  try {
    const { firstName, lastName, username, email, password } = req.body;
    
    console.log('📝 Extracted fields:');
    console.log('- firstName:', firstName);
    console.log('- lastName:', lastName);
    console.log('- username:', username);
    console.log('- email:', email);
    console.log('- password length:', password ? password.length : 'undefined');
    
    console.log('🔍 Checking for existing user...');
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      console.log('❌ User already exists with email:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }
    
    console.log('✅ No existing user found, creating new user...');

    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password,
      collaborationSettings: {
        allowInvitations: true,
        emailNotifications: true
      }
    });

    console.log('💾 Saving user to database...');
    await newUser.save();
    console.log('✅ User created successfully:', newUser._id);
    
    res.status(201).json({ 
      success: true, 
      message: 'User created successfully' 
    });
  } catch (error) {
    console.error('❌ DETAILED SIGNUP ERROR:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', error);
    
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

// Stories endpoint - Handle story creation
app.post('/api/stories', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Received new story request');
    console.log('Request body:', req.body);
    console.log('User from token:', req.user);
    
    const { title, description, category, language } = req.body;

    // Validate required fields
    if (!title || !description || !category || !language) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Use the authenticated user's ID
    const authorId = req.user.id;
    console.log('\n Author Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' Author ID:', authorId);
    console.log('Type: Authenticated User ID');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Create story with authenticated user as author
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
    console.log('- Author ID:', newStory.author);
    console.log('- Created at:', newStory.createdAt);

    // Return success response
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

// Get all users (with pagination and filtering)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    console.log(`👥 Fetching users - Page: ${page}, Limit: ${limit}, Search: ${search || 'none'}`);

    // Build search query
    let query = {};
    if (search) {
      query = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    // Get users with pagination
    const users = await User.find(query)
      .select('username firstName lastName email createdAt collaborationSettings')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    console.log(`✅ Found ${users.length} users out of ${total} total`);

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch users', 
      error: error.message 
    });
  }
});

// Get specific user by ID
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`👤 Fetching user details for ID: ${id}`);

    const user = await User.findById(id)
      .select('username firstName lastName email createdAt collaborationSettings');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ User found: ${user.username}`);

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch user', 
      error: error.message 
    });
  }
});

// Get current user profile
app.get('/api/users/me/profile', authenticateToken, async (req, res) => {
  try {
    console.log(`👤 Fetching profile for user: ${req.user.id}`);

    const user = await User.findById(req.user.id)
      .select('-password'); // Exclude password

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's story count
    const storyCount = await Story.countDocuments({ author: req.user.id });
    
    // Get collaborative story count
    const collaborativeStoryCount = await Story.countDocuments({
      'collaborators.user': req.user.id
    });

    console.log(`✅ Profile loaded: ${user.username} (${storyCount} stories, ${collaborativeStoryCount} collaborations)`);

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        stats: {
          storiesCreated: storyCount,
          collaborativeStories: collaborativeStoryCount
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch user profile', 
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
      success: false,
      message: 'Failed to fetch story', 
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
          published: ch.published || false
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

// Get collaborative stories endpoint
app.get('/api/user/:userId/collaborative-stories', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these stories'
      });
    }

    console.log(`📚 Fetching collaborative stories for user: ${userId}`);

    // Find stories where user is a collaborator
    const stories = await Story.find({
      'collaborators.user': userId
    })
    .populate('author', 'username firstName lastName')
    .populate('collaborators.user', 'username firstName lastName')
    .select('title description category language published chapters createdAt updatedAt author collaborators')
    .sort({ updatedAt: -1 });

    console.log(`✅ Found ${stories.length} collaborative stories`);

    res.json({
      success: true,
      stories
    });

  } catch (error) {
    console.error('❌ Error fetching collaborative stories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collaborative stories',
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

// ==================== COLLABORATION ENDPOINTS ====================

// Invite a user to collaborate on a story
app.post('/api/stories/:id/invite', authenticateToken, async (req, res) => {
  try {
    const { userEmail, role = 'editor' } = req.body;
    const storyId = req.params.id;

    console.log(`📨 Invitation request for story ${storyId}`);
    console.log(`- Inviting: ${userEmail}`);
    console.log(`- Role: ${role}`);

    // Find the story
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if user is the owner
    if (story.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the story owner can invite collaborators' });
    }

    // Find the user to invite
    const userToInvite = await User.findOne({ email: userEmail });
    if (!userToInvite) {
      return res.status(404).json({ message: 'User not found with that email' });
    }

    // Don't invite yourself
    if (userToInvite._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot invite yourself' });
    }

    // Check if user is already a collaborator
    const isAlreadyCollaborator = story.collaborators.some(
      collab => collab.user.toString() === userToInvite._id.toString()
    );
    if (isAlreadyCollaborator) {
      return res.status(400).json({ message: 'User is already a collaborator' });
    }

    // Check if invitation already exists and is pending
    const existingInvitation = story.pendingInvitations.find(
      inv => inv.invitedUser.toString() === userToInvite._id.toString() && inv.status === 'pending'
    );
    if (existingInvitation) {
      return res.status(400).json({ message: 'Invitation already sent and pending' });
    }

    // Add the invitation
    story.pendingInvitations.push({
      invitedUser: userToInvite._id,
      invitedBy: req.user.id,
      role: role
    });

    await story.save();

    console.log('✅ Invitation sent successfully');
    res.json({
      success: true,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('❌ Error sending invitation:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user's pending invitations
app.get('/api/invitations', authenticateToken, async (req, res) => {
  try {
    console.log(`📋 Fetching invitations for user ${req.user.id}`);

    const stories = await Story.find({
      'pendingInvitations.invitedUser': req.user.id,
      'pendingInvitations.status': 'pending'
    }).populate('author', 'username firstName lastName')
      .populate('pendingInvitations.invitedBy', 'username firstName lastName');

    const invitations = [];
    stories.forEach(story => {
      story.pendingInvitations.forEach(invitation => {
        if (invitation.invitedUser.toString() === req.user.id && invitation.status === 'pending') {
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
        }
      });
    });

    console.log(`✅ Found ${invitations.length} pending invitations`);
    res.json({
      success: true,
      invitations
    });
  } catch (error) {
    console.error('❌ Error fetching invitations:', error);
    res.status(500).json({ message: error.message });
  }
});

// Respond to an invitation (accept/decline)
app.put('/api/stories/:storyId/invitations/:invitationId', authenticateToken, async (req, res) => {
  try {
    const { storyId, invitationId } = req.params;
    const { response } = req.body; // 'accepted' or 'declined'

    console.log(`📝 Responding to invitation ${invitationId}`);
    console.log(`- Story: ${storyId}`);
    console.log(`- Response: ${response}`);

    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({ message: 'Response must be "accepted" or "declined"' });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    const invitation = story.pendingInvitations.id(invitationId);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (invitation.invitedUser.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only respond to your own invitations' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: 'This invitation has already been responded to' });
    }

    // Update invitation status
    invitation.status = response;
    invitation.respondedAt = new Date();

    // If accepted, add user as collaborator
    if (response === 'accepted') {
      story.collaborators.push({
        user: req.user.id,
        role: invitation.role
      });
      console.log(`✅ User added as ${invitation.role} collaborator`);
    }

    await story.save();

    res.json({
      success: true,
      message: `Invitation ${response} successfully`
    });
  } catch (error) {
    console.error('❌ Error responding to invitation:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get story collaborators
app.get('/api/stories/:id/collaborators', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('author', 'username firstName lastName email')
      .populate('collaborators.user', 'username firstName lastName email')
      .populate('pendingInvitations.invitedUser', 'username firstName lastName email')
      .populate('pendingInvitations.invitedBy', 'username firstName lastName email');

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if user has access to view collaborators
    const hasAccess = story.author._id.toString() === req.user.id ||
      story.collaborators.some(collab => collab.user._id.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      collaborators: {
        owner: story.author,
        collaborators: story.collaborators,
        pendingInvitations: story.pendingInvitations.filter(inv => inv.status === 'pending')
      }
    });
  } catch (error) {
    console.error('❌ Error fetching collaborators:', error);
    res.status(500).json({ message: error.message });
  }
});

// Search users by username (for collaboration invites)
app.get('/api/users/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({
        success: true,
        users: []
      });
    }

    console.log(`🔍 Searching users with query: "${query}"`);

    // Search for users whose username contains the query (case insensitive)
    const users = await User.find({
      $and: [
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { firstName: { $regex: query, $options: 'i' } },
            { lastName: { $regex: query, $options: 'i' } }
          ]
        },
        { _id: { $ne: req.user.id } } // Exclude current user
      ]
    })
    .select('username firstName lastName email')
    .limit(10); // Limit results to 10

    console.log(`✅ Found ${users.length} users matching "${query}"`);

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('❌ Error searching users:', error);
    res.status(500).json({ message: error.message });
  }
});

// Server startup
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    // Use the HTTP server instead of app.listen
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT} with Socket.IO support`);
    });
  } catch (error) {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  }
};

startServer();

export default app;