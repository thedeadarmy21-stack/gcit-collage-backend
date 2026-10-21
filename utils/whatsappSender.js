// 📧 Email/SMS system abhi DISABLED hai
// Baad me enable karenge (jab Resend + TextBee keys milenge)

const sendWhatsAppMessage = async (fatherEmail, fatherWhatsApp, message) => {
  console.log('📧 [EMAIL DISABLED] Would send to:', fatherEmail);
  console.log('📱 [SMS DISABLED] Would send to:', fatherWhatsApp);
  console.log('💬 Message:', message);
  return { success: true, disabled: true };
};

module.exports = { sendWhatsAppMessage };