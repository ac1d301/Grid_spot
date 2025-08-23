require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');

async function testAuthentication() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test user data
    const testUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };

    // Clean up: Remove test user if exists
    await User.deleteOne({ email: testUser.email });
    console.log('Cleaned up existing test user');

    // Test registration
    const user = new User(testUser);
    await user.save();
    console.log('Test user registered successfully:', {
      id: user._id,
      username: user.username,
      email: user.email
    });

    // Test login (password comparison)
    const foundUser = await User.findOne({ email: testUser.email });
    const isPasswordValid = await foundUser.comparePassword(testUser.password);
    console.log('Password validation:', isPasswordValid ? 'Success' : 'Failed');

    // Test invalid password
    const invalidPasswordCheck = await foundUser.comparePassword('wrongpassword');
    console.log('Invalid password check:', !invalidPasswordCheck ? 'Success' : 'Failed');

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testAuthentication(); 