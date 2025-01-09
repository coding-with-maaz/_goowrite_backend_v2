const mongoose = require('mongoose');
const Biography = require('../models/Biography');

const migrateBiographies = async () => {
  try {
    const biographies = await Biography.find({
      nationality: { $type: 'string' }
    });

    for (const biography of biographies) {
      biography.nationality = biography.nationality ? [biography.nationality] : [];
      await biography.save();
    }

    console.log(`Successfully migrated ${biographies.length} biographies`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
  process.exit();
};

migrateBiographies(); 