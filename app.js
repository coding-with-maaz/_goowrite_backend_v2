const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');
const path = require('path');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const homeRoutes = require('./routes/homeRoutes');
const biographyRoutes = require('./routes/biographyRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const faqRoutes = require('./routes/faqRoutes');
const contactRoutes = require('./routes/contactRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const profileRoutes = require('./routes/profileRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// CORS Configuration
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['set-cookie']
};

app.use(cors(corsOptions));

// Handle OPTIONS preflight
app.options('*', cors(corsOptions));

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginEmbedderPolicy: false,
}));

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const apiLimiter = rateLimit({
  max: 1000, // Increased limit
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many requests from this IP, please try again in 15 minutes!'
});

const authLimiter = rateLimit({
  max: 50, // Stricter limit for auth routes
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many authentication attempts, please try again in an hour!'
});

// Apply rate limiting
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1', apiLimiter);

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Compression
app.use(compression());

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/home', homeRoutes);
app.use('/api/v1/biographies', biographyRoutes);
app.use('/api/v1/pricing', pricingRoutes);
app.use('/api/v1/faqs', faqRoutes);
app.use('/api/v1/contacts', contactRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/profile', profileRoutes);

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(globalErrorHandler);

// Error handling
app.use(errorHandler);

module.exports = app;
