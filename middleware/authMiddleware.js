const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');

// Protected route ke liye — sirf logged-in teacher access kar sake
const protect = async (req, res, next) => {
  let token;

  // Check karo Authorization header me Bearer token hai
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // "Bearer xxxxx" me se token nikalo
      token = req.headers.authorization.split(' ')[1];

      // Token verify karo
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Teacher dhundo (password chhod ke)
      req.teacher = await Teacher.findById(decoded.id).select('-password');

      if (!req.teacher) {
        return res.status(401).json({
          success: false,
          message: 'Teacher not found. Please login again.',
        });
      }

      if (!req.teacher.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Contact admin.',
        });
      }

      next();
    } catch (error) {
      console.error('Auth error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Token invalid or expired.',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. No token provided.',
    });
  }
};

module.exports = { protect };