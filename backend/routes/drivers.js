const express = require('express');
const router = express.Router();
const Driver = require('../models/driver');
const { auth, admin } = require('../middlewares/auth');

/**
 * @swagger
 * /api/drivers:
 *   get:
 *     summary: Get all drivers with optional filtering and pagination
 *     tags: [Drivers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of drivers per page
 *       - in: query
 *         name: team
 *         schema:
 *           type: string
 *         description: Filter by team name
 *       - in: query
 *         name: nationality
 *         schema:
 *           type: string
 *         description: Filter by driver nationality
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in driver names
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Driver'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */
router.get('/', async (req, res) => {
  try {
    // Parse and validate query parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const { team, nationality, search } = req.query;
    
    // Build filter object
    const filter = {};
    if (team) {
      filter.team = { $regex: team, $options: 'i' }; // Case-insensitive partial match
    }
    if (nationality) {
      filter.nationality = { $regex: nationality, $options: 'i' };
    }
    if (search) {
      filter.$or = [
        { givenName: { $regex: search, $options: 'i' } },
        { familyName: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute queries in parallel for better performance
    const [drivers, total] = await Promise.all([
      Driver.find(filter)
        .sort({ familyName: 1, givenName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean() // Better performance for read-only operations
        .select('-__v'), // Exclude version field
      Driver.countDocuments(filter)
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      data: drivers,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/**
 * @swagger
 * /api/drivers/{id}:
 *   get:
 *     summary: Get driver by ID
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:id', async (req, res) => {
  try {
    const driver = await Driver.findOne({ driverId: req.params.id })
      .lean()
      .select('-__v');
      
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    res.json(driver);
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/**
 * @swagger
 * /api/drivers/stats:
 *   get:
 *     summary: Get driver statistics
 *     tags: [Drivers]
 */
router.get('/stats', async (req, res) => {
  try {
    const [totalDrivers, teamStats, nationalityStats] = await Promise.all([
      Driver.countDocuments(),
      Driver.aggregate([
        { $group: { _id: '$team', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Driver.aggregate([
        { $group: { _id: '$nationality', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);
    
    res.json({
      totalDrivers,
      teamStats,
      nationalityStats
    });
  } catch (error) {
    console.error('Error fetching driver stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/drivers:
 *   post:
 *     summary: Create a new driver (admin only)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', [auth, admin], async (req, res) => {
  try {
    const {
      driverId,
      givenName,
      familyName,
      nationality,
      team,
      permanentNumber,
      code,
      dateOfBirth,
      biography,
      imageUrl
    } = req.body;
    
    // Validate required fields
    if (!driverId || !givenName || !familyName) {
      return res.status(400).json({ 
        message: 'Missing required fields: driverId, givenName, familyName' 
      });
    }
    
    // Check if driver already exists
    const existingDriver = await Driver.findOne({ 
      $or: [
        { driverId },
        { permanentNumber: permanentNumber }
      ]
    });
    
    if (existingDriver) {
      return res.status(409).json({ 
        message: 'Driver already exists with this ID or permanent number' 
      });
    }
    
    const driver = new Driver({
      driverId,
      givenName,
      familyName,
      nationality,
      team,
      permanentNumber,
      code,
      dateOfBirth,
      biography,
      imageUrl
    });
    
    await driver.save();
    
    res.status(201).json(driver);
  } catch (error) {
    console.error('Error creating driver:', error);
    if (error.name === 'ValidationError') {
      res.status(400).json({ 
        message: 'Validation error', 
        details: error.errors 
      });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

/**
 * @swagger
 * /api/drivers/{id}:
 *   put:
 *     summary: Update a driver (admin only)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const driver = await Driver.findOneAndUpdate(
      { driverId: req.params.id },
      { $set: req.body },
      { 
        new: true, 
        runValidators: true,
        select: '-__v'
      }
    );
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    res.json(driver);
  } catch (error) {
    console.error('Error updating driver:', error);
    if (error.name === 'ValidationError') {
      res.status(400).json({ 
        message: 'Validation error', 
        details: error.errors 
      });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

/**
 * @swagger
 * /api/drivers/{id}:
 *   delete:
 *     summary: Delete a driver (admin only)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const driver = await Driver.findOneAndDelete({ driverId: req.params.id });
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    res.json({ 
      message: 'Driver deleted successfully',
      deletedDriver: {
        driverId: driver.driverId,
        name: `${driver.givenName} ${driver.familyName}`
      }
    });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
