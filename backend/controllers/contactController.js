const nodemailer = require('nodemailer');

// @desc    Submit contact form and send email to admin
// @route   POST /api/contact
// @access  Public (or Private if you want)
const submitContactForm = async (req, res) => {
  const { name, email, problem } = req.body;

  if (!name || !email || !problem) {
    return res.status(400).json({ message: 'Please provide all fields' });
  }

  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM || 'Skill Trade Support <onboarding@resend.dev>';
    const adminEmail = process.env.ADMIN_EMAIL || 'support.skilltrade@gmail.com';

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.5;">
        <h2 style="color: #e01e5a; border-bottom: 2px solid #e01e5a; padding-bottom: 8px;">Support & Fraud Report</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>User Email:</strong> ${email}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p><strong>Message/Problem:</strong></p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; font-size: 14px; white-space: pre-wrap;">${problem}</div>
      </div>
    `;

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY missing in .env. Skipping actual email send.');
      return res.status(200).json({ message: 'Message recorded (Resend API not configured)' });
    }

    const axios = require('axios');
    await axios.post('https://api.resend.com/emails', {
      from: resendFrom,
      to: [adminEmail],
      replyTo: email,
      subject: `Skill Trade Support/Fraud Report from ${name}`,
      html: emailHtml,
    }, {
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    res.status(200).json({ message: 'Your message has been sent successfully!' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ message: 'Failed to send message. Please try again later.' });
  }
};

module.exports = { submitContactForm };
