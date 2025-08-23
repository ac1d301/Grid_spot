const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  raceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Race',
    required: true
  },
  driverId: {
    type: String,
    required: true
  },
  position: {
    type: Number,
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  time: {
    type: String
  },
  status: {
    type: String,
    default: 'Finished'
  },
  grid: {
    type: Number
  },
  laps: {
    type: Number
  },
  fastestLap: {
    time: String,
    lap: Number,
    rank: Number
  }
});

// Compound index to ensure unique driver results per race
resultSchema.index({ raceId: 1, driverId: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema); 