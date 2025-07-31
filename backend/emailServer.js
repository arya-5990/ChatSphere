const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Email configuration
const emailConfig = {
  service: 'gmail',
  auth: {
    user: 'aryasha4906c@gmail.com',
    pass: 'zlfn ncoh zjjj pkxt' // App password from Google
  }
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Email template
const createEmailTemplate = (otp) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">ChatSphere</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Password Reset Verification</p>
    </div>
    
    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
      <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Verification Code</h2>
      
      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        You have requested to reset your password for your ChatSphere account. 
        Please use the verification code below to complete the process.
      </p>
      
      <div style="background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 4px;">${otp}</span>
      </div>
      
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        <strong>Important:</strong>
      </p>
      <ul style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; padding-left: 20px;">
        <li>This code will expire in 10 minutes</li>
        <li>If you didn't request this password reset, please ignore this email</li>
        <li>Never share this code with anyone</li>
      </ul>
      
      <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This email was sent from ChatSphere. If you have any questions, please contact our support team.
        </p>
      </div>
    </div>
  </div>
`;

// Routes
app.post('/api/send-otp', async (req, res) => {
  try {
    const { to, otp } = req.body;

    if (!to || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required'
      });
    }

    const mailOptions = {
      from: 'aryasha4906c@gmail.com',
      to: to,
      subject: 'ChatSphere - Password Reset Verification Code',
      html: createEmailTemplate(otp)
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully to: ${to}`);
    console.log(`📧 OTP: ${otp}`);

    res.json({
      success: true,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('❌ Email sending error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Email server is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Email server running on port ${PORT}`);
  console.log(`📧 Using Gmail: aryasha4906c@gmail.com`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📤 Send OTP: POST http://localhost:${PORT}/api/send-otp`);
});

module.exports = app; 