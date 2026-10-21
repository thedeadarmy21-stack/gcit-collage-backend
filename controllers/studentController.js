const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { generateQRId, generateQRImage } = require('../utils/qrGenerator');

// @desc    Naya student add karo
const addStudent = async (req, res) => {
  try {
    const { name, rollNumber, className, section, fatherName, fatherWhatsApp, fatherEmail } = req.body;

    if (!name || !rollNumber || !className || !fatherName || !fatherEmail) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const existingStudent = await Student.findOne({ rollNumber, className, section: section || 'A', schoolName: req.teacher.schoolName });
    if (existingStudent) return res.status(400).json({ success: false, message: 'This student already exists in this class' });

    const qrId = generateQRId(rollNumber, className, section || 'A');

    const student = await Student.create({
      name, rollNumber, className, section: section || 'A', fatherName,
      fatherWhatsApp: fatherWhatsApp || '', fatherEmail, qrCode: qrId, schoolName: req.teacher.schoolName,
    });

    const qrImageDataUrl = await generateQRImage(qrId);

    res.status(201).json({
      success: true, message: 'Student added successfully',
      student: { id: student._id, name: student.name, rollNumber: student.rollNumber, className: student.className, section: student.section, fatherName: student.fatherName, fatherEmail: student.fatherEmail, qrCode: student.qrCode, qrImage: qrImageDataUrl },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error while adding student', error: error.message });
  }
};

// @desc    Saare students dekho
const getStudents = async (req, res) => {
  try {
    const students = await Student.find({ schoolName: req.teacher.schoolName }).sort({ className: 1, rollNumber: 1 });
    res.status(200).json({ success: true, count: students.length, students });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Ek student ki puri profile aur attendance history
const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, schoolName: req.teacher.schoolName });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const attendance = await Attendance.find({ studentId: student._id }).sort({ date: -1 });
    const totalPresent = attendance.filter(a => a.status === 'present').length;
    const totalLate = attendance.filter(a => a.status === 'late').length;
    const totalAbsent = attendance.filter(a => a.status === 'absent').length;

    res.status(200).json({ success: true, student, attendance, stats: { totalPresent, totalLate, totalAbsent } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Student Delete karo
const deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    
    const student = await Student.findOne({ _id: studentId, schoolName: req.teacher.schoolName });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    await Attendance.deleteMany({ studentId: studentId });
    await Student.findByIdAndDelete(studentId);

    res.status(200).json({ success: true, message: 'Student and their records deleted successfully' });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting student' });
  }
};

module.exports = { addStudent, getStudents, getStudentProfile, deleteStudent };