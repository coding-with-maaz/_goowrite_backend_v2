const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      trim: true,
      lowercase: true,
      match: [
        /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/,
        'Please provide a valid email address',
      ],
    },
    subject: {
      type: String,
      required: [true, 'Please provide a subject'],
      trim: true,
      minlength: [5, 'Subject must be at least 5 characters long'],
      maxlength: [100, 'Subject cannot exceed 100 characters'],
    },
    message: {
      type: String,
      required: [true, 'Please provide your message'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters long'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'read', 'replied', 'archived', 'spam'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    assignedTo: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    replyMessage: {
      type: String,
      trim: true,
    },
    repliedAt: Date,
    repliedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    ipAddress: String,
    userAgent: String,
    attachments: [
      {
        filename: String,
        path: String,
        mimetype: String,
        size: Number,
      },
    ],
    tags: [String],
    notes: [
      {
        content: {
          type: String,
          required: true,
        },
        createdBy: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });
contactSchema.index({ assignedTo: 1 });
contactSchema.index({ tags: 1 });

// Pre-save middleware
contactSchema.pre('save', function (next) {
  // Set priority based on subject keywords
  const highPriorityKeywords = ['urgent', 'important', 'asap', 'emergency'];
  const lowPriorityKeywords = ['feedback', 'suggestion', 'question'];
  
  const subjectLower = this.subject.toLowerCase();
  
  if (highPriorityKeywords.some(keyword => subjectLower.includes(keyword))) {
    this.priority = 'high';
  } else if (lowPriorityKeywords.some(keyword => subjectLower.includes(keyword))) {
    this.priority = 'low';
  }

  next();
});

// Virtual for response time
contactSchema.virtual('responseTime').get(function () {
  if (!this.repliedAt) return null;
  return this.repliedAt - this.createdAt;
});

// Instance method to add a note
contactSchema.methods.addNote = function (content, userId) {
  this.notes.push({
    content,
    createdBy: userId,
  });
  return this.save();
};

// Instance method to update status
contactSchema.methods.updateStatus = function (status, userId) {
  this.status = status;
  if (status === 'replied') {
    this.repliedAt = Date.now();
    this.repliedBy = userId;
  }
  return this.save();
};

// Static method to get contact statistics
contactSchema.statics.getStats = async function () {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgResponseTime: {
          $avg: {
            $cond: [
              { $ne: ['$repliedAt', null] },
              { $subtract: ['$repliedAt', '$createdAt'] },
              null,
            ],
          },
        },
      },
    },
  ]);
};

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
