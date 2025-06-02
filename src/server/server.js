
import http from 'http';
import express from 'express';
import cors from 'cors';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { authenticateToken, SECRET_KEY } from './authMiddleware.js';
import { Story } from '../models/Story.js';

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Accept']
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ Express server is working!');
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  const { firstName, lastName, username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ username: user.username, token });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
app.put('/api/users/:username', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const updateFields = { firstName, lastName, email };

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.password = hashedPassword;
    }

    const updatedUser = await User.findOneAndUpdate(
      { username: req.params.username },
      updateFields,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      username: updatedUser.username,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
    });
  } catch (error) {
    console.error("Update failed:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user profile
app.get('/api/users/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      username: user.username,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      bio: user.bio || "",
      profileImage: user.profileImage || "",
      joined: user.createdAt,
      storiesCount: 0,
      followers: 0,
      likes: 0,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Stories endpoint
app.post('/api/stories', async (req, res) => {
  try {
    console.log('📝 Received new story request');
    const { title, description, category, language } = req.body;

    const authorId = req.user?._id || '65432109876543210987654321';
    const newStory = new Story({
      title,
      description,
      category,
      language,
      author: authorId,
      chapters: [],
      published: false
    });

    await newStory.save();
    res.status(201).json({ message: 'Story created successfully', story: newStory });
  } catch (error) {
    console.error('Story creation error:', error);
    res.status(500).json({ message: 'Failed to create story', error: error.message });
  }
});

// Chapter content
app.get('/api/story/:id/chapter/:chapterId', authenticateToken, async (req, res) => {
  const { id, chapterId } = req.params;
  res.json({
    chapterId,
    content: `<p>This is the full content for chapter ${chapterId} of story ${id}.</p>`
  });
});

export default app;

const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

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
