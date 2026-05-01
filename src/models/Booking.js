const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  phone: String,
  service: String,
  date: String,
  time: String,
  status: {
    type: String,
    default: 'pending'
  }
});

module.exports = mongoose.model('Booking', bookingSchema);