const express = require('express');
const router = express.Router();
const Race = require('../models/race');

// Get 2025 F1 Calendar specifically
router.get('/calendar/2025', async (req, res) => {
  try {
    // Fixed 2025 calendar - could also fetch from database
    const calendar2025 = [
      {
        round: 1,
        raceName: 'Australian Grand Prix',
        location: 'Melbourne',
        country: 'Australia',
        circuit: 'Albert Park Circuit',
        date: '2025-03-14',
        endDate: '2025-03-16',
        isCompleted: true,
        winner: 'Lando Norris'
      },
      // ... rest of races
    ];

    res.json({
      season: 2025,
      totalRaces: 24,
      races: calendar2025
    });
  } catch (error) {
    console.error('Error fetching 2025 calendar:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get next race specifically
router.get('/next-race', async (req, res) => {
  try {
    const now = new Date();
    const nextRace = await Race.findOne({
      date: { $gt: now },
      season: 2025
    }).sort({ date: 1 });
    
    if (!nextRace) {
      return res.status(404).json({ message: 'No upcoming races' });
    }
    
    res.json(nextRace);
  } catch (error) {
    console.error('Error fetching next race:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
