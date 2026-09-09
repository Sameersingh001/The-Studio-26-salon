require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const Appointment = require('./models/Appointment');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../')); // Serve the HTML files

// ─── MongoDB Connection ───────────────────────────────────────────
if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
} else {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('✅ MongoDB Atlas connected successfully'))
        .catch(err => console.error('❌ MongoDB connection error:', err));
}

// ─── Brevo Email Setup ────────────────────────────────────────────
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;
const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendEmail({ to, toName, subject, htmlContent }) {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = {
        name: process.env.SENDER_NAME || 'The Studio 26 Salon',
        email: process.env.SENDER_EMAIL || 'noreply@thestudio26.com'
    };
    sendSmtpEmail.to = [{ email: to, name: toName }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;

    try {
        await emailApi.sendTransacEmail(sendSmtpEmail);
        console.log(`📧 Email sent to ${to}`);
    } catch (err) {
        console.error('Email error:', err.message);
    }
}

// ─── ROUTES ──────────────────────────────────────────────────────

// POST /api/book — Create new appointment
app.post('/api/book', async (req, res) => {
    try {
        const { name, phone, email, service, date, time, notes, source } = req.body;

        // Validate required fields
        if (!name || !phone || !email || !service || !date || !time) {
            return res.status(400).json({ success: false, message: 'Please fill all required fields, including email.' });
        }

        // Save to MongoDB
        const appointment = new Appointment({ name, phone, email, service, date, time, notes, source });

        // Run DB save and Email sending in parallel to speed up the response
        await Promise.all([
            appointment.save(),
            sendEmail({
                to: process.env.OWNER_EMAIL,
                toName: 'Salon Owner',
                subject: `🔔 New Appointment: ${name} — ${service}`,
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; border-radius: 12px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #cba052, #8a6820); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px;">🌟 New Appointment Booked!</h1>
                        </div>
                        <div style="padding: 30px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr><td style="padding: 10px 0; color: #cba052; font-weight: bold; width: 40%;">Client Name</td><td style="padding: 10px 0; color: #fff;">${name}</td></tr>
                                <tr><td style="padding: 10px 0; color: #cba052; font-weight: bold;">Phone</td><td style="padding: 10px 0; color: #fff;"><a href="tel:${phone}" style="color: #fff;">${phone}</a></td></tr>
                                <tr><td style="padding: 10px 0; color: #cba052; font-weight: bold;">Email</td><td style="padding: 10px 0; color: #fff;">${email || 'Not provided'}</td></tr>
                                <tr><td style="padding: 10px 0; color: #cba052; font-weight: bold;">Service</td><td style="padding: 10px 0; color: #fff;">${service}</td></tr>
                                <tr><td style="padding: 10px 0; color: #cba052; font-weight: bold;">Date</td><td style="padding: 10px 0; color: #fff;">${date}</td></tr>
                                <tr><td style="padding: 10px 0; color: #cba052; font-weight: bold;">Time</td><td style="padding: 10px 0; color: #fff;">${time}</td></tr>
                                <tr><td style="padding: 10px 0; color: #cba052; font-weight: bold;">Notes</td><td style="padding: 10px 0; color: #fff;">${notes || 'None'}</td></tr>
                            </table>
                            <div style="margin-top: 20px; text-align: center;">
                                <a href="${process.env.BASE_URL || `http://localhost:${PORT}`}/admin.html" style="background: #cba052; color: #000; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">View in Admin Panel</a>
                            </div>
                        </div>
                    </div>
                `
            })
        ]);

        res.status(201).json({ success: true, message: 'Appointment booked successfully!', id: appointment._id });

    } catch (err) {
        console.error('Booking error:', err);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// GET /api/appointments — Get all appointments (admin)
app.get('/api/appointments', async (req, res) => {
    try {
        const password = req.headers['x-admin-password'];
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const appointments = await Appointment.find().sort({ createdAt: -1 });
        res.json({ success: true, appointments });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/appointments/:id — Update appointment status (admin)
app.patch('/api/appointments/:id', async (req, res) => {
    try {
        const password = req.headers['x-admin-password'];
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const { status } = req.body;
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        // ── Send confirmation email to client when status = Confirmed ──
        if (status === 'Confirmed' && appointment.email) {
            const { name, email, service, date, time } = appointment;
            await sendEmail({
                to: email,
                toName: name,
                subject: `Appointment Confirmed — The Studio 26 Salon`,
                htmlContent: `
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0; padding:0; background:#f4f4f4; font-family: 'Helvetica Neue', Arial, sans-serif;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4; padding: 40px 20px;">
                    <tr><td align="center">
                      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#0a0a0a; border-radius:16px; overflow:hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.3);">
                        <tr>
                          <td style="background: linear-gradient(135deg, #1a1206, #3d2c0a, #cba052); padding: 50px 40px; text-align:center;">
                            <p style="margin:0 0 6px; color:rgba(255,255,255,0.6); font-size:11px; letter-spacing:4px; text-transform:uppercase;">The Studio 26 Salon</p>
                            <h1 style="margin:0; color:#fff; font-size:28px; font-weight:300; letter-spacing:2px;">Appointment Confirmed</h1>
                            <div style="width:50px; height:2px; background:#4caf50; margin:20px auto 0;"></div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:40px 40px 10px;">
                            <p style="margin:0; color:#e0e0e0; font-size:16px;">Dear <strong style="color:#cba052;">${name}</strong>,</p>
                            <p style="margin:16px 0 0; color:#aaa; font-size:14px; line-height:1.8;">Your appointment has been <strong style="color:#4caf50;">confirmed</strong> by our team. We look forward to welcoming you!</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:24px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#161616; border:1px solid rgba(76,175,80,0.3); border-radius:12px; overflow:hidden;">
                              <tr><td colspan="2" style="padding:16px 20px; background:rgba(76,175,80,0.08); border-bottom:1px solid rgba(76,175,80,0.15);">
                                <p style="margin:0; color:#4caf50; font-size:11px; letter-spacing:3px; text-transform:uppercase; font-weight:600;">Confirmed Booking</p>
                              </td></tr>
                              <tr><td style="padding:14px 20px; color:#888; font-size:13px; width:35%; border-bottom:1px solid rgba(255,255,255,0.04);">Service</td><td style="padding:14px 20px; color:#fff; font-size:13px; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.04);">${service}</td></tr>
                              <tr><td style="padding:14px 20px; color:#888; font-size:13px; border-bottom:1px solid rgba(255,255,255,0.04);">Date</td><td style="padding:14px 20px; color:#fff; font-size:13px; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.04);">${date}</td></tr>
                              <tr><td style="padding:14px 20px; color:#888; font-size:13px;">Time</td><td style="padding:14px 20px; color:#fff; font-size:13px; font-weight:600;">${time}</td></tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 40px 30px;">
                            <p style="margin:0; color:#777; font-size:13px; line-height:1.8;">Please arrive <strong style="color:#aaa;">5 minutes early</strong>. If you need to reschedule, contact us anytime.</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 40px 30px; text-align:center;">
                            <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
                              <td style="padding-right:10px;"><a href="tel:07536055666" style="display:inline-block; background:linear-gradient(135deg,#cba052,#8a6820); color:#000; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:13px; font-weight:700;">Call Us</a></td>
                              <td><a href="https://wa.me/917536055666" style="display:inline-block; background:#25d366; color:#fff; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:13px; font-weight:700;">WhatsApp</a></td>
                            </tr></table>
                          </td>
                        </tr>
                        <tr><td style="padding:0 40px;"><div style="height:1px; background:rgba(255,255,255,0.06);"></div></td></tr>
                        <tr>
                          <td style="padding:30px 40px; text-align:center; background:#0d0d0d;">
                            <p style="margin:0 0 6px; color:#888; font-size:12px; letter-spacing:2px; text-transform:uppercase;">Stay Inspired</p>
                            <h2 style="margin:0 0 10px; color:#fff; font-size:20px; font-weight:400;">Follow Us on Instagram</h2>
                            <p style="margin:0 0 22px; color:#777; font-size:13px; line-height:1.7;">Get daily hair inspiration, makeup trends and exclusive offers on our Instagram.</p>
                            <a href="https://www.instagram.com/the.studio26.salon/" style="display:inline-block; background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888); color:#fff; text-decoration:none; padding:13px 32px; border-radius:8px; font-size:13px; font-weight:700;">Follow @the.studio26.salon</a>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:24px 40px; text-align:center; background:#080808; border-top:1px solid rgba(255,255,255,0.05);">
                            <p style="margin:0 0 4px; color:#555; font-size:12px;">The Studio 26 Salon — Lohamandi, Agra, UP 282007</p>
                            <p style="margin:0; color:#444; font-size:11px;">Mon – Sun: 9:00 AM – 9:00 PM | 075360 55666</p>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </body></html>
                `
            });
            console.log(`📧 Confirmation email sent to ${email}`);
        }

        res.json({ success: true, appointment });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/appointments/:id — Delete appointment (admin)
app.delete('/api/appointments/:id', async (req, res) => {
    try {
        const password = req.headers['x-admin-password'];
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        await Appointment.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Appointment deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📋 Admin panel: http://localhost:${PORT}/admin.html`);
});

// Export the app for Vercel Serverless Function compatibility
module.exports = app;
