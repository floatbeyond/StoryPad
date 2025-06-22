import express from 'express';
import { Story } from '../models/Story.js';
import { User } from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload, cloudinary } from '../config/upload.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';

const router = express.Router();

// Default cover endpoint
router.get('/default-cover', (req, res) => {
  const defaultCoverUrl = process.env.DEFAULT_COVER_URL || 'https://via.placeholder.com/400x600/cccccc/ffffff?text=No+Cover';
  res.redirect(defaultCoverUrl);
});

// Create story
router.post('/', authenticateToken, upload.single('cover'), async (req, res) => {
  try {
    const { title, description, category, language, coverUrl } = req.body;
    
    // Handle cover image logic properly
    let coverImage;
    
    if (req.file) {
      // File was uploaded
      coverImage = req.file.path;
    } else if (req.body.cover && req.body.cover.startsWith('http')) {
      // Cover URL was sent as 'cover' field (your current approach)
      coverImage = req.body.cover;
    } else if (coverUrl) {
      // Cover URL was sent as 'coverUrl' field (fallback)
      coverImage = coverUrl;
    } else {
      // Use default
      coverImage = process.env.DEFAULT_COVER_URL;
    }

    if (!title || !description || !Array.isArray(JSON.parse(category)) || JSON.parse(category).length === 0 || !language) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required and category must be an array' 
      });
    }

    const authorId = req.user.id;

    const newStory = new Story({
      title,
      description,
      category: JSON.parse(category),
      language,
      author: authorId,
      cover: coverImage,
      chapters: [],
      published: false,
      publishedAt: null,
      lastPublishedAt: null,
      publishedChapters: [],
      views: 0
    });

    await newStory.save();

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

// Get all published stories (stories with at least one published chapter)
router.get('/published', async (req, res) => {
  try {
    const stories = await Story.find({ 
      published: true, // Story is marked as published
      'chapters.published': true // AND has at least one published chapter
    })
    .populate('author', 'username firstName lastName')
    .select('title description category language author publishedAt chapters cover completed views likes')
    .sort('-lastPublishedAt -publishedAt -createdAt');

    // Process stories to only show published chapters and add chapter stats
    const processedStories = stories.map(story => {
      const publishedChapters = story.chapters.filter(ch => ch.published);
      const totalChapters = story.chapters.length;
      
      return {
        ...story.toObject(),
        chapters: publishedChapters, // Only show published chapters
        chapterStats: {
          published: publishedChapters.length,
          total: totalChapters,
          status: publishedChapters.length === totalChapters ? 'Complete' : 'Ongoing'
        },
        latestChapter: publishedChapters.length > 0 ? {
          title: publishedChapters[publishedChapters.length - 1].title,
          publishedAt: publishedChapters[publishedChapters.length - 1].publishedAt
        } : null
      };
    });

    res.json({
      success: true,
      stories: processedStories
    });

  } catch (error) {
    console.error('❌ Error fetching published stories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch published stories',
      error: error.message
    });
  }
});

