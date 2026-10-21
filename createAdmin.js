const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const dns = require('dns'); // 👈 DNS import kiya
const Teacher = require('./models/Teacher');

// 🔥 DNS Fix for Windows: Force Google DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const createAdmin = async () => {
  try {
    // 1. Live Database se connect karo
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to Live MongoDB Database...');

    // 2. Check karo agar pehle se koi account hai
    const existing = await Teacher.findOne({ username: 'alpha' });
    
    if (existing) {
      console.log('⚠️ Alpha account pehle se bana hua hai. Password update kar rahe hain...');
      existing.password = 'sarkar';
      await existing.save(); // Password hash karke save karega
      console.log('✅ Password successfully updated to: sarkar');
    } else {
      // 3. Naya account banao
      await Teacher.create({
        name: 'Sir Principal',
        username: 'alpha',
        password: 'sarkar',
        schoolName: 'GCIT COLLAGE'
      });
      console.log('🎉 Naya Admin Account Created Successfully!');
    }

    console.log('-----------------------------------------');
    console.log('Username: alpha');
    console.log('Password: sarkar');
    console.log('-----------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();backend/config/db.js