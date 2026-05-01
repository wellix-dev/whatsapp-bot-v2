require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const twilio = require('twilio');

const Booking = require('./models/Booking');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// ✅ session برای پنل ادمین
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret123',
  resave: false,
  saveUninitialized: true,
}));

const PORT = process.env.PORT || 3000;

// 🔌 اتصال MongoDB
mongoose.connect(process.env.MONGO_URI, {
  family: 4,
  serverSelectionTimeoutMS: 10000
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Error:', err.message));


// =======================
// 🔐 ADMIN LOGIN
// =======================

app.get('/admin/login', (req, res) => {
  res.send(`
    <h2>Admin Login</h2>
    <form method="POST" action="/admin/login">
      <input name="username" placeholder="Username" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  `);
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin123') {
    req.session.isAdmin = true;
    return res.redirect('/admin/dashboard');
  }

  res.send('Invalid credentials');
});


// =======================
// 📊 ADMIN DASHBOARD
// =======================

app.get('/admin/dashboard', async (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect('/admin/login');
  }

  const bookings = await Booking.find().sort({ createdAt: -1 });

  res.send(`
    <h1>Admin Dashboard</h1>
    <a href="/admin/logout">Logout</a>
    <hr/>
    ${bookings.map(b => `
      <div style="margin-bottom:20px;">
        📞 ${b.phone}<br/>
        📅 ${b.date || '-'}<br/>
        💆 ${b.service || '-'}<br/>
        📌 Status: ${b.step}<br/>
        <a href="/admin/approve/${b._id}">Approve</a> |
        <a href="/admin/cancel/${b._id}">Cancel</a>
      </div>
    `).join('')}
  `);
});


// =======================
// ✅ APPROVE / ❌ CANCEL
// =======================

app.get('/admin/approve/:id', async (req, res) => {
  await Booking.findByIdAndUpdate(req.params.id, { step: 'approved' });
  res.redirect('/admin/dashboard');
});

app.get('/admin/cancel/:id', async (req, res) => {
  await Booking.findByIdAndUpdate(req.params.id, { step: 'cancelled' });
  res.redirect('/admin/dashboard');
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});


// =======================
// 📩 WHATSAPP WEBHOOK
// =======================

app.post('/webhook', async (req, res) => {
  try {
    const message = req.body.Body?.trim();
    const from = req.body.From;

    console.log('📩 Message:', message);

    const twiml = new twilio.twiml.MessagingResponse();

    let existing = await Booking.findOne({
      phone: from,
      step: { $ne: 'done' }
    });

    // 🟢 شروع
    if (message?.toLowerCase() === 'hi') {
      await Booking.deleteMany({ phone: from, step: { $ne: 'done' } });

      twiml.message(`
Welcome to Wellix Massage

1. Book a massage
      `);

      return res.type('text/xml').send(twiml.toString());
    }

    // 🟢 شروع booking
    if (message === '1') {
      if (existing) {
        twiml.message('You already have an active booking.');
        return res.type('text/xml').send(twiml.toString());
      }

      await Booking.create({
        phone: from,
        step: 'date'
      });

      twiml.message('Enter your preferred date (e.g. 2026-05-10):');
      return res.type('text/xml').send(twiml.toString());
    }

    // 🟡 گرفتن تاریخ
    if (existing && existing.step === 'date') {
      existing.date = message;
      existing.step = 'service';
      await existing.save();

      twiml.message(`
Choose service:
- Swedish
- Deep Tissue
- Relaxation
      `);

      return res.type('text/xml').send(twiml.toString());
    }

    // 🟡 گرفتن سرویس
    if (existing && existing.step === 'service') {
      existing.service = message;
      existing.step = 'done';
      await existing.save();

      twiml.message(`
Booking confirmed

Date: ${existing.date}
Service: ${existing.service}
      `);

      return res.type('text/xml').send(twiml.toString());
    }

    // 🔁 fallback
    twiml.message(`
Please choose:

1. Book a massage
    `);

    res.type('text/xml').send(twiml.toString());

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).send('Server error');
  }
});


// =======================
// 🟢 TEST ROUTE
// =======================

app.get('/', (req, res) => {
  res.send('WhatsApp Bot Running');
});


// 🚀 RUN SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});