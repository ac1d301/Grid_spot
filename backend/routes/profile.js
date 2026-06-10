// Driver & constructor profile endpoints: /api/profile/*
const express = require('express');
const router = express.Router();
const profile = require('../services/profile');

const fail = (res, code, msg, err) =>
  res.status(code).json({ message: msg, error: process.env.NODE_ENV === 'development' ? err?.message : undefined });

router.get('/profile/driver/:driverId', async (req, res) => {
  try {
    res.json(await profile.driverProfile(req.params.driverId, parseInt(req.query.year, 10) || undefined));
  } catch (e) {
    fail(res, 502, 'Failed: driver profile', e);
  }
});

router.get('/profile/constructor/:constructorId', async (req, res) => {
  try {
    res.json(await profile.constructorProfile(req.params.constructorId, parseInt(req.query.year, 10) || undefined));
  } catch (e) {
    fail(res, 502, 'Failed: constructor profile', e);
  }
});

module.exports = router;