// Get all stories
router.get('/', async (req, res) => {
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

// Get single story (public access for published stories, auth for unpublished)
router.get('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('author', 'username firstName lastName')
      .populate('collaborators', 'username firstName lastName')
      .populate('chapters');

    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    // Check if authentication is provided (optional)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let user = null;

    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        // Invalid token, treat as unauthenticated user
      }
    }

    // Permission logic
    const isOwner = user && story.author._id.toString() === user.id;
    const isCollaborator = user && story.collaborators?.some(
      collab => collab._id.toString() === user.id
    );
    const isAdmin = user && user.role === 'admin';
    const isPublished = story.published;
    const isAuthenticated = !!user;

    // Access rules for unpublished stories
    if (!isPublished && !isOwner && !isCollaborator && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to access this story' 
      });
    }

    // For published stories, provide preview or full access
    let responseStory = { ...story.toObject() };
    let requiresAuth = false;

    // Only show preview if story is published AND user is NOT authenticated
    if (isPublished && !isAuthenticated) {
      // Provide preview for non-authenticated users ONLY
      requiresAuth = true;
      
      if (responseStory.chapters && responseStory.chapters.length > 0) {
        responseStory.chapters = responseStory.chapters.map((chapter, index) => {
          if (index === 0) {
            // First chapter: show preview (first 3 paragraphs or 500 characters)
            const content = chapter.content || '';
            const paragraphs = content.split('\n\n');
            
            let previewContent = '';
            if (paragraphs.length >= 3) {
              previewContent = paragraphs.slice(0, 3).join('\n\n');
            } else {
              previewContent = content.substring(0, 500);
            }
            
            if (previewContent.length < content.length) {
              previewContent += '\n\n[LOGIN_TO_CONTINUE]';
            }
            
            return {
              ...chapter,
              content: previewContent,
              isPreview: true,
              hasMore: previewContent.length < content.length
            };
          } else {
            // Other chapters: show title only
            return {
              _id: chapter._id,
              title: chapter.title,
              published: chapter.published,
              isPreview: true,
              content: '[Please log in to read this chapter]'
            };
          }
        });
      }
    } else {
      // For authenticated users OR unpublished stories (with proper access), show full content
      if (responseStory.chapters) {
        responseStory.chapters = responseStory.chapters.map(chapter => ({
          ...chapter,
          isPreview: false
        }));
      }
    }

    // Increment views (only for published stories and if not the author)
    if (isPublished && (!user || !isOwner)) {
      story.views = (story.views || 0) + 1;
      await story.save();
    }

    res.json({ 
      success: true, 
      story: responseStory,
      requiresAuth,
      isPreview: requiresAuth,
      isAuthenticated,
      message: requiresAuth ? 'Preview mode - login for full access' : null
    });
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update story
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

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
    const isCollaborator = story.collaborators && story.collaborators.some(
      collab => collab.user && collab.user.toString() === req.user.id
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this story'
      });
    }

    // Update the story directly with all provided fields
    const updatedStory = await Story.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('author', 'username firstName lastName');

    if (!updatedStory) {
      return res.status(404).json({
        success: false,
        message: 'Story not found after update'
      });
    }
    
    res.json({ 
      success: true,
      message: 'Story updated successfully',
      story: updatedStory
    });

  } catch (error) {
    console.error('❌ Error updating story:', error);
    res.status(500).json({
      success: false,
      message: 'Update failed',
      error: error.message
    });
  }
});

