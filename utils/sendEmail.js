const nodemailer = require('nodemailer');
const pug = require('pug');
const { convert } = require('html-to-text');

const sendEmail = async (options) => {
  // 1) Create a transporter
  const transporter = nodemailer.createTransport({
    host: options.host || process.env.SMTP_HOST,
    port: options.port || process.env.SMTP_PORT,
    auth: {
      user: options.username || process.env.SMTP_USERNAME,
      pass: options.password || process.env.SMTP_PASSWORD
    }
  });

  // 2) Render HTML template if template name is provided
  let html;
  if (options.template) {
    html = pug.renderFile(`${__dirname}/../views/emails/${options.template}.pug`, {
      ...options.templateData,
      subject: options.subject
    });
  }

  // 3) Define email options
  const mailOptions = {
    from: options.from || `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: options.to,
    subject: options.subject,
    text: options.text || convert(html),
    html: options.html || html
  };

  // 4) Send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail; 