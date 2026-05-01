require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const Booking = require('./models/Booking');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const PORT = process.env.PORT || 3000;

// 🔌 اتصال به MongoDB
mongoose.connect(process.env.MONGO_URI, {
  family: 4,
  serverSelectionTimeoutMS: 10000
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Error:', err.message));

// 📩 Webhook واتساپ
app.post('/webhook', async (req, res) => {
  try {
    const message = req.body.Body?.trim();
    const from = req.body.From;

    console.log("📩 Message:", message);

    // 🟢 شروع
    if (message?.toLowerCase() === 'hi') {
      return res.send(`
Welcome to Wellix Massage 🌿

1. Book a massage
2. View services
      `);
    }

    // 🟢 شروع رزرو
    if (message === '1') {

      await Booking.create({
        phone: from,
        service: 'massage',
        date: 'not set yet'
      });

      return res.send(`
Booking started ✅

Please enter your preferred date:
      `);
    }

    // 🟡 بقیه پیام‌ها
    return res.send(`
Please choose an option:

1. Book a massage
    `);

  } catch (error) {
    console.error("❌ Webhook Error:", error.message);
    res.status(500).send("Server error");
  }
});

// 🟢 تست سرور
app.get('/', (req, res) => {
  res.send('🚀 WhatsApp Bot is running');
});

// 🚀 اجرای سرور
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});