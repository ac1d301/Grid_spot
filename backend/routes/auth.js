const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const auth = require('../middlewares/auth');

// Enhanced validation functions
const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
};

const validatePassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number, one special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  return passwordRegex.test(password);
};

// Register endpoint with enhanced validation
router.post('/register', async (req, res) => {
  try {
    console.log('📨 Registration request received:', { 
      username: req.body.username, 
      email: req.body.email,
      passwordLength: req.body.password?.length 
    });
    
    const { username, email, password } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        errors: {
          username: !username ? 'Username is required' : null,
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }

    // Validate username format
    if (!validateUsername(username)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid username format',
        errors: {
          username: 'Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens'
        }
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        errors: {
          email: 'Please enter a valid email address'
        }
      });
    }

    // Enhanced password validation
    if (!validatePassword(password)) {
      const passwordErrors = [];
      if (password.length < 8) passwordErrors.push('At least 8 characters');
      if (!/[a-z]/.test(password)) passwordErrors.push('One lowercase letter');
      if (!/[A-Z]/.test(password)) passwordErrors.push('One uppercase letter');
      if (!/\d/.test(password)) passwordErrors.push('One number');
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) passwordErrors.push('One special character');

      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: {
          password: `Password must contain: ${passwordErrors.join(', ')}`
        }
      });
    }

    // Check if user already exists (more specific error messages)
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
        errors: {
          email: 'An account with this email already exists'
        }
      });
    }

    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken',
        errors: {
          username: 'This username is already taken'
        }
      });
    }

    // Create new user (password will be hashed by pre-save middleware)
    const user = new User({ username, email, password });
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username,
        email: user.email 
      },
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
        email: user.email,
        isAdmin: user.isAdmin || false,
        createdAt: user.createdAt
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    
    // Handle MongoDB duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        errors: {
          [field]: `This ${field} is already registered`
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Enhanced Login endpoint with username/email support
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body; // This can be username or email
    
    console.log('📨 Login request received for:', email);

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required',
        errors: {
          email: !email ? 'Username or email is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }

    // Determine if input is email or username
    const isEmail = validateEmail(email);
    let user;

    if (isEmail) {
      // Find by email
      user = await User.findOne({ email: email.toLowerCase() });
    } else {
      // Find by username
      user = await User.findOne({ username: email });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        errors: {
          general: 'Invalid username/email or password'
        }
      });
    }

    // Check if account is active/verified (if you implement email verification)
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Account suspended',
        errors: {
          general: 'Your account has been suspended. Please contact support.'
        }
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        errors: {
          general: 'Invalid username/email or password'
        }
      });
    }

    // Update last login timestamp (optional)
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin || false
      },
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
        email: user.email,
        isAdmin: user.isAdmin || false,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Enhanced Get current user endpoint
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user.id)
      .select('-password')
      .lean(); // Use lean() for better performance
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin || false,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Logout endpoint (optional - for token blacklisting if implemented)
router.post('/logout', auth, async (req, res) => {
  try {
    // If you implement token blacklisting, add the token to blacklist here
    // For now, just return success (client should remove token)
    
    console.log('✅ User logged out:', req.user.username);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Change password endpoint
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Validate new password
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password does not meet requirements',
        errors: {
          password: 'Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character'
        }
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();

    console.log('✅ Password changed successfully for user:', user.username);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Enhanced Health check endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth API is working!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    endpoints: {
      register: 'POST /auth/register',
      login: 'POST /auth/login',
      me: 'GET /auth/me',
      logout: 'POST /auth/logout',
      changePassword: 'PUT /auth/change-password'
    }
  });
});

// Verify token endpoint (useful for frontend auth checks)
router.get('/verify', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: {
      id: req.user.userId,
      username: req.user.username,
      email: req.user.email,
      isAdmin: req.user.isAdmin
    }
  });
});

module.exports = router;
