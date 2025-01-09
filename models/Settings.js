const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  general: {
    maintenance: {
      type: Boolean,
      default: false
    },
    maintenanceMessage: String,
    registrationEnabled: {
      type: Boolean,
      default: true
    }
  },
  site: {
    siteName: {
      type: String,
      default: 'Biography Website'
    },
    siteDescription: String,
    logo: String,
    favicon: String,
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  email: {
    smtpHost: String,
    smtpPort: {
      type: Number,
      default: 587
    },
    smtpUsername: String,
    smtpPassword: String,
    fromName: String,
    fromEmail: String
  },
  backup: {
    autoBackup: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    retention: {
      type: Number,
      default: 7
    },
    lastBackup: Date
  }
}, {
  timestamps: true
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
