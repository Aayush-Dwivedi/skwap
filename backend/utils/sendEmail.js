const nodemailer = require('nodemailer');
const axios = require('axios');

/**
 * Sends an email using either Resend HTTP API (primary) or Gmail SMTP (fallback).
 * 
 * @param {Object} options
 * @param {string|string[]} options.to Recipient email(s)
 * @param {string} options.subject Email subject
 * @param {string} options.html HTML email body
 * @param {string} [options.text] Plaintext body fallback
 * @param {string} [options.replyTo] Optional reply-to address
 */
const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  // 1. Try Resend HTTP API (Primary)
  if (resendApiKey) {
    try {
      const resendFrom = process.env.RESEND_FROM || 'Skill Trade <onboarding@resend.dev>';
      await axios.post('https://api.resend.com/emails', {
        from: resendFrom,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
      }, {
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds
      });
      console.log('Email sent successfully via Resend HTTP API');
      return { success: true, provider: 'resend' };
    } catch (err) {
      // If it fails (like 403 sandbox error), log it and try the fallback
      console.warn('Resend HTTP API failed, attempting SMTP fallback. Error:', err.response?.data?.message || err.message);
    }
  }

  // 2. Try Gmail SMTP Fallback (Failsafe)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        family: 4, // Force IPv4 to resolve connect ENETUNREACH on Render
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      const mailOptions = {
        from: `"Skill Trade Support" <${process.env.EMAIL_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        ...(text ? { text } : {}),
        ...(replyTo ? { replyTo } : {}),
      };

      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully via Gmail SMTP Failsafe');
      return { success: true, provider: 'smtp' };
    } catch (smtpErr) {
      console.error('Gmail SMTP Failsafe also failed. Error:', smtpErr.message);
      throw smtpErr;
    }
  }

  throw new Error('No email service configured (Both Resend API and Gmail SMTP credentials are missing)');
};

module.exports = sendEmail;
