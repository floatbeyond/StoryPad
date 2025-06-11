import mongoose from 'mongoose';

const readingProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  currentChapter: { type: mongoose.Schema.Types.ObjectId, required: true },
  chapterIndex: { type: Number, required: true },
  scrollPosition: { type: Number, default: 0 },
  lastReadAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Ensure one progress record per user per story
readingProgressSchema.index({ user: 1, story: 1 }, { unique: true });

export default mongoose.model('ReadingProgress', readingProgressSchema);