const mongoose = require('mongoose');
const slugify = require('slugify');
const mongoosePaginate = require('mongoose-paginate-v2');

/**
 * Sub-schemas
 */
const educationSchema = new mongoose.Schema({
  institution: { type: String },
  degree: String,
  year: String,
  description: String,
  location: String,
  startDate: Date,
  endDate: Date,
  honors: [String]
});

const awardSchema = new mongoose.Schema({
  name: String,
  year: String,
  description: String,
  institution: String,
  category: String,
  significance: String
});

const spouseSchema = new mongoose.Schema({
  name: String,
  marriageYear: String,
  divorceYear: String,
  deathYear: String,
  description: String,
  occupation: String
});

const childSchema = new mongoose.Schema({
  name: String,
  birthYear: String,
  deathYear: String,
  occupation: String,
  biography: {
    type: mongoose.Schema.ObjectId,
    ref: 'Biography'
  }
});

const quoteSchema = new mongoose.Schema({
  text: String,
  context: String,
  year: String,
  source: String,
  category: String
});

const timelineEventSchema = new mongoose.Schema({
  date: { type: Date },
  title: String,
  description: String,
  location: String,
  category: String,
  importance: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
});

const publicationSchema = new mongoose.Schema({
  title: String,
  year: String,
  type: {
    type: String,
    enum: ['book', 'article', 'paper', 'patent', 'other']
  },
  publisher: String,
  description: String,
  link: String,
  isbn: String,
  doi: String,
  citations: Number,
  coAuthors: [String]
});

const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    validate: {
      validator: function(v) {
        return /^(http|https):\/\/[^ "]+$/.test(v);
      },
      message: 'Please provide a valid image URL'
    }
  },
  caption: {
    type: String,
    trim: true,
    maxlength: [200, 'Caption cannot be more than 200 characters']
  },
  credit: {
    type: String,
    trim: true,
    maxlength: [100, 'Credit cannot be more than 100 characters']
  }
}, { _id: true });

const sourceSchema = new mongoose.Schema({
  title: String,
  url: String,
  author: String,
  publishedDate: Date,
  publisher: String,
  type: {
    type: String,
    enum: ['book', 'article', 'website', 'document', 'other']
  }
});

/**
 * Main Biography Schema
 */
const biographySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'A biography must have a title'],
    unique: true,
    trim: true,
    maxlength: [100, 'Title must be less than 100 characters']
  },
  slug: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'A biography must have a name'],
    trim: true
  },
  shortDescription: {
    type: String,
    required: [true, 'A biography must have a short description'],
    trim: true,
    maxlength: [200, 'Short description must be less than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'A biography must have a description'],
    trim: true
  },
  birthDate: {
    type: Date
  },
  deathDate: {
    type: Date
  },
  birthPlace: {
    type: String,
    trim: true
  },
  deathPlace: {
    type: String,
    trim: true
  },
  nationality: {
    type: [String],
    default: []
  },
  occupation: [String],
  knownFor: [String],
  languages: [String],
  education: {
    type: [educationSchema],
    default: undefined
  },
  awards: {
    type: [awardSchema],
    default: undefined
  },
  spouses: {
    type: [spouseSchema],
    default: undefined
  },
  children: {
    type: [childSchema],
    default: undefined
  },
  quotes: {
    type: [quoteSchema],
    default: undefined
  },
  timeline: {
    type: [timelineEventSchema],
    default: undefined
  },
  publications: {
    type: [publicationSchema],
    default: undefined
  },
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category',
    required: [true, 'A biography must belong to a category']
  },
  tags: [String],
  image: {
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Please provide a valid image URL'
    }
  },
  profileImage: {
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Please provide a valid profile image URL'
    }
  },
  featured: {
    type: Boolean,
    default: false
  },
  published: {
    type: Boolean,
    default: false
  },
  biographyOfTheDay: {
    type: Boolean,
    default: false
  },
  biographyOfTheDayDate: {
    type: Date
  },
  gallery: {
    type: [imageSchema],
    default: undefined
  },
  sources: {
    type: [sourceSchema],
    default: undefined
  },
  influence: {
    influencedBy: [{
      type: mongoose.Schema.ObjectId,
      ref: 'Biography'
    }],
    influenced: [{
      type: mongoose.Schema.ObjectId,
      ref: 'Biography'
    }]
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A biography must have an author']
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  contributors: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  publishedAt: Date,
  lastModifiedAt: {
    type: Date,
    default: Date.now
  },
  lastViewedAt: Date,
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  bookmarks: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
biographySchema.index({ slug: 1 });
biographySchema.index({ category: 1 });
biographySchema.index({ tags: 1 });
biographySchema.index({ featured: 1 });
biographySchema.index({ published: 1 });
biographySchema.index({ createdAt: -1 });
biographySchema.index({ name: 'text', shortDescription: 'text', description: 'text' });
biographySchema.index({ 'sources.url': 1 });

// Middleware
biographySchema.pre('save', function(next) {
  if (!this.isModified('title')) return next();
  
  this.slug = slugify(this.title, {
    lower: true,
    strict: true
  });
  next();
});

biographySchema.pre(/^find/, function(next) {
  this.populate({
    path: 'category',
    select: 'name slug color'
  })
  .populate({
    path: 'createdBy',
    select: 'name avatar'
  });
  next();
});

biographySchema.pre('save', async function(next) {
  // Set publication date
  if (this.isModified('published') && this.published && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Update last modified date
  if (this.isModified()) {
    this.lastModifiedAt = new Date();
  }

  next();
});

// Update last viewed date when views are modified
biographySchema.pre('save', function(next) {
  if (this.isModified('views')) {
    this.lastViewedAt = new Date();
  }
  next();
});

// Plugins
biographySchema.plugin(mongoosePaginate);

// Add this pre-save middleware to set author as createdBy if not specified
biographySchema.pre('save', function(next) {
  if (!this.author) {
    this.author = this.createdBy;
  }
  next();
});

/**
 * Model
 */
const Biography = mongoose.model('Biography', biographySchema);

module.exports = Biography;
