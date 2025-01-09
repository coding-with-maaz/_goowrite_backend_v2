const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

class Email {
  constructor(data) {
    this.to = data.email;
    this.name = data.name;
    this.subject = data.subject;
    this.message = data.message;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.from = `${process.env.EMAIL_FROM_NAME || 'Biographies Website'} <${process.env.EMAIL_FROM_ADDRESS || 'noreply@biographies.com'}>`;
  }

  newTransporter() {
    // Gmail SMTP configuration
    return nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_APP_PASSWORD // Use app-specific password
      }
    });
  }

  // Send actual email
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        name: this.name,
        subject: this.subject,
        message: this.message,
        email: this.to,
        ipAddress: this.ipAddress,
        userAgent: this.userAgent
      }
    );

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html,
      text: htmlToText.convert(html)
    };

    // 3) Create a transport and send email
    try {
      await this.newTransporter().sendMail(mailOptions);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  async sendContactConfirmation() {
    await this.send(
      'contact',
      'Thank you for contacting Biographies Website'
    );
  }

  async sendAdminNotification() {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.warn('Admin email not configured. Skipping admin notification.');
      return;
    }

    // Save original recipient
    const originalTo = this.to;
    this.to = adminEmail;

    try {
      await this.send(
        'adminNotification',
        `New Contact Message: ${this.subject}`
      );
    } finally {
      // Restore original recipient
      this.to = originalTo;
    }
  }
}

module.exports = Email;
