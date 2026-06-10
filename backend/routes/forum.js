const express = require('express');
const router = express.Router();
const { ForumThread, Comment } = require('../models/forum');
const { broadcastToThread } = require('../websocket');

const CATEGORIES = ['General', 'Race Discussion', 'Technical', 'News', 'Off-Topic'];
const TITLE_MAX = 200;
const CONTENT_MAX = 10000;
const COMMENT_MAX = 5000;

// Helper function to calculate score with null checks
const calculateScore = (entity) => {
  const likesCount = entity.likes ? entity.likes.length : 0;
  const dislikesCount = entity.dislikes ? entity.dislikes.length : 0;
  return likesCount - dislikesCount;
};

// Returns an error string if the thread payload is invalid, else null.
const validateThread = ({ title, content, category }) => {
  if (!title || !title.trim()) return 'Title is required';
  if (title.trim().length > TITLE_MAX) return `Title must be ${TITLE_MAX} characters or fewer`;
  if (!content || !content.trim()) return 'Content is required';
  if (content.trim().length > CONTENT_MAX) return `Content must be ${CONTENT_MAX} characters or fewer`;
  if (!CATEGORIES.includes(category)) return 'Invalid category';
  return null;
};

const validateComment = (content) => {
  if (!content || !content.trim()) return 'Comment cannot be empty';
  if (content.trim().length > COMMENT_MAX) return `Comment must be ${COMMENT_MAX} characters or fewer`;
  return null;
};

// Get all threads with proper like/dislike scoring
router.get('/threads', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const tag = req.query.tag;
    const sort = req.query.sort || 'newest';

    const query = {};
    if (category) query.category = category;
    if (tag) query.tags = tag;

    // Free-text search across title + tags (regex-escaped; no text index needed).
    const q = (req.query.q || '').trim();
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: rx }, { tags: rx }];
    }

    // Handle "popular" sort with aggregation for better performance
    if (sort === 'popular') {
      const threads = await ForumThread.aggregate([
        { $match: query },
        {
          $addFields: {
            score: {
              $subtract: [
                { $size: { $ifNull: ["$likes", []] } },
                { $size: { $ifNull: ["$dislikes", []] } }
              ]
            }
          }
        },
        { $sort: { score: -1, createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author'
          }
        },
        { $unwind: '$author' },
        {
          $addFields: {
            likes: { $ifNull: ["$likes", []] },
            dislikes: { $ifNull: ["$dislikes", []] }
          }
        },
        {
          $project: {
            _id: 1,
            title: 1,
            content: 1,
            category: 1,
            tags: 1,
            likes: 1,
            dislikes: 1,
            views: 1,
            commentCount: 1,
            createdAt: 1,
            lastActivity: 1,
            score: 1,
            'author._id': 1,
            'author.username': 1
          }
        }
      ]);

      const total = await ForumThread.countDocuments(query);
      return res.json({
        threads,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalThreads: total
      });
    }

    // Handle other sorts with simple sorting
    let sortOptions = {};
    switch (sort) {
      case 'newest':
      case 'latest':
        sortOptions = { createdAt: -1 };
        break;
      case 'lastActivity':
        sortOptions = { lastActivity: -1 };
        break;
      case 'mostViews':
        sortOptions = { views: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const threads = await ForumThread.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'username')
      .lean();

    // Ensure likes and dislikes arrays exist and add score to each thread
    threads.forEach(thread => {
      thread.likes = thread.likes || [];
      thread.dislikes = thread.dislikes || [];
      thread.score = calculateScore(thread);
    });

    const total = await ForumThread.countDocuments(query);
    res.json({
      threads,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalThreads: total
    });
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json({ message: 'Error fetching threads' });
  }
});

// Create new thread
router.post('/threads', async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;

    const invalid = validateThread({ title, content, category });
    if (invalid) return res.status(400).json({ message: invalid });

    const thread = new ForumThread({
      title: title.trim(),
      content: content.trim(),
      category,
      tags: Array.isArray(tags) ? tags : [],
      author: req.user.userId,
      likes: [],
      dislikes: [],
      lastActivity: new Date()
    });

    await thread.save();
    await thread.populate('author', 'username');
    res.status(201).json(thread);
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ message: 'Error creating thread' });
  }
});

