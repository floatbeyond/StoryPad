import http from 'http';
import express from 'express';
import cors from 'cors';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

const app = express();
app.use(cors());
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

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    // For demo: plain text password check (not secure, but matches your signup logic)
    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    res.json({ username: user.username });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Ensure the app is exported for use in the server setup
export default app;

const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// התחברות למסד הנתונים
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });