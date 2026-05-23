const nodemailer = require('nodemailer');
const axios = require('axios');

/**
 * Sends an email using either Resend, SendGrid, Brevo HTTP APIs (primary) or Gmail SMTP (fallback).
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
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const brevoApiKey = process.env.BREVO_API_KEY;
  
  // 1. Try SendGrid HTTP API (Port 443 - Perfect for Free Tier / No Domain)
  if (sendgridApiKey) {
    try {
      const sendgridFrom = process.env.SENDGRID_FROM || 'support.skilltrade@gmail.com';
      await axios.post('https://api.sendgrid.com/v3/mail/send', {
        personalizations: [{
          to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
        }],
        from: {
          email: sendgridFrom,
          name: 'Skill Trade Support'
        },
        subject,
        content: [{
          type: 'text/html',
          value: html
        }],
        ...(replyTo ? { reply_to: { email: replyTo } } : {})
      }, {
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10s timeout
      });
      console.log('Email sent successfully via SendGrid HTTP API');
      return { success: true, provider: 'sendgrid' };
    } catch (err) {
      console.warn('SendGrid HTTP API failed, trying fallbacks. Error:', err.response?.data || err.message);
    }
  }

  // 2. Try Brevo (Sendinblue) HTTP API (Port 443 - Perfect for Free Tier / No Domain / Instant Signup)
  if (brevoApiKey) {
    try {
      const brevoFrom = process.env.BREVO_FROM || 'support.skilltrade@gmail.com';
      await axios.post('https://api.brevo.com/v3/smtp/email', {
        sender: {
          name: 'Skill Trade Support',
          email: brevoFrom
        },
        to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
        subject,
        htmlContent: html,
        ...(replyTo ? { replyTo: { email: replyTo } } : {})
      }, {
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10s timeout
      });
      console.log('Email sent successfully via Brevo HTTP API');
      return { success: true, provider: 'brevo' };
    } catch (err) {
      console.warn('Brevo HTTP API failed, trying fallbacks. Error:', err.response?.data || err.message);
    }
  }

  // 3. Try Resend HTTP API (Port 443 - Requires Custom Domain Verification)
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
        timeout: 10000
      });
      console.log('Email sent successfully via Resend HTTP API');
      return { success: true, provider: 'resend' };
    } catch (err) {
      console.warn('Resend HTTP API failed, attempting SMTP fallback. Error:', err.response?.data?.message || err.message);
    }
  }

  // 4. Try Gmail SMTP (Failsafe - Port 465 - Will time out on Render Free Tier but works locally)
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
        family: 4, // Force IPv4
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
      console.log('Email sent successfully via Gmail SMTP');
      return { success: true, provider: 'smtp' };
    } catch (smtpErr) {
      console.error('Gmail SMTP Failsafe also failed. Error:', smtpErr.message);
      throw smtpErr;
    }
  }

  throw new Error('No email service configured (Resend, SendGrid, Brevo APIs and Gmail SMTP all missing credentials)');
};

module.exports = sendEmail;
