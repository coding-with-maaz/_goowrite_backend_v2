const Redis = require('ioredis');
const Settings = require('../models/Settings');

let redis;
let cacheEnabled = true;
let cacheDuration = 3600; // 1 hour in seconds

// Initialize Redis connection
const initializeCache = async () => {
  try {
    redis = new Redis(process.env.REDIS_URL);
    
    // Load cache settings
    const settings = await Settings.findOne().select('cache');
    if (settings) {
      cacheEnabled = settings.cache.enabled;
      cacheDuration = settings.cache.duration;
    }

    return true;
  } catch (error) {
    console.error('Redis connection failed:', error);
    return false;
  }
};

// Get item from cache
const getCache = async (key) => {
  if (!cacheEnabled || !redis) return null;

  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

// Set item in cache
const setCache = async (key, value, duration = cacheDuration) => {
  if (!cacheEnabled || !redis) return false;

  try {
    await redis.setex(key, duration, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
};

// Clear specific cache or all cache
const clearCache = async (pattern = '*') => {
  if (!redis) return false;

  try {
    if (pattern === '*') {
      await redis.flushall();
    } else {
      const keys = await redis.keys(`${pattern}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
    return true;
  } catch (error) {
    console.error('Cache clear error:', error);
    return false;
  }
};

// Update cache settings
const updateCacheSettings = async (enabled, duration) => {
  cacheEnabled = enabled;
  cacheDuration = duration;
};

// Cache middleware
const cacheMiddleware = (key, duration) => async (req, res, next) => {
  if (!cacheEnabled || req.method !== 'GET') {
    return next();
  }

  try {
    const cachedData = await getCache(key);
    if (cachedData) {
      return res.status(200).json({
        status: 'success',
        data: cachedData,
        fromCache: true,
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initializeCache,
  getCache,
  setCache,
  clearCache,
  updateCacheSettings,
  cacheMiddleware,
};
