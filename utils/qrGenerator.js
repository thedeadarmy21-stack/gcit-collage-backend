const QRCode = require('qrcode');

// Unique QR ID generate karo (jaise: STU-2026-10-A-XXXX)
const generateQRId = (rollNumber, className, section) => {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const year = new Date().getFullYear();
  
  // Roll number me se sirf letters/numbers rakho
  const cleanRoll = rollNumber.replace(/[^A-Za-z0-9]/g, '');
  
  return `STU-${year}-${className}-${section}-${cleanRoll}-${random}`;
};

// QR ID ko Image (Data URL) me convert karo
const generateQRImage = async (qrId) => {
  try {
    const dataUrl = await QRCode.toDataURL(qrId, {
      errorCorrectionLevel: 'H', // High security
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 300,
    });
    return dataUrl;
  } catch (err) {
    console.error('QR Generate Error:', err);
    return null;
  }
};

module.exports = { generateQRId, generateQRImage };