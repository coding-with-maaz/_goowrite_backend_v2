const Activity = require('../models/Activity');

const logActivity = async (user, action, details, targetId = null, targetModel = null, req) => {
  try {
    await Activity.create({
      user: user._id,
      action,
      details,
      targetId,
      targetModel,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

module.exports = {
  logUserActivity: (action) => async (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      const userId = req.params.id || (data?.data?.user?._id);
      
      if (res.statusCode === 200 || res.statusCode === 201) {
        logActivity(
          req.user,
          action,
          `${req.user.username} ${action.replace('_', ' ')} ${userId ? `ID: ${userId}` : ''}`,
          userId,
          'User',
          req
        );
      }
      
      return originalJson.call(this, data);
    };
    next();
  },

  logCategoryActivity: (action) => async (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      const categoryId = req.params.id || (data?.data?.category?._id);
      
      if (res.statusCode === 200 || res.statusCode === 201) {
        logActivity(
          req.user,
          action,
          `${req.user.username} ${action.replace('_', ' ')} ${categoryId ? `ID: ${categoryId}` : ''}`,
          categoryId,
          'Category',
          req
        );
      }
      
      return originalJson.call(this, data);
    };
    next();
  },

  logBiographyActivity: (action) => async (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      const biographyId = req.params.id || (data?.data?.biography?._id);
      
      if (res.statusCode === 200 || res.statusCode === 201) {
        logActivity(
          req.user,
          action,
          `${req.user.username} ${action.replace('_', ' ')} ${biographyId ? `ID: ${biographyId}` : ''}`,
          biographyId,
          'Biography',
          req
        );
      }
      
      return originalJson.call(this, data);
    };
    next();
  },

  logAuthActivity: (action) => async (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode === 200 || res.statusCode === 201) {
        logActivity(
          req.user,
          action,
          `${req.user.username} ${action === 'login' ? 'logged in' : 'logged out'}`,
          req.user._id,
          'User',
          req
        );
      }
      
      return originalJson.call(this, data);
    };
    next();
  }
};
