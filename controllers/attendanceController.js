const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { sendWhatsAppMessage } = require('../utils/whatsappSender');
const { Groq } = require('groq-sdk');
const { EdgeTTS } = require('@travisvn/edge-tts'); // 👈 Naya Package

// @desc    Student ka QR scan karke attendance lagao
const markAttendance = async (req, res) => {
  try {
    const { qrCode, targetClass } = req.body; 
    const teacherId = req.teacher._id;
    const schoolName = req.teacher.schoolName;

    if (!qrCode) return res.status(400).json({ success: false, message: 'QR Code is required' });

    const student = await Student.findOne({ qrCode, schoolName });
    if (!student) return res.status(404).json({ success: false, message: 'Invalid QR Code' });

    if (targetClass && student.className !== targetClass) {
      return res.status(400).json({ success: false, message: `Invalid Student! Ye student Class ${student.className} ka hai, aap Class ${targetClass} scan kar rahe hain.` });
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
    const timeStr = today.toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour12: true, hour: '2-digit', minute: '2-digit' });
    const localTime24 = today.toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour12: false });
    const [localHour, localMinute] = localTime24.split(':').map(Number);

    let status = 'present';
    if (localHour > 8 || (localHour === 8 && localMinute > 15)) status = 'late';

    const existingAttendance = await Attendance.findOne({ studentId: student._id, date: dateStr });
    if (existingAttendance) {
      return res.status(400).json({ success: false, message: `Already marked for ${student.name} at ${existingAttendance.timeIn}` });
    }

    await Attendance.create({ studentId: student._id, teacherId, date: dateStr, timeIn: timeStr, status: status });

    const message = `Assalam-o-Alaikum. Aapka beta ${student.name} (Roll No: ${student.rollNumber}) aaj GCIT Collage ${status === 'late' ? 'der se ' : ''}aa gaya hai. Time: ${timeStr} hai.`;
    
    if (process.env.EMAIL_ENABLED === 'true') {
      await sendWhatsAppMessage(student.fatherEmail, student.fatherWhatsApp, message);
    } else {
      console.log('📝 Attendance marked (email disabled):', message);
    }

    res.status(200).json({ success: true, studentName: student.name, rollNumber: student.rollNumber, timeIn: timeStr, status: status });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Aaj ki total attendance count
const getTodayAttendanceCount = async (req, res) => {
  try {
    const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }); 
    const count = await Attendance.countDocuments({ teacherId: req.teacher._id, date: dateStr });
    res.status(200).json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Dashboard ke liye aaj ka data
const getDashboardStats = async (req, res) => {
  try {
    const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }); 
    const totalStudents = await Student.countDocuments({ schoolName: req.teacher.schoolName, isActive: true });
    const presentToday = await Attendance.countDocuments({ teacherId: req.teacher._id, date: dateStr });
    const absentToday = totalStudents - presentToday;
    res.status(200).json({ success: true, totalStudents, presentToday, absentToday: absentToday < 0 ? 0 : absentToday });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Class-wise Stats
