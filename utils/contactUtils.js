const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const AppError = require('./appError');

// Configure multer for file upload
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  // Allow common file types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Please upload only images, PDFs, or documents.', 400), false);
  }
};

exports.upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5, // Maximum 5 files
  },
});

// Process and save contact attachments
exports.processAttachments = async (files) => {
  if (!files || !files.length) return [];

  const attachments = [];
  const uploadDir = path.join('public', 'uploads', 'contacts');

  // Ensure upload directory exists
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
    throw new AppError('Error processing attachments', 500);
  }

  // Process each file
  for (const file of files) {
    const filename = `contact-${Date.now()}-${file.originalname}`;
    const filepath = path.join(uploadDir, filename);

    try {
      await fs.writeFile(filepath, file.buffer);
      attachments.push({
        filename,
        path: `/uploads/contacts/${filename}`,
        mimetype: file.mimetype,
        size: file.size,
      });
    } catch (error) {
      console.error('Error saving file:', error);
      throw new AppError('Error processing attachments', 500);
    }
  }

  return attachments;
};

// Clean up contact attachments
exports.cleanupAttachments = async (attachments) => {
  if (!attachments || !attachments.length) return;

  for (const attachment of attachments) {
    try {
      const filepath = path.join('public', attachment.path);
      await fs.unlink(filepath);
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  }
};

// Validate contact data
exports.validateContactData = (data) => {
  const errors = [];

  if (!data.name || data.name.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Please provide a valid email address');
  }

  if (!data.subject || data.subject.length < 5) {
    errors.push('Subject must be at least 5 characters long');
  }

  if (!data.message || data.message.length < 10) {
    errors.push('Message must be at least 10 characters long');
  }

  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }
};

// Format contact for API response
exports.formatContactResponse = (contact) => {
  return {
    id: contact._id,
    name: contact.name,
    email: contact.email,
    subject: contact.subject,
    message: contact.message,
    status: contact.status,
    priority: contact.priority,
    assignedTo: contact.assignedTo,
    replyMessage: contact.replyMessage,
    repliedAt: contact.repliedAt,
    repliedBy: contact.repliedBy,
    attachments: contact.attachments,
    tags: contact.tags,
    notes: contact.notes,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
};

// Helper function to validate email
const isValidEmail = (email) => {
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  return emailRegex.test(email);
};

// Generate email templates
exports.generateEmailTemplates = {
  confirmation: (contact) => ({
    subject: 'We received your message',
    html: `
      <h2>Thank you for contacting us, ${contact.name}!</h2>
      <p>We have received your message regarding "${contact.subject}".</p>
      <p>Our team will review your message and get back to you as soon as possible.</p>
      <p>For your reference, here's a copy of your message:</p>
      <blockquote>${contact.message}</blockquote>
      <p>Best regards,<br>The Support Team</p>
    `,
  }),

  adminNotification: (contact) => ({
    subject: 'New Contact Form Submission',
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>From:</strong> ${contact.name} (${contact.email})</p>
      <p><strong>Subject:</strong> ${contact.subject}</p>
      <p><strong>Message:</strong></p>
      <blockquote>${contact.message}</blockquote>
      <p><strong>Priority:</strong> ${contact.priority}</p>
      <p><a href="/admin/contacts/${contact._id}">View in Admin Panel</a></p>
    `,
  }),

  reply: (contact) => ({
    subject: `Re: ${contact.subject}`,
    html: `
      <h2>Response to Your Message</h2>
      <p>Dear ${contact.name},</p>
      <p>Thank you for your message. Here's our response:</p>
      <blockquote>${contact.replyMessage}</blockquote>
      <p>Original message:</p>
      <blockquote>${contact.message}</blockquote>
      <p>Best regards,<br>The Support Team</p>
    `,
  }),
};
