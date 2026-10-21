const express = require('express');
const router = express.Router();
const { getMonthlyReport } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/reports/monthly/:studentId
router.get('/monthly/:studentId', protect, getMonthlyReport);

module.exports = router;