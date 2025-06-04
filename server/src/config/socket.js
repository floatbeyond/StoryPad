import { Server } from 'socket.io';

// Real-time collaboration tracking
const activeUsers = new Map(); // Track users per story
const cursorPositions = new Map(); // Track cursor positions

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://story-pad-two.vercel.app",
        "https://story-pad-git-prod-alons-projects-8fad2814.vercel.app",
        "https://*.vercel.app"
      ],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true
    }
  });

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

  return io;
};