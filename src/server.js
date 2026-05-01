require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const Booking = require('./models/Booking');

const app = express(); // ✅ این خط مهمه
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

    const twiml = new twilio.twiml.MessagingResponse();

    // 🟢 hi
    if (message?.toLowerCase() === 'hi') {
      twiml.message(`
Welcome to Wellix Massage 🌿

1. Book a massage
2. View services
      `);

      return res.type('text/xml').send(twiml.toString());
    }

    // 🟢 booking
    if (message === '1') {
      await Booking.create({
        phone: from,
        service: 'massage',
        date: 'not set yet'
      });

      twiml.message(`
Booking started ✅

Please enter your preferred date:
      `);

      return res.type('text/xml').send(twiml.toString());
    }

    // 🟡 default
    twiml.message(`
Please choose an option:

1. Book a massage
    `);

    res.type('text/xml').send(twiml.toString());

  } catch (error) {
    console.error("❌ Webhook Error:", error.message);
    res.status(500).send("Server error");
  }
});

// 🟢 تست
app.get('/', (req, res) => {
  res.send('🚀 WhatsApp Bot is running');
});

// 🚀 اجرای سرور
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});