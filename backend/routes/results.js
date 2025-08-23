const express = require('express');
const router = express.Router();
const Result = require('../models/result');
const { auth, admin } = require('../middlewares/auth');

/**
 * @swagger
 * /api/results/{raceId}:
 *   get:
 *     summary: Get results for a specific race
 *     tags: [Results]
 *     parameters:
 *       - in: path
 *         name: raceId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:raceId', async (req, res) => {
  try {
    const results = await Result.find({ raceId: req.params.raceId })
      .sort({ position: 1 })
      .populate('raceId', 'raceName circuit date');
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/results:
 *   post:
 *     summary: Add race result (admin only)
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', [auth, admin], async (req, res) => {
  try {
    const {
      raceId,
      driverId,
      position,
      points,
      time,
      status,
      grid,
      laps,
      fastestLap
    } = req.body;

    // Check if result already exists
    const existingResult = await Result.findOne({ raceId, driverId });
    if (existingResult) {
      return res.status(400).json({ message: 'Result already exists for this driver in this race' });
    }

    const result = new Result({
      raceId,
      driverId,
      position,
      points,
      time,
      status,
      grid,
      laps,
      fastestLap
    });

    await result.save();
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/results/{id}:
 *   put:
 *     summary: Update race result (admin only)
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const result = await Result.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/results/{id}:
 *   delete:
 *     summary: Delete race result (admin only)
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }
    res.json({ message: 'Result deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/results/standings/drivers:
 *   get:
 *     summary: Get driver standings
 *     tags: [Results]
 *     parameters:
 *       - in: query
 *         name: season
 *         schema:
 *           type: number
 *         description: Filter standings by season
 */
router.get('/standings/drivers', async (req, res) => {
  try {
    const { season } = req.query;
    
    const standings = await Result.aggregate([
      {
        $lookup: {
          from: 'races',
          localField: 'raceId',
          foreignField: '_id',
          as: 'race'
        }
      },
      {
        $unwind: '$race'
      },
      {
        $match: season ? { 'race.season': parseInt(season) } : {}
      },
      {
        $group: {
          _id: '$driverId',
          totalPoints: { $sum: '$points' },
          wins: {
            $sum: { $cond: [{ $eq: ['$position', 1] }, 1, 0] }
          },
          podiums: {
            $sum: { $cond: [{ $lte: ['$position', 3] }, 1, 0] }
          }
        }
      },
      {
        $sort: { totalPoints: -1 }
      }
    ]);

    res.json(standings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 