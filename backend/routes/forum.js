const express = require('express');
const router = express.Router();
const { ForumThread, Comment } = require('../models/forum');

// Get all threads with simple sorting
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

    // Handle "popular" sort with aggregation
    if (sort === 'popular') {
      const threads = await ForumThread.aggregate([
        { $match: query },
        {
          $addFields: {
            score: { $subtract: [{ $size: "$upvotes" }, { $size: "$downvotes" }] }
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
          $project: {
            _id: 1,
            title: 1,
            content: 1,
            category: 1,
            tags: 1,
            upvotes: 1,
            downvotes: 1,
            views: 1,
            commentCount: 1,
            createdAt: 1,
            lastActivity: 1,
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
      case 'new':
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
      .populate('author', 'username');

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

    const thread = new ForumThread({
      title,
      content,
      category,
      tags,
      author: req.user.userId,
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
    
    thread.title = title;
    thread.content = content;
    thread.category = category;
    thread.tags = tags;
    
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

    // Delete all comments associated with the thread
    await Comment.deleteMany({ thread: thread._id });
    await ForumThread.findByIdAndDelete(thread._id);

    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Error deleting thread:', error);
    res.status(500).json({ message: 'Error deleting thread' });
  }
});

// Get thread with nested comments
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

    const comments = await Comment.find({ thread: thread._id })
      .populate('author', 'username')
      .sort({ createdAt: 1 });

    res.json({ thread, comments });
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ message: 'Error fetching thread' });
  }
});

// Enhanced vote endpoint with better scoring
router.post('/vote', async (req, res) => {
  try {
    const { targetType, targetId, voteType } = req.body;
    let target;

    if (targetType === 'thread') {
      target = await ForumThread.findById(targetId);
    } else if (targetType === 'comment') {
      target = await Comment.findById(targetId);
    } else {
      return res.status(400).json({ message: 'Invalid target type' });
    }

    if (!target) {
      return res.status(404).json({ message: 'Target not found' });
    }

    const userId = req.user.userId;
    const hasUpvoted = target.upvotes.includes(userId);
    const hasDownvoted = target.downvotes.includes(userId);

    // Remove existing votes
    target.upvotes = target.upvotes.filter(id => id.toString() !== userId);
    target.downvotes = target.downvotes.filter(id => id.toString() !== userId);

    // Add new vote if different from existing
    if (voteType === 'up' && !hasUpvoted) {
      target.upvotes.push(userId);
    } else if (voteType === 'down' && !hasDownvoted) {
      target.downvotes.push(userId);
    }

    await target.save();

    const score = target.upvotes.length - target.downvotes.length;

    res.json({
      targetType,
      targetId,
      score,
      upvotes: target.upvotes,
      downvotes: target.downvotes
    });
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ message: 'Error processing vote' });
  }
});

// Enhanced comment creation with better threading
router.post('/threads/:id/comments', async (req, res) => {
  try {
    const { content, parentCommentId } = req.body;
    
    const comment = new Comment({
      content,
      author: req.user.userId,
      thread: req.params.id,
      parentComment: parentCommentId || null
    });

    await comment.save();
    await comment.populate('author', 'username');

    // Update thread's lastActivity and comment count
    await ForumThread.findByIdAndUpdate(req.params.id, {
      lastActivity: new Date(),
      $inc: { commentCount: 1 }
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

    comment.content = req.body.content;
    comment.isEdited = true;
    
    await comment.save();
    await comment.populate('author', 'username');

    res.json(comment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ message: 'Error updating comment' });
  }
});

// Delete comment
router.delete('/comments/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Delete all replies to this comment
    await Comment.deleteMany({ parentComment: comment._id });
    await Comment.findByIdAndDelete(comment._id);

    // Decrement comment count
    await ForumThread.findByIdAndUpdate(comment.thread, {
      $inc: { commentCount: -1 }
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Error deleting comment' });
  }
});

module.exports = router;
