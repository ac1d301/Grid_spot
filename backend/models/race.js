const mongoose = require('mongoose');

const raceSchema = new mongoose.Schema({
  round: {
    type: Number,
    required: true,
    unique: true
  },
  raceName: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  circuit: {
    type: String,
    required: true
  },
  season: {
    type: Number,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  circuitInfo: {
    country: String,
    locality: String,
    lat: Number,
    long: Number
  }
});

module.exports = mongoose.model('Race', raceSchema); 