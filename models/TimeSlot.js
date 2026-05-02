// models/TimeSlot.js
const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  date: { type: String, required: true },   // تاریخ (مثلاً "2026-05-05")
  time: { type: String, required: true },   // زمان (مثلاً "10:00 AM")
  isBooked: { type: Boolean, default: false }, // وضعیت رزرو
});

const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);

module.exports = TimeSlot;