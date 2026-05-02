require('dotenv').config();
const mongoose = require('mongoose');
const TimeSlot = require('./src/models/TimeSlot');

mongoose.connect(process.env.MONGO_URI)
.then(async () => {

  console.log('Connected');

  const date = "2026-05-05";

  const times = [
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00"
  ];

  for (let time of times) {
    await TimeSlot.create({
      date,
      time,
      isBooked: false
    });
  }

  console.log('Slots created ✅');
  process.exit();

});