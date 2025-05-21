import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
  title:   { type: String, required: true },
  content: { type: String, required: true }
});

const storySchema = new mongoose.Schema({
  title:       { type: String, required: true },         // Book title
  description: { type: String, required: true },         // Book description
  category:    { type: String, required: true },         // Category
  language:    { type: String, required: true },         // Language
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Story creator (user)
  chapters:    { type: [chapterSchema], default: [] },   // Array of chapters (each chapter: title and content)
  published:   { type: Boolean, default: false }         // Published status
}, { timestamps: true });

export const Story = mongoose.model('Story', storySchema);