// Update thread
router.put('/threads/:id', async (req, res) => {
  try {
    const thread = await ForumThread.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    if (thread.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this thread' });
    }

    const { title, content, category, tags } = req.body;
    const invalid = validateThread({ title, content, category });
    if (invalid) return res.status(400).json({ message: invalid });

    thread.title = title.trim();
    thread.content = content.trim();
    thread.category = category;
    thread.tags = Array.isArray(tags) ? tags : [];

    await thread.save();
    await thread.populate('author', 'username');
    res.json(thread);
  } catch (error) {
    console.error('Error updating thread:', error);
    res.status(500).json({ message: 'Error updating thread' });
  }
});

// Delete thread
router.delete('/threads/:id', async (req, res) => {
  try {
    const thread = await ForumThread.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    if (thread.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this thread' });
    }

    // Delete all comments in this thread first
    await Comment.deleteMany({ thread: thread._id });
    await ForumThread.findByIdAndDelete(thread._id);

    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Error deleting thread:', error);
    res.status(500).json({ message: 'Error deleting thread' });
  }
});

// Get thread with nested comments - Fixed to properly handle replies
router.get('/threads/:id', async (req, res) => {
  try {
    const thread = await ForumThread.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author', 'username');

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Get all comments for this thread (indexed on { thread, createdAt }), build the full
    // reply tree, then return a *page* of top-level roots (with their nested replies intact)
    // so busy threads don't ship hundreds of root comments at once.
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const allComments = await Comment.find({ thread: thread._id })
      .populate('author', 'username')
      .sort({ createdAt: 1 })
      .lean();

    // Organize comments with replies
    const commentsMap = new Map();
    const topLevelComments = [];

    // First pass: create map of all comments
    allComments.forEach(comment => {
      comment.likes = comment.likes || [];
      comment.dislikes = comment.dislikes || [];
      comment.score = calculateScore(comment);
      comment.replies = [];
      commentsMap.set(comment._id.toString(), comment);
    });

    // Second pass: organize into tree structure
    allComments.forEach(comment => {
      if (comment.parentComment) {
        const parent = commentsMap.get(comment.parentComment.toString());
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        topLevelComments.push(comment);
      }
    });

    const topLevelTotal = topLevelComments.length;
    const pagedRoots = topLevelComments.slice((page - 1) * limit, page * limit);

    // Ensure thread has likes and dislikes arrays and add score
    thread.likes = thread.likes || [];
    thread.dislikes = thread.dislikes || [];
    thread.score = calculateScore(thread);

    res.json({
      thread,
      comments: pagedRoots,
      commentsPage: page,
      commentsTotalPages: Math.ceil(topLevelTotal / limit) || 1,
      topLevelTotal
    });
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ message: 'Error fetching thread' });
  }
});

