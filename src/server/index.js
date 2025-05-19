import express from 'express';
import dotenv from 'dotenv';
import connectToMongo from '../config/db.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ API is working!');
});

connectToMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
});
