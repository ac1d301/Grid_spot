const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const auth = require('../middlewares/auth');

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    console.log('📨 Registration request received:', req.body);
    
    const { username, email, password } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'All fields are required',
        received: { username: !!username, email: !!email, password: !!password }
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists with this email or username'
      });
    }

    // Create new user (password will be hashed by pre-save middleware)
    const user = new User({ username, email, password });
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User registered successfully:', user.username);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
    });
  }
}); // ✅ Fixed: Added missing closing brace

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('📨 Login request received for:', req.body.email);
    
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User logged in successfully:', user.username);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
    });
  }
}); // ✅ Fixed: Added missing closing brace

// Get current user endpoint
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      }
    });

  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({
      message: 'Failed to fetch user',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
    });
  }
}); // ✅ Fixed: Added missing closing brace

// Health check endpoint
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth API is working!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
