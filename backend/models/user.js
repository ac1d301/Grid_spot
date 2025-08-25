const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'Username is required'],
    unique: true, 
    trim: true, 
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username must be less than 20 characters long'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'],
    index: true // Add index for better query performance
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true, 
    trim: true, 
    lowercase: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid email address'],
    index: true // Add index for better query performance
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    validate: {
      validator: function(password) {
        // Password must contain: 1 lowercase, 1 uppercase, 1 number, 1 special character
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(password);
      },
      message: 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    }
  },
  
  // User role and permissions
  isAdmin: { 
    type: Boolean, 
    default: false 
  },
  
  // Account status fields
  isActive: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  // Profile information
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name must be less than 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name must be less than 50 characters']
    },
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio must be less than 500 characters']
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location must be less than 100 characters']
    },
    website: {
      type: String,
      validate: {
        validator: function(url) {
          if (!url) return true; // Allow empty URLs
          return /^https?:\/\/.+/.test(url);
        },
        message: 'Website must be a valid URL'
      }
    }
  },
  
  // F1 Hub specific preferences
  preferences: {
    favoriteTeam: {
      type: String,
      enum: [
        'Red Bull Racing', 'Ferrari', 'Mercedes', 'McLaren', 'Aston Martin',
        'Alpine', 'Williams', 'Racing Bulls', 'Kick Sauber', 'Haas'
      ]
    },
    favoriteDriver: {
      type: String,
      maxlength: [50, 'Favorite driver name must be less than 50 characters']
    },
    notifications: {
      raceReminders: {
        type: Boolean,
        default: true
      },
      newsUpdates: {
        type: Boolean,
        default: true
      },
      emailNotifications: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Security and tracking fields
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  emailVerificationToken: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  // Schema options
  timestamps: false, // We're handling this manually
  versionKey: false, // Remove __v field
  collection: 'users' // Explicitly set collection name
});

// Compound indexes for better query performance
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ username: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.profile && this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.username;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware for password hashing and updatedAt
userSchema.pre('save', async function(next) {
  // Update the updatedAt field
  this.updatedAt = new Date();
  
  // Only hash password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Increased salt rounds for better security (12 is recommended in 2025)
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Pre-save middleware to handle email changes
userSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.emailVerified = false; // Reset email verification if email changes
  }
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordReset = function() {
  this.passwordResetToken = require('crypto').randomBytes(20).toString('hex');
  this.passwordResetExpires = Date.now() + 3600000; // 1 hour
};

// Instance method to generate email verification token
userSchema.methods.generateEmailVerification = function() {
  this.emailVerificationToken = require('crypto').randomBytes(20).toString('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
};

// Static method to find by username or email
userSchema.statics.findByUsernameOrEmail = function(identifier) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const isEmail = emailRegex.test(identifier);
  
  return this.findOne(
    isEmail 
      ? { email: identifier.toLowerCase() }
      : { username: identifier }
  );
};

// Static method to find active users
userSchema.statics.findActiveUsers = function(query = {}) {
  return this.find({ ...query, isActive: true, isBlocked: false });
};

// Instance method to soft delete user
userSchema.methods.softDelete = function() {
  this.isActive = false;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to restore user
userSchema.methods.restore = function() {
  this.isActive = true;
  this.isBlocked = false;
  this.updatedAt = new Date();
  return this.save();
};

// Transform output (remove sensitive fields when converting to JSON)
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  
  // Remove sensitive fields
  delete userObject.password;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;
  
  return userObject;
};

// Pre-find middleware to exclude inactive users by default
userSchema.pre(/^find/, function(next) {
  // Only apply this filter if no explicit isActive query is set
  if (this.getQuery().isActive === undefined) {
    this.find({ isActive: { $ne: false } });
  }
  next();
});

// Error handling middleware
userSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    next(new Error(message));
  } else {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);
