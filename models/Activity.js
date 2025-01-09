const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Activity must belong to a user']
  },
  action: {
    type: String,
    required: [true, 'Activity must have an action'],
    enum: [
      'created_user',
      'updated_user',
      'deleted_user',
      'created_biography',
      'updated_biography',
      'deleted_biography',
      'created_category',
      'updated_category',
      'deleted_category',
      'login',
      'logout'
    ]
  },
  details: {
    type: String,
    required: [true, 'Activity must have details']
  },
  targetId: {
    type: mongoose.Schema.ObjectId,
    refPath: 'targetModel'
  },
  targetModel: {
    type: String,
    enum: ['User', 'Biography', 'Category']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  ip: String,
  userAgent: String
});

// Index for better query performance
activitySchema.index({ createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
