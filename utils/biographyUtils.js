const slugify = require('slugify');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const AppError = require('./appError');

// Generate unique slug for biography
exports.generateSlug = async (title, Biography) => {
  let slug = slugify(title, { lower: true, strict: true });
  let counter = 1;
  let exists = await Biography.findOne({ slug });

  while (exists) {
    slug = slugify(`${title}-${counter}`, { lower: true, strict: true });
    exists = await Biography.findOne({ slug });
    counter++;
  }

  return slug;
};

// Process and optimize biography images
exports.processImage = async (file, options = {}) => {
  const {
    width = 800,
    height = 600,
    quality = 80,
    format = 'jpeg',
  } = options;

  const filename = `biography-${Date.now()}.${format}`;
  const uploadPath = path.join('public', 'uploads', 'biographies', filename);

  await sharp(file.buffer)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .toFormat(format)
    .jpeg({ quality })
    .toFile(uploadPath);

  return filename;
};

// Calculate reading time
exports.calculateReadingTime = (content) => {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  return readingTime;
};

// Extract metadata from content
exports.extractMetadata = (content) => {
  const metadata = {
    wordCount: content.split(/\s+/).length,
    characterCount: content.length,
    paragraphCount: content.split(/\n\s*\n/).length,
    headingCount: (content.match(/#{1,6}\s/g) || []).length,
    linkCount: (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length,
    imageCount: (content.match(/!\[([^\]]+)\]\(([^)]+)\)/g) || []).length,
  };

  return metadata;
};

// Generate excerpt from content
exports.generateExcerpt = (content, length = 150) => {
  // Remove markdown formatting
  let plainText = content
    .replace(/#+\s/g, '') // Remove headings
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // Replace links with text
    .replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '') // Remove images
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // Remove italic
    .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough
    .replace(/`(.*?)`/g, '$1') // Remove inline code
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .trim();

  // Get first few sentences
  let excerpt = plainText.split(/[.!?]/).slice(0, 2).join('. ');

  // Truncate if still too long
  if (excerpt.length > length) {
    excerpt = excerpt.substring(0, length).trim() + '...';
  }

  return excerpt;
};

// Clean up old images
exports.cleanupOldImages = async (oldImagePath) => {
  try {
    if (!oldImagePath) return;
    const fullPath = path.join('public', 'uploads', 'biographies', oldImagePath);
    await fs.unlink(fullPath);
  } catch (error) {
    console.error('Error deleting old image:', error);
  }
};

// Validate biography data
exports.validateBiographyData = (data) => {
  const errors = [];

  if (!data.title || data.title.length < 3) {
    errors.push('Title must be at least 3 characters long');
  }

  if (!data.content || data.content.length < 100) {
    errors.push('Content must be at least 100 characters long');
  }

  if (!data.category) {
    errors.push('Category is required');
  }

  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('Tags must be an array');
  }

  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }
};

// Generate timeline events from biography content
exports.generateTimeline = (content) => {
  const timelineRegex = /\*\*(\d{4}(?:-\d{2})?(?:-\d{2})?)\*\*\s*[:|-]\s*([^\n]+)/g;
  const events = [];
  let match;

  while ((match = timelineRegex.exec(content)) !== null) {
    events.push({
      date: match[1],
      event: match[2].trim(),
    });
  }

  return events.sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Format biography for API response
exports.formatBiographyResponse = (biography, user = null) => {
  const response = {
    id: biography._id,
    title: biography.title,
    slug: biography.slug,
    content: biography.content,
    excerpt: biography.excerpt,
    category: biography.category,
    tags: biography.tags,
    image: biography.image,
    author: {
      id: biography.author._id,
      name: biography.author.name,
      avatar: biography.author.avatar,
    },
    stats: {
      views: biography.stats.views,
      likes: biography.stats.likes,
      comments: biography.stats.comments,
      readingTime: biography.stats.readingTime,
    },
    metadata: biography.metadata,
    createdAt: biography.createdAt,
    updatedAt: biography.updatedAt,
  };

  if (user) {
    response.isLiked = biography.likes.includes(user._id);
    response.isBookmarked = biography.bookmarks.includes(user._id);
  }

  return response;
};
