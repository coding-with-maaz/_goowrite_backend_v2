const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'API key name is required'],
    trim: true,
  },
  key: {
    type: String,
    unique: true,
    select: false,
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete'],
    default: ['read'],
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'revoked'],
    default: 'active',
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  expiresAt: {
    type: Date,
  },
  lastUsed: {
    type: Date,
  },
}, {
  timestamps: true,
});

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey; 