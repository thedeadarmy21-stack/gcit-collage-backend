const express = require('express');
const router = express.Router();
const { addStudent, getStudents, getStudentProfile, deleteStudent } = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/add', protect, addStudent);
router.get('/', protect, getStudents);
router.get('/profile/:id', protect, getStudentProfile);
router.delete('/delete/:id', protect, deleteStudent); // 👈 Naya Delete Route

module.exports = router;