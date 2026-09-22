const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({
    message: 'Access denied: Administrator privileges required',
  });
};

module.exports = { adminMiddleware, admin: adminMiddleware };
