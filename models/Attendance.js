const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    date: {
      type: String, // "YYYY-MM-DD" format me store karenge
      required: true,
    },
    timeIn: {
      type: String, // "HH:MM:SS"
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'late'],
      default: 'present',
    },
    whatsappSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Ek din me ek student ka sirf ek attendance record
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);