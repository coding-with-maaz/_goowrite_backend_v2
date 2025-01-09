const Contact = require('../models/Contact');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

// Create contact message
exports.createContact = catchAsync(async (req, res, next) => {
  // 1) Create contact record
  const contact = await Contact.create({
    name: req.body.name,
    email: req.body.email,
    subject: req.body.subject,
    message: req.body.message,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  // 2) Send emails
  try {
    const emailer = new Email({
      name: contact.name,
      email: contact.email,
      subject: contact.subject,
      message: contact.message,
      ipAddress: contact.ipAddress,
      userAgent: contact.userAgent
    });

    // Send both emails concurrently
    await Promise.all([
      emailer.sendContactConfirmation(),
      emailer.sendAdminNotification()
    ]);
  } catch (error) {
    // Log error but don't stop the process
    console.error('Failed to send emails:', error);
  }

  // 3) Send response
  res.status(201).json({
    status: 'success',
    message: 'Your message has been sent successfully! We will get back to you soon.',
    data: {
      contact: {
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        message: contact.message,
        createdAt: contact.createdAt
      }
    }
  });
});

// Get all contacts (admin only)
exports.getAllContacts = catchAsync(async (req, res, next) => {
  const contacts = await Contact.find()
    .sort('-createdAt')
    .select('-__v');

  res.status(200).json({
    status: 'success',
    results: contacts.length,
    data: {
      contacts
    }
  });
});

// Get contact by ID (admin only)
exports.getContact = catchAsync(async (req, res, next) => {
  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return next(new AppError('No contact found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      contact
    }
  });
});

// Update contact status (admin only)
exports.updateContactStatus = catchAsync(async (req, res, next) => {
  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    {
      new: true,
      runValidators: true
    }
  );

  if (!contact) {
    return next(new AppError('No contact found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      contact
    }
  });
});
