const NodeCache = require('node-cache');

// Initialize cache with default TTL of 5 minutes
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 600,
});

// Simple cache middleware
exports.cacheMiddleware = (duration) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      return res.status(200).json(cachedResponse);
    }

    res.originalJson = res.json;
    res.json = function(body) {
      if (res.statusCode === 200) {
        cache.set(key, body, duration);
      }
      res.originalJson.call(this, body);
    };

    next();
  };
};
