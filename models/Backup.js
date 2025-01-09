const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, 'Backup must have a filename'],
  },
  path: {
    type: String,
    required: [true, 'Backup must have a path'],
  },
  size: {
    type: Number,
    required: [true, 'Backup must have a size'],
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['completed', 'failed'],
    default: 'completed',
  },
}, {
  timestamps: true,
});

const Backup = mongoose.model('Backup', backupSchema);

module.exports = Backup; 