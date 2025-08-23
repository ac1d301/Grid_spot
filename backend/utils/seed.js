require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Race = require('../models/race');
const Driver = require('../models/driver');

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/f1portal');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Race.deleteMany({}),
      Driver.deleteMany({})
    ]);
    console.log('Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      email: 'admin@f1portal.com',
      password: adminPassword,
      isAdmin: true
    });
    console.log('Created admin user');

    // Create sample races
    const races = [
      {
        round: 1,
        raceName: 'Bahrain Grand Prix',
        date: '2024-03-02',
        circuit: 'Bahrain International Circuit',
        season: 2024,
        time: '15:00:00Z',
        circuitInfo: {
          country: 'Bahrain',
          locality: 'Sakhir',
          lat: 26.0325,
          long: 50.5106
        }
      },
      {
        round: 2,
        raceName: 'Saudi Arabian Grand Prix',
        date: '2024-03-09',
        circuit: 'Jeddah Corniche Circuit',
        season: 2024,
        time: '17:00:00Z',
        circuitInfo: {
          country: 'Saudi Arabia',
          locality: 'Jeddah',
          lat: 21.6319,
          long: 39.1044
        }
      }
    ];

    await Race.insertMany(races);
    console.log('Created sample races');

    // Create sample drivers
    const drivers = [
      {
        driverId: 'max_verstappen',
        givenName: 'Max',
        familyName: 'Verstappen',
        nationality: 'Dutch',
        team: 'Red Bull Racing',
        permanentNumber: 33,
        code: 'VER',
        dateOfBirth: '1997-09-30',
        biography: 'Max Verstappen is a Dutch racing driver and the 2021, 2022, and 2023 Formula One World Champion.',
        imageUrl: 'https://example.com/verstappen.jpg'
      },
      {
        driverId: 'lewis_hamilton',
        givenName: 'Lewis',
        familyName: 'Hamilton',
        nationality: 'British',
        team: 'Mercedes',
        permanentNumber: 44,
        code: 'HAM',
        dateOfBirth: '1985-01-07',
        biography: 'Sir Lewis Hamilton is a British racing driver and seven-time Formula One World Champion.',
        imageUrl: 'https://example.com/hamilton.jpg'
      }
    ];

    await Driver.insertMany(drivers);
    console.log('Created sample drivers');

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData(); 