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
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"${name}" <${email}>`, // From user
      to: process.env.ADMIN_EMAIL || 'support.skilltrade@gmail.com',
      replyTo: email,
      subject: `Skill Trade Support/Fraud Report from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nProblem/Feedback:\n${problem}`,
    };

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('EMAIL credentials missing in .env. Skipping actual email send.');
      return res.status(200).json({ message: 'Message recorded (SMTP not configured)' });
    }

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Your message has been sent successfully!' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ message: 'Failed to send message. Please try again later.' });
  }
};

module.exports = { submitContactForm };
