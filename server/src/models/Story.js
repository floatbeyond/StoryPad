import mongoose from 'mongoose';

const DEFAULT_COVER_URL = process.env.DEFAULT_COVER_URL

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const chapterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  published: { type: Boolean, default: false },
  publishedAt: { type: Date },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastEditedAt: { type: Date, default: Date.now },
  comments: { type: [commentSchema], default: [] }
});

// Schema for active collaborators
const collaboratorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
  joinedAt: { type: Date, default: Date.now }
});

// Schema for pending invitations
const invitationSchema = new mongoose.Schema({
  invitedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['editor', 'viewer'], default: 'editor' },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  invitedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date }
});

const storySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: [String], required: true },
  language: { type: String, required: true },
  cover: { 
    type: String, 
    default: DEFAULT_COVER_URL // Use environment variable
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Original creator
  collaborators: [collaboratorSchema], // Active collaborators
  pendingInvitations: [invitationSchema], // Pending invitations
  chapters: { type: [chapterSchema], default: [] },
  published: { type: Boolean, default: false },
  publishedAt: { type: Date },  
  lastPublishedAt: { type: Date },  
  publishedChapters: [Number], 
  completed: { type: Boolean, default: false }, 
  completedAt: { type: Date },                 
  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]  
}, { timestamps: true });

storySchema.index({ published: 1, category: 1, publishedAt: -1 });

export const Story = mongoose.model('Story', storySchema);