const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  console.log('Error stack:', err.stack);
  process.exit(1);
});

// Load environment variables
dotenv.config({ path: './config/config.env' });

const app = require('./app');

// Connect to database with more detailed error logging
mongoose
  .connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection successful!'))
  .catch((err) => {
    console.error('DB Connection Error Details:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    process.exit(1);
  });

// Start server
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}...`);
});

// Handle unhandled promise rejections with more detailed logging
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log('Error details:', {
    name: err.name,
    message: err.message,
    stack: err.stack
  });
  server.close(() => {
    process.exit(1);
  });
});
