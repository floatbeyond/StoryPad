import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { initializeSocket } from './config/socket.js';

// Import routes
import authRoutes from './routes/auth.js';
import storyRoutes from './routes/stories.js';
import userRoutes from './routes/users.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// CORS configuration
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "http://localhost:5173",
    "https://story-pad-two.vercel.app",
    "https://story-pad-alons-projects-8fad2814.vercel.app",
    "https://story-pad-git-main-alons-projects-8fad2814.vercel.app",
    "https://*.vercel.app"
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} from ${req.get('origin') || 'unknown'}`);
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('✅ StoryPad API is running!');
});

// Route handlers
app.use('/api', authRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/user', userRoutes);

// Legacy endpoints for backward compatibility
app.get('/api/invitations', (req, res) => {
  res.json({ invitations: [] });
});

// Connect to DB and start server
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  }
};

startServer();
