const express = require('express');
const router = express.Router();
const { 
  markAttendance, 
  getTodayAttendanceCount, 
  getDashboardStats,
  getClassWiseStats,
  markAbsentees,
  getLowAttendanceStudents,
  askAI // 👈 Naya import
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

router.post('/scan', protect, markAttendance);
router.get('/today', protect, getTodayAttendanceCount);
router.get('/dashboard-stats', protect, getDashboardStats);
router.get('/class-stats', protect, getClassWiseStats);
router.post('/mark-absent', protect, markAbsentees);
router.get('/low-attendance', protect, getLowAttendanceStudents);

// 🚀 NAYA ROUTE: AI Chatbot
router.post('/ask-ai', protect, askAI);

module.exports = router;