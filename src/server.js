const twilio = require('twilio');

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