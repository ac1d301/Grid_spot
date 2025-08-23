const express = require('express');
const router = express.Router();
const Rating = require('../models/rating');
const { auth } = require('../middlewares/auth');

/**
 * @swagger
 * /api/ratings:
 *   post:
 *     summary: Rate a driver's performance in a race
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', auth, async (req, res) => {
  try {
    const { driverId, raceId, rating, comment } = req.body;

    // Validate rating value
    if (rating < 1 || rating > 10) {
      return res.status(400).json({ message: 'Rating must be between 1 and 10' });
    }

    // Check if user has already rated this driver for this race
    const existingRating = await Rating.findOne({
      userId: req.user._id,
      driverId,
      raceId
    });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.comment = comment;
      await existingRating.save();
      return res.json(existingRating);
    }

    // Create new rating
    const newRating = new Rating({
      userId: req.user._id,
      driverId,
      raceId,
      rating,
      comment
    });

    await newRating.save();
    res.status(201).json(newRating);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/ratings/{driverId}:
 *   get:
 *     summary: Get ratings for a driver
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: raceId
 *         schema:
 *           type: string
 */
router.get('/:driverId', async (req, res) => {
  try {
    const { raceId } = req.query;
    const query = { driverId: req.params.driverId };
    
    if (raceId) {
      query.raceId = raceId;
    }

    const ratings = await Rating.find(query)
      .populate('userId', 'username')
      .populate('raceId', 'raceName date')
      .sort('-createdAt');

    // Calculate average rating
    const averageRating = ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length;

    res.json({
      ratings,
      averageRating: averageRating || 0,
      totalRatings: ratings.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/ratings/{id}:
 *   delete:
 *     summary: Delete a rating (auth required, only own ratings)
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const rating = await Rating.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!rating) {
      return res.status(404).json({ message: 'Rating not found or unauthorized' });
    }

    await rating.remove();
    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/ratings/user/me:
 *   get:
 *     summary: Get current user's ratings
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 */
router.get('/user/me', auth, async (req, res) => {
  try {
    const ratings = await Rating.find({ userId: req.user._id })
      .populate('raceId', 'raceName date')
      .sort('-createdAt');
    res.json(ratings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 