// Update story cover (handles both file upload and URL)
router.put('/:id/cover', authenticateToken, upload.single('cover'), async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    // Check permissions
    const isOwner = story.author.toString() === req.user.id;
    const isCollaborator = story.collaborators?.some(
      collab => collab.toString() === req.user.id
    );
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isCollaborator && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    let coverUrl;

    // Check if this is a URL update (no file uploaded)
    if (req.body.coverUrl && !req.file) {
      coverUrl = req.body.coverUrl;
    } 
    // Handle file upload
    else if (req.file) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: `storypad/covers/user-uploads/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        public_id: `${req.user.id}_${Date.now()}`,
        transformation: [
          { width: 400, height: 600, crop: 'fill', gravity: 'center' },
          { quality: 'auto:good' },
          { format: 'auto' }
        ]
      });

      coverUrl = result.secure_url;

      // Clean up temp file
      fs.unlinkSync(req.file.path);
    } else {
      return res.status(400).json({ success: false, message: 'No cover URL or file provided' });
    }

    // Update story
    story.cover = coverUrl;
    await story.save();

    res.json({ 
      success: true, 
      message: 'Cover updated successfully',
      cover: coverUrl,
      coverUrl: coverUrl
    });

  } catch (error) {
    console.error('❌ Error updating cover:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Complete story endpoint
router.put('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    if (story.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this story'
      });
    }

    story.completed = true;
    story.completedAt = new Date();
    await story.save();

    const updatedStory = await Story.findById(req.params.id)
      .populate('author', 'username firstName lastName');

    res.json({
      success: true,
      message: 'Story marked as complete',
      story: updatedStory
    });

  } catch (error) {
    console.error('❌ Error completing story:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete story',
      error: error.message
    });
  }
});

// Get collaborators for a story
router.get('/:id/collaborators', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('collaborators.user', 'username firstName lastName email')
      .populate('pendingInvitations.invitedUser', 'username firstName lastName email')
      .populate('pendingInvitations.invitedBy', 'username firstName lastName');

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if user has access
    const userId = req.user.id;
    const isOwner = story.author.toString() === userId;
    const isCollaborator = story.collaborators?.some(
      collab => collab.user._id.toString() === userId
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Filter pending invitations to only include those with 'pending' status
    const pendingInvitations = story.pendingInvitations.filter(
      inv => inv.status === 'pending'
    );

    res.json({
      success: true,
      collaborators: story.collaborators || [],
      pendingInvitations: pendingInvitations
    });

  } catch (error) {
    console.error('Error fetching collaborators:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collaborators',
      error: error.message
    });
  }
});

// Invite collaborator
router.post('/:id/invite', authenticateToken, async (req, res) => {
  try {
    const { userEmail, role } = req.body;
    const storyId = req.params.id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if user is the owner
    if (story.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the story owner can send invitations'
      });
    }

    // Find the user to invite
    const userToInvite = await User.findOne({ email: userEmail });
    if (!userToInvite) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already a collaborator
    const isAlreadyCollaborator = story.collaborators.some(
      collab => collab.user.toString() === userToInvite._id.toString()
    );

    if (isAlreadyCollaborator) {
      return res.status(400).json({
        success: false,
        message: 'User is already a collaborator'
      });
    }

    // Check if invitation already exists and is pending
    const hasPendingInvitation = story.pendingInvitations.some(
      inv => inv.invitedUser.toString() === userToInvite._id.toString() && inv.status === 'pending'
    );

    if (hasPendingInvitation) {
      return res.status(400).json({
        success: false,
        message: 'Invitation already sent to this user'
      });
    }

    // Add invitation
    story.pendingInvitations.push({
      invitedUser: userToInvite._id,
      invitedBy: req.user.id,
      role: role,
      status: 'pending',
      invitedAt: new Date()
    });

    await story.save();

    res.json({
      success: true,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invitation',
      error: error.message
    });
  }
});

// Publish chapters
router.put('/:id/publish', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { publishedChapters } = req.body;

    // Find story and verify ownership
    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({ 
        success: false, 
        message: 'Story not found' 
      });
    }

    if (story.author.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only the author can publish chapters' 
      });
    }

    // Update chapters publish status
    story.chapters = story.chapters.map((chapter, idx) => ({
      ...chapter,
      published: publishedChapters.includes(idx),
      publishedAt: publishedChapters.includes(idx) ? new Date() : chapter.publishedAt
    }));

    // Update story publish status
    story.published = story.chapters.some(ch => ch.published);
    if (story.published && !story.publishedAt) {
      story.publishedAt = new Date();
    }
    story.lastPublishedAt = new Date();
    story.publishedChapters = publishedChapters;

    await story.save();

    res.json({
      success: true,
      message: 'Chapters published successfully',
      story
    });

  } catch (error) {
    console.error('Error publishing chapters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish chapters',
      error: error.message
    });
  }
});

// Remove collaborator
router.delete('/:id/collaborators/:collaboratorId', authenticateToken, async (req, res) => {
  try {
    const { id: storyId, collaboratorId } = req.params;
    const userId = req.user.id;

    console.log('🗑️ Removing collaborator:', collaboratorId, 'from story:', storyId);

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if user is the owner
    if (story.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the story owner can remove collaborators'
      });
    }

    // Find and remove the collaborator
    const collaboratorIndex = story.collaborators.findIndex(
      collab => collab._id.toString() === collaboratorId
    );

    if (collaboratorIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Collaborator not found'
      });
    }

    story.collaborators.splice(collaboratorIndex, 1);
    await story.save();

    console.log('✅ Collaborator removed successfully');

    res.json({
      success: true,
      message: 'Collaborator removed successfully'
    });

  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove collaborator',
      error: error.message
    });
  }
});

// Cancel invitation
router.delete('/:id/invitations/:invitationId', authenticateToken, async (req, res) => {
  try {
    const { id: storyId, invitationId } = req.params;
    const userId = req.user.id;

    console.log('❌ Cancelling invitation:', invitationId, 'for story:', storyId);

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if user is the owner
    if (story.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the story owner can cancel invitations'
      });
    }

    // Find and remove the invitation
    const invitationIndex = story.pendingInvitations.findIndex(
      inv => inv._id.toString() === invitationId
    );

    if (invitationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    story.pendingInvitations.splice(invitationIndex, 1);
    await story.save();

    console.log('✅ Invitation cancelled successfully');

    res.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel invitation',
      error: error.message
    });
  }
});

// Respond to invitation 
router.put('/:storyId/invitations/:invitationId', authenticateToken, async (req, res) => {
  try {
    const { storyId, invitationId } = req.params;
    const { response } = req.body;
    const userId = req.user.id;

    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid response. Must be "accepted" or "declined"'
      });
    }

    // Find the story with this invitation
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Find the specific invitation
    const invitationIndex = story.pendingInvitations.findIndex(
      inv => inv._id.toString() === invitationId && 
             inv.invitedUser.toString() === userId
    );

    if (invitationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    const invitation = story.pendingInvitations[invitationIndex];

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Invitation is no longer valid'
      });
    }

    if (response === 'accepted') {
      // Add user as collaborator
      story.collaborators.push({
        user: userId,
        role: invitation.role,
        joinedAt: new Date()
      });
    }

    // Update invitation status
    invitation.status = response;
    invitation.respondedAt = new Date();

    await story.save();

    res.json({
      success: true,
      message: `Invitation ${response} successfully`,
      response
    });

  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to invitation',
      error: error.message
    });
  }
});

// Get comments for a chapter (last 3 or all)
router.get('/:storyId/chapters/:chapterId/comments', async (req, res) => {
  try {
    const { storyId, chapterId } = req.params;
    const { all } = req.query;
    const story = await Story.findById(storyId); // Removed populate
    if (!story) return res.status(404).json({ success: false, message: 'Story not found' });
    const chapter = story.chapters.id(chapterId);
    if (!chapter) return res.status(404).json({ success: false, message: 'Chapter not found' });
    let comments = chapter.comments || [];
    if (!all) comments = comments.slice(-3); // last 3 by default
    res.json({ success: true, comments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch comments', error: err.message });
  }
});

// Add a comment to a chapter
router.post('/:storyId/chapters/:chapterId/comments', authenticateToken, async (req, res) => {
  try {
    const { storyId, chapterId } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ success: false, message: 'Comment text required' });
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found' });
    const chapter = story.chapters.id(chapterId);
    if (!chapter) return res.status(404).json({ success: false, message: 'Chapter not found' });
    const user = req.user;
    chapter.comments.push({ user: user.id, username: user.username, text });
    await story.save();
    res.status(201).json({ success: true, comment: chapter.comments[chapter.comments.length - 1] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add comment', error: err.message });
  }
});

// Like a story
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found' });
    const userId = req.user.id;
    if (story.likes.includes(userId)) {
      return res.status(400).json({ success: false, message: 'Already liked' });
    }
    story.likes.push(userId);
    await story.save();
    res.json({ success: true, likes: story.likes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to like story', error: err.message });
  }
});

// Unlike a story
router.post('/:id/unlike', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found' });
    const userId = req.user.id;
    const idx = story.likes.indexOf(userId);
    if (idx === -1) {
      return res.status(400).json({ success: false, message: 'Not liked yet' });
    }
    story.likes.splice(idx, 1);
    await story.save();
    res.json({ success: true, likes: story.likes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to unlike story', error: err.message });
  }
});

// Get story for editing (collaborators and owners only)
router.get('/:id/edit', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('author', 'username firstName lastName email')
      .populate('collaborators.user', 'username firstName lastName email')
      .populate('chapters');

    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    // Check permissions for editing
    const isOwner = story.author._id.toString() === req.user.id.toString();
    const isCollaborator = story.collaborators?.some(
      collab => collab.user._id.toString() === req.user.id.toString() 
    );
    const isAdmin = req.user.role === 'admin';

    // Only owners, collaborators, or admins can edit
    if (!isOwner && !isCollaborator && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to edit this story' 
      });
    }

    // Return full story data for editing
    res.json({ 
      success: true, 
      story: story.toObject(),
      permissions: {
        isOwner,
        isCollaborator,
        isAdmin,
        canEdit: true
      }
    });

  } catch (error) {
    console.error('❌ Error fetching story for editing:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// In your add collaborator route, ensure consistent ID format:
router.put('/:id/collaborators', authenticateToken, async (req, res) => {
  try {
    const { collaboratorUsername } = req.body;
    
    // Find the collaborator user
    const collaborator = await User.findOne({ username: collaboratorUsername });
    if (!collaborator) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    // Check if user is already a collaborator
    const isAlreadyCollaborator = story.collaborators?.some(
      collab => collab.toString() === collaborator._id.toString() // ✅ Consistent comparison
    );

    if (isAlreadyCollaborator) {
      return res.status(400).json({ success: false, message: 'User is already a collaborator' });
    }

    // Add collaborator (store as ObjectId)
    story.collaborators = story.collaborators || [];
    story.collaborators.push(collaborator._id); // ✅ Store ObjectId
    
    await story.save();

    console.log(`✅ Added collaborator ${collaborator.username} (${collaborator._id}) to story ${story._id}`);

    res.json({ 
      success: true, 
      message: 'Collaborator added successfully',
      collaborator: {
        id: collaborator._id,
        username: collaborator.username
      }
    });

  } catch (error) {
    console.error('❌ Error adding collaborator:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Accept invitation route - using embedded schema
router.post('/invitations/:invitationId/accept', authenticateToken, async (req, res) => {
  try {
    const invitationId = req.params.invitationId;
    
    // Find story with the pending invitation
    const story = await Story.findOne({
      'pendingInvitations._id': invitationId,
      'pendingInvitations.invitedUser': req.user.id,
      'pendingInvitations.status': 'pending'
    }).populate('author', 'username firstName lastName email');

    if (!story) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invitation not found or already processed' 
      });
    }

    // Find the specific invitation
    const invitation = story.pendingInvitations.id(invitationId);
    
    if (!invitation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invitation not found' 
      });
    }

    // Check if user is already a collaborator
    const isAlreadyCollaborator = story.collaborators?.some(
      collab => collab.user.toString() === req.user.id
    );

    if (!isAlreadyCollaborator) {
      // Add user as collaborator
      story.collaborators = story.collaborators || [];
      story.collaborators.push({
        user: req.user.id,
        role: invitation.role,
        joinedAt: new Date()
      });
    }

    // Update invitation status
    invitation.status = 'accepted';
    invitation.respondedAt = new Date();

    await story.save();

    res.json({ 
      success: true, 
      message: 'Invitation accepted successfully',
      redirectUrl: `/story/${story._id}/edit`
    });

  } catch (error) {
    console.error('❌ Error accepting invitation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete own story (Story owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({ 
        success: false, 
        message: 'Story not found' 
      });
    }

    // Only story owner can delete (not admin via this route)
    if (story.author.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Permission denied. Only the story owner can delete this story.' 
      });
    }

    await Story.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'Story deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

export default router;