const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  phone: String,
  service: String,
  date: String,
  time: String,
  slotId: String,
  step: {
    type: String,
    default: 'start'
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);