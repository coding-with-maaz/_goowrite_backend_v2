const mongoose = require('mongoose');

const dropUsernameIndex = async () => {
  try {
    await mongoose.connection.collection('users').dropIndex('username_1');
    console.log('Successfully dropped username index');
  } catch (error) {
    if (error.code !== 27) { // Index not found error code
      console.error('Error dropping username index:', error);
    }
  }
};

module.exports = { dropUsernameIndex }; 