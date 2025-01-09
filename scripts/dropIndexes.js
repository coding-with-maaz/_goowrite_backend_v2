const mongoose = require('mongoose');
require('dotenv').config();

const dropIndexes = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB...');

    // Drop all indexes from users collection
    await mongoose.connection.collection('users').dropIndexes();
    console.log('All indexes dropped from users collection');

    // Create only the necessary indexes
    await mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('Email index recreated');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

dropIndexes(); 