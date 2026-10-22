const express = require('express');
const router = express.Router();
const { 
  markAttendance, 
  getTodayAttendanceCount, 
  getDashboardStats,
  getClassWiseStats,
  markAbsentees,
  getLowAttendanceStudents,
  askAI,
  generateVoice // 👈 Naya import
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

router.post('/scan', protect, markAttendance);
router.get('/today', protect, getTodayAttendanceCount);
router.get('/dashboard-stats', protect, getDashboardStats);
router.get('/class-stats', protect, getClassWiseStats);
router.post('/mark-absent', protect, markAbsentees);
router.get('/low-attendance', protect, getLowAttendanceStudents);

// 🤖 AI Chatbot & Voice Routes
router.post('/ask-ai', protect, askAI);
router.post('/generate-voice', protect, generateVoice); // 👈 Naya Route

module.exports = router;