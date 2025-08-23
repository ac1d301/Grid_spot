const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
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
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
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
  return this.upvotes.length - this.downvotes.length;
});

commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment'
});

const threadSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
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
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
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
  return this.upvotes.length - this.downvotes.length;
});

threadSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'thread',
  count: true
});

// Update lastActivity when new comments are added
threadSchema.methods.updateLastActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Pre-save middleware to handle tags
threadSchema.pre('save', function(next) {
  if (this.tags) {
    // Remove duplicates and empty tags
    this.tags = [...new Set(this.tags.filter(tag => tag.trim()))];
  }
  next();
});

const Comment = mongoose.model('Comment', commentSchema);
const ForumThread = mongoose.model('ForumThread', threadSchema);

module.exports = { ForumThread, Comment }; 