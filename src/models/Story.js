import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  published: { type: Boolean, default: false },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastEditedAt: { type: Date, default: Date.now }
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
  category: { type: String, required: true },
  language: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Original creator
  collaborators: [collaboratorSchema], // Active collaborators
  pendingInvitations: [invitationSchema], // Pending invitations
  chapters: { type: [chapterSchema], default: [] },
  published: { type: Boolean, default: false }
}, { timestamps: true });

export const Story = mongoose.model('Story', storySchema);