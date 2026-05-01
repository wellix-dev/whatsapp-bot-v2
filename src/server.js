require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const twilio = require('twilio');

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

    const twiml = new twilio.twiml.MessagingResponse();

    // 🔍 بررسی booking فعال
    const existing = await Booking.findOne({
      phone: from,
      step: { $ne: 'done' }
    });

    // 🟢 شروع
    if (message?.toLowerCase() === 'hi') {
      twiml.message(`
Welcome to Wellix Massage 🌿

1. Book a massage
      `);

      return res.type('text/xml').send(twiml.toString());
    }

    // 🟢 شروع booking
    if (message === '1') {
      await Booking.create({
        phone: from,
        step: 'date'
      });

      twiml.message('📅 Enter your preferred date (e.g. 2026-05-10):');

      return res.type('text/xml').send(twiml.toString());
    }

    // 🟡 مرحله گرفتن تاریخ
    if (existing && existing.step === 'date') {
      existing.date = message;
      existing.step = 'service';
      await existing.save();

      twiml.message(`
💆 What service do you want?

- Swedish
- Deep Tissue
- Relaxation
      `);

      return res.type('text/xml').send(twiml.toString());
    }

    // 🟡 مرحله گرفتن سرویس
    if (existing && existing.step === 'service') {
      existing.service = message;
      existing.step = 'done';
      await existing.save();

      twiml.message(`
✅ Booking confirmed!

📅 Date: ${existing.date}
💆 Service: ${existing.service}

We’ll contact you shortly 🌿
      `);

      return res.type('text/xml').send(twiml.toString());
    }

    // 🔁 fallback
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