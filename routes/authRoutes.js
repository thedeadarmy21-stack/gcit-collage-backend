const express = require('express');
const router = express.Router();
const { registerTeacher, loginTeacher, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerTeacher);
router.post('/login', loginTeacher);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile); 

// 🚀 Reset-locks route hata diya gaya hai
// router.get('/reset-locks', resetDeviceLocks);

module.exports = router;