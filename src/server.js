require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const twilio = require('twilio');
const cors = require('cors');

const Booking = require('./models/Booking');
const TimeSlot = require('./models/TimeSlot');

const app = express();

// ================= MIDDLEWARE =================

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
  secret: 'secret123',
  resave: false,
  saveUninitialized: true,
}));

// ================= DB =================

mongoose.connect(process.env.MONGO_URI, {
  family: 4,
  serverSelectionTimeoutMS: 10000
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Error:', err.message));

// ================= API =================

// 📅 گرفتن slot ها
app.get('/api/slots', async (req, res) => {
  try {
    const { date } = req.query;

    console.log("📅 Requested date:", date);

    const slots = await TimeSlot.find({
      date: date,
      isBooked: false
    });

    console.log("📊 Slots found:", slots.length);

    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 📥 ثبت booking
app.post('/api/book', async (req, res) => {
  try {
    const { date, time, service, name, phone } = req.body;

    const slot = await TimeSlot.findOne({
      date,
      time,
      isBooked: false
    });

    if (!slot) {
      return res.status(400).json({ error: 'Slot not available' });
    }

    slot.isBooked = true;
    await slot.save();

    await Booking.create({
      phone,
      service,
      date,
      time,
      step: 'done'
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================= ADMIN =================

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
        📅 ${b.date}<br/>
        ⏰ ${b.time}<br/>
        💆 ${b.service}<br/>
      </div>
    `).join('')}
  `);
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// ================= WHATSAPP =================

app.post('/webhook', async (req, res) => {
  try {
    const message = req.body.Body?.trim();
    const twiml = new twilio.twiml.MessagingResponse();

    if (message?.toLowerCase() === 'hi') {
      twiml.message(`Welcome 👋

1. View Services
2. Book Appointment
3. Chat AI`);

      return res.type('text/xml').send(twiml.toString());
    }

    if (message === '1') {
      twiml.message(`Services:
- Swedish
- Deep Tissue
- Relaxation`);
      return res.type('text/xml').send(twiml.toString());
    }

    if (message === '2') {
      twiml.message(`Book here:
https://your-frontend-url.com`);
      return res.type('text/xml').send(twiml.toString());
    }

    twiml.message('Send "hi"');
    res.type('text/xml').send(twiml.toString());

  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// ================= ROOT =================

app.get('/', (req, res) => {
  res.send('Server is running');
});

// ================= START =================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});