const getClassWiseStats = async (req, res) => {
  try {
    const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
    const schoolName = req.teacher.schoolName;
    const students = await Student.find({ schoolName, isActive: true });
    const todayAttendance = await Attendance.find({ date: dateStr, teacherId: req.teacher._id });
    const classData = {};

    students.forEach(student => {
      const className = student.className;
      if (!classData[className]) {
        classData[className] = { className, total: 0, present: 0, absent: 0 };
      }
      classData[className].total += 1;
      const isPresent = todayAttendance.find(a => a.studentId.toString() === student._id.toString());
      if (isPresent) classData[className].present += 1;
      else classData[className].absent += 1;
    });

    const result = Object.values(classData).sort((a, b) => a.className.localeCompare(b.className));
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark all unscanned students as absent
const markAbsentees = async (req, res) => {
  try {
    const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
    const presentRecords = await Attendance.find({ date: dateStr, teacherId: req.teacher._id }).select('studentId');
    const presentStudentIds = presentRecords.map(r => r.studentId.toString());

    const absentStudents = await Student.find({ schoolName: req.teacher.schoolName, isActive: true, _id: { $nin: presentStudentIds } });

    const absentRecords = absentStudents.map(student => ({
      studentId: student._id, teacherId: req.teacher._id, date: dateStr, timeIn: '--:--', status: 'absent'
    }));

    if (absentRecords.length > 0) await Attendance.insertMany(absentRecords);
    res.status(200).json({ success: true, message: `${absentStudents.length} students marked as absent.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Low Attendance Alert
const getLowAttendanceStudents = async (req, res) => {
  try {
    const { className } = req.query;
    const schoolName = req.teacher.schoolName;
    
    let query = { schoolName, isActive: true };
    if (className && className !== 'all') query.className = className;

    const students = await Student.find(query);
    const lowAttendanceList = [];
    const totalDays = 20; 

    for (const student of students) {
      const totalPresent = await Attendance.countDocuments({ studentId: student._id, status: { $in: ['present', 'late'] } });
      const percentage = Math.round((totalPresent / totalDays) * 100);
      
      if (percentage < 75) {
        lowAttendanceList.push({
          _id: student._id, name: student.name, rollNumber: student.rollNumber, className: student.className, percentage: percentage > 100 ? 100 : percentage
        });
      }
    }

    lowAttendanceList.sort((a, b) => a.percentage - b.percentage);
    res.status(200).json({ success: true, data: lowAttendanceList });
  } catch (error) {
    console.error('Low Attendance Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 🤖 @desc    AI Chatbot (Voice & Text) - Groq Integration
const askAI = async (req, res) => {
  try {
    const { question } = req.body;
    const schoolName = req.teacher.schoolName;
    const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });

    if (!question) return res.status(400).json({ success: false, message: 'Question is required' });

    const totalStudents = await Student.countDocuments({ schoolName, isActive: true });
    const presentToday = await Attendance.countDocuments({ teacherId: req.teacher._id, date: dateStr });
    const absentToday = totalStudents - presentToday;
    const studentsList = await Student.find({ schoolName, isActive: true }).select('name rollNumber className fatherName');
    const attendanceToday = await Attendance.find({ teacherId: req.teacher._id, date: dateStr }).populate('studentId', 'name rollNumber className');

    const dbContext = `
      School Name: ${schoolName}
      Aaj ki Date: ${dateStr}
      Total Students: ${totalStudents}
      Aaj Present: ${presentToday}
      Aaj Absent: ${absentToday}
      
      --- PURA STUDENTS DATA (Name, Roll, Class, Father) ---
      ${studentsList.map(s => `Name: ${s.name}, Roll: ${s.rollNumber}, Class: ${s.className}, Father: ${s.fatherName}`).join('\n')}
      
      --- AAJ KI ATTENDANCE (Jo aaye hain) ---
      ${attendanceToday.map(a => `Name: ${a.studentId?.name}, Time: ${a.timeIn}, Status: ${a.status}`).join('\n')}
    `;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Tum GCIT Collage ke ek smart, friendly aur professional AI assistant ho. Tumhara naam 'GCIT AI' hai. 
          Tumhe Hinglish (Hindi + English mix) me baat karni hai bilkul ek dost ki tarah.
          Tumhare paas school ka pura data hai (Total students, sabhi students ki list, aaj ki attendance).
          Jab koi kuch bhi poochhe, toh niche diye gaye data me se dhoondh kar sahi jawab do.
          Data me jo nahi hai, uske baare me guess mat karo, balki politely bata do ki "Ye data mere paas available nahi hai".
          
          --- DATABASE CONTEXT ---
          ${dbContext}
          ------------------------`
        },
        {
          role: "user",
          content: question
        }
      ],
      model: "openai/gpt-oss-20b",
      temperature: 0.3,
      max_tokens: 300,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "Bhai, mujhe samajh nahi aaya. Dobara poocho.";

    res.status(200).json({ success: true, answer: aiResponse });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ success: false, message: 'AI se baat nahi ho pa rahi hai.' });
  }
};

// 🎙️ @desc    Edge TTS Voice Generator (Microsoft Natural Voice)
const generateVoice = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

    // Microsoft Edge ki Natural Female Voice (Swara - Hindi)
    const tts = new EdgeTTS(text, "hi-IN-SwaraNeural", {
      rate: "-5%", 
      pitch: "+2Hz"
    });

    // ✅ SAHI TARIKA: result.audio ko arrayBuffer mein convert karo
    const result = await tts.synthesize();
    const audioBuffer = Buffer.from(await result.audio.arrayBuffer());
    
    // Frontend ko MP3 file bhej do
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.byteLength
    });
    res.send(audioBuffer);

  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ success: false, message: 'Voice generate nahi ho payi.' });
  }
};

module.exports = { 
  markAttendance, 
  getTodayAttendanceCount, 
  getDashboardStats, 
  getClassWiseStats, 
  markAbsentees, 
  getLowAttendanceStudents, 
  askAI,
  generateVoice // 👈 Export kiya
};