// Enhanced like/dislike vote endpoint with better error handling
router.post('/vote', async (req, res) => {
  try {
    const { targetType, targetId, voteType } = req.body;

    // Validate input
    if (!['thread', 'comment'].includes(targetType)) {
      return res.status(400).json({ message: 'Invalid target type. Must be "thread" or "comment"' });
    }

    if (!['like', 'dislike'].includes(voteType)) {
      return res.status(400).json({ message: 'Invalid vote type. Must be "like" or "dislike"' });
    }

    // Find target
    let target;
    if (targetType === 'thread') {
      target = await ForumThread.findById(targetId);
    } else {
      target = await Comment.findById(targetId);
    }

    if (!target) {
      return res.status(404).json({ message: `${targetType === 'thread' ? 'Thread' : 'Comment'} not found` });
    }

    const userId = req.user.userId;

    // Initialize arrays if they don't exist
    if (!target.likes) target.likes = [];
    if (!target.dislikes) target.dislikes = [];

    // Check current vote status
    const hasLiked = target.likes.some(id => id.toString() === userId);
    const hasDisliked = target.dislikes.some(id => id.toString() === userId);

    // Create new arrays to avoid mutations
    let newLikes = target.likes.filter(id => id.toString() !== userId);
    let newDislikes = target.dislikes.filter(id => id.toString() !== userId);

    // Toggle logic: if user already voted the same way, just remove it (toggle off)
    // Otherwise, add the new vote
    let actionTaken = 'removed';
    if (voteType === 'like' && !hasLiked) {
      newLikes.push(userId);
      actionTaken = 'liked';
    } else if (voteType === 'dislike' && !hasDisliked) {
      newDislikes.push(userId);
      actionTaken = 'disliked';
    }

    // Update target with new arrays
    target.likes = newLikes;
    target.dislikes = newDislikes;

    await target.save();

    const score = calculateScore(target);
    const threadId = targetType === 'thread' ? targetId : target.thread;

    // Fan out the new tally to everyone viewing this thread.
    broadcastToThread(threadId, {
      type: 'vote_updated',
      threadId: String(threadId),
      targetType,
      targetId: String(targetId),
      score,
      likes: target.likes.length,
      dislikes: target.dislikes.length
    });

    res.json({
      success: true,
      targetType,
      targetId,
      score,
      likes: target.likes.length,
      dislikes: target.dislikes.length,
      action: actionTaken
    });
  } catch (error) {
    console.error('Error processing vote:', error);
    res.status(500).json({ message: 'Error processing vote' });
  }
});

// Create comment
router.post('/threads/:id/comments', async (req, res) => {
  try {
    const { content, parentCommentId } = req.body;

    const invalid = validateComment(content);
    if (invalid) return res.status(400).json({ message: invalid });

    const comment = new Comment({
      content: content.trim(),
      author: req.user.userId,
      thread: req.params.id,
      parentComment: parentCommentId || null,
      likes: [],
      dislikes: []
    });

    await comment.save();
    await comment.populate('author', 'username');

    // Update thread's lastActivity and comment count (commentCount is a real field now).
    await ForumThread.findByIdAndUpdate(req.params.id, {
      lastActivity: new Date(),
      $inc: { commentCount: 1 }
    });

    // Shape the payload like a tree node so subscribers can drop it straight in.
    const payload = { ...comment.toObject(), score: 0, replies: [] };
    broadcastToThread(req.params.id, {
      type: 'comment_created',
      threadId: String(req.params.id),
      parentCommentId: parentCommentId || null,
      comment: payload
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Error creating comment' });
  }
});

// Update comment
router.put('/comments/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }

    const invalid = validateComment(req.body.content);
    if (invalid) return res.status(400).json({ message: invalid });

    comment.content = req.body.content.trim();
    comment.isEdited = true;
    await comment.save();
    await comment.populate('author', 'username');

    broadcastToThread(comment.thread, {
      type: 'comment_updated',
      threadId: String(comment.thread),
      commentId: String(comment._id),
      content: comment.content,
      isEdited: true
    });

    res.json(comment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ message: 'Error updating comment' });
  }
});

// Delete comment with proper reply handling
router.delete('/comments/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Count all comments that will be deleted (including replies)
    const repliesToDelete = await Comment.find({ parentComment: comment._id });
    const deletedIds = [comment._id, ...repliesToDelete.map(r => r._id)].map(String);
    const totalCommentsToDelete = deletedIds.length;

    // Delete all replies to this comment first
    await Comment.deleteMany({ parentComment: comment._id });
    await Comment.findByIdAndDelete(comment._id);

    // Decrement comment count by the total number of deleted comments
    await ForumThread.findByIdAndUpdate(comment.thread, {
      $inc: { commentCount: -totalCommentsToDelete }
    });

    broadcastToThread(comment.thread, {
      type: 'comment_deleted',
      threadId: String(comment.thread),
      commentId: String(comment._id),
      deletedIds
    });

    res.json({ message: 'Comment deleted successfully', deletedIds });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Error deleting comment' });
  }
});

module.exports = router;
