const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  date: String,
  time: String,
  isBooked: { type: Boolean, default: false }
});

module.exports = mongoose.model('TimeSlot', timeSlotSchema);