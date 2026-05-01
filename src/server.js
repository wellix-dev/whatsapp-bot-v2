// src/server.js

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const twilio = require('twilio');
const Booking = require('./models/Booking');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// تنظیم session برای ورود
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// اتصال به MongoDB
mongoose.connect(process.env.MONGO_URI, { family: 4, serverSelectionTimeoutMS: 10000 })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

// مسیر ورود ادمین
app.get('/admin/login', (req, res) => {
  res.send(`
    <form action="/admin/login" method="POST">
      <input type="text" name="username" placeholder="Username" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  `);
});

// ورود ادمین
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin123') {
    req.session.isAdmin = true;
    res.redirect('/admin/dashboard');
  } else {
    res.send('Invalid credentials');
  }
});

// صفحه داشبورد ادمین
app.get('/admin/dashboard', (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect('/admin/login');
  }

  // گرفتن رزروها
  Booking.find({}, (err, bookings) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    res.send(`
      <h1>Admin Dashboard</h1>
      <ul>
        ${bookings.map(booking => `
          <li>
            Phone: ${booking.phone} <br>
            Service: ${booking.service} <br>
            Date: ${booking.date} <br>
            Status: ${booking.step} <br>
            <a href="/admin/approve/${booking._id}">Approve</a> |
            <a href="/admin/cancel/${booking._id}">Cancel</a>
          </li>
        `).join('')}
      </ul>
    `);
  });
});

// تایید رزرو
app.get('/admin/approve/:id', async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (booking) {
    booking.step = 'approved';
    await booking.save();
    res.redirect('/admin/dashboard');
  } else {
    res.status(404).send('Booking not found');
  }
});

// لغو رزرو
app.get('/admin/cancel/:id', async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (booking) {
    booking.step = 'cancelled';
    await booking.save();
    res.redirect('/admin/dashboard');
  } else {
    res.status(404).send('Booking not found');
  }
});

// webhook
app.post('/webhook', async (req, res) => {
  const message = req.body.Body?.trim();
  const from = req.body.From;

  const twiml = new twilio.twiml.MessagingResponse();
  
  let existing = await Booking.findOne({ phone: from, step: { $ne: 'done' } });
  
  if (message?.toLowerCase() === 'hi') {
    await Booking.deleteMany({ phone: from, step: { $ne: 'done' } });
    twiml.message(`Welcome to Wellix Massage 🌿\n1. Book a massage`);
    return res.type('text/xml').send(twiml.toString());
  }
  
  if (message === '1') {
    if (existing) {
      twiml.message('⚠️ You already have an active booking. Please complete it.');
      return res.type('text/xml').send(twiml.toString());
    }

    await Booking.create({ phone: from, step: 'date' });
    twiml.message('📅 Enter your preferred date (e.g. 2026-05-10):');
    return res.type('text/xml').send(twiml.toString());
  }

  if (existing && existing.step === 'date') {
    existing.date = message;
    existing.step = 'service';
    await existing.save();
    twiml.message('