const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  thread: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumThread',
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  // Changed from upvotes/downvotes to likes/dislikes to match frontend
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEdited: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

commentSchema.virtual('score').get(function() {
  return this.likes.length - this.dislikes.length;
});

commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment'
});

// Indexes: fetching a thread's comments (sorted) and a comment's replies are the hot paths.
commentSchema.index({ thread: 1, createdAt: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ author: 1 });

const threadSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 10000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['General', 'Race Discussion', 'Technical', 'News', 'Off-Topic']
  },
  tags: [{
    type: String,
    trim: true
  }],
  // Changed from upvotes/downvotes to likes/dislikes
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  // Real (denormalised) counter — kept in sync by the comment routes. Was previously a
  // populate-virtual, so `$inc { commentCount }` was a silent no-op and `.lean()` dropped it.
  commentCount: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

threadSchema.virtual('score').get(function() {
  return this.likes.length - this.dislikes.length;
});

// Indexes for the list view's sorts/filters.
threadSchema.index({ createdAt: -1 });
threadSchema.index({ category: 1, createdAt: -1 });
threadSchema.index({ lastActivity: -1 });
threadSchema.index({ author: 1 });

threadSchema.methods.updateLastActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

threadSchema.pre('save', function(next) {
  if (this.tags) {
    // de-dupe, drop blanks, clamp length, and cap the count.
    this.tags = [...new Set(this.tags.map(t => String(t).trim()).filter(Boolean).map(t => t.slice(0, 30)))].slice(0, 8);
  }
  next();
});

const Comment = mongoose.model('Comment', commentSchema);
const ForumThread = mongoose.model('ForumThread', threadSchema);

module.exports = { ForumThread, Comment };
