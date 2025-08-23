const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  driverId: {
    type: String,
    required: true,
    unique: true
  },
  givenName: {
    type: String,
    required: true
  },
  familyName: {
    type: String,
    required: true
  },
  nationality: {
    type: String,
    required: true
  },
  team: {
    type: String,
    required: true
  },
  permanentNumber: {
    type: Number
  },
  code: {
    type: String
  },
  dateOfBirth: {
    type: String
  },
  biography: {
    type: String
  },
  imageUrl: {
    type: String
  }
});

module.exports = mongoose.model('Driver', driverSchema); 