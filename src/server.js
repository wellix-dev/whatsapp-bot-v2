require('dotenv').config();

const express = require("express");
const { MessagingResponse } = require("twilio").twiml;

const connectDB = require('./config/db');
const User = require('./models/User');
const Booking = require('./models/Booking');

const app = express();
const PORT = process.env.PORT || 3000;

// اتصال به دیتابیس
connectDB();

// middleware
app.use(express.urlencoded({ extended: true }));

// ذخیره موقت وضعیت کاربران (فعلاً)
const userState = {};

// تست سرور
app.get("/", (req, res) => {
  res.send("WhatsApp Bot is running 🚀");
});

// webhook اصلی
app.post("/webhook", async (req, res) => {
  const incomingMsg = req.body.Body.trim();
  const userPhone = req.body.From;

  console.log("📩 Message:", incomingMsg);

  // ذخیره کاربر اگر وجود نداشت
  let user = await User.findOne({ phone: userPhone });

  if (!user) {
    user = await User.create({ phone: userPhone });
    console.log("👤 New user saved");
  }

  // اگر کاربر جدید بود
  if (!userState[userPhone]) {
    userState[userPhone] = { step: "start" };
  }

  const step = userState[userPhone].step;
  let response = "";

  // شروع
  if (incomingMsg.toLowerCase() === "hi") {
    userState[userPhone].step = "menu";

    response = `Welcome to Wellix Massage Therapy 🌿

Please choose an option:
1. Book a massage
2. View services`;
  }

  // منو
  else if (step === "menu") {
    if (incomingMsg === "1") {
      response = `Please choose your massage:

1. Relaxation (£50)
2. Deep Tissue (£70)`;

      userState[userPhone].step = "massage";

    } else if (incomingMsg === "2") {
      response = `Our Services:

Relaxation Massage - £50
Deep Tissue Massage - £70

Reply 1 to book.`;

    } else {
      response = "Please enter 1 or 2.";
    }
  }

  // انتخاب ماساژ
  else if (step === "massage") {
    if (incomingMsg === "1") {
      userState[userPhone].massage = "Relaxation";
    } else if (incomingMsg === "2") {
      userState[userPhone].massage = "Deep Tissue";
    } else {
      return sendResponse(res, "Please select 1 or 2.");
    }

    userState[userPhone].step = "date";
    response = "Please enter your preferred date (e.g. 12 May)";
  }

  // تاریخ
  else if (step === "date") {
    userState[userPhone].date = incomingMsg;
    userState[userPhone].step = "time";

    response = "Please enter your preferred time (e.g. 3PM)";
  }

  // زمان + ذخیره در DB
  else if (step === "time") {
    userState[userPhone].time = incomingMsg;

    // ذخیره رزرو در دیتابیس
    await Booking.create({
      phone: userPhone,
      service: userState[userPhone].massage,
      date: userState[userPhone].date,
      time: userState[userPhone].time,
    });

    response = `Booking Confirmed ✅

Massage: ${userState[userPhone].massage}
Date: ${userState[userPhone].date}
Time: ${userState[userPhone].time}

Thank you! We look forward to seeing you 🌿`;

    userState[userPhone].step = "done";
  }

  // پایان
  else if (step === "done") {
    response = "If you want to book again, type hi 😊";
    userState[userPhone].step = "start";
  }

  sendResponse(res, response);
});

// تابع ارسال پاسخ
function sendResponse(res, message) {
  const twiml = new MessagingResponse();
  twiml.message(message);

  res.set("Content-Type", "text/xml");
  res.send(twiml.toString());
}

// اجرای سرور
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});