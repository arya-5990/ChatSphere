import axios from 'axios';

// Email service configuration
const EMAIL_SERVICE_CONFIG = {
  // Backend API endpoint for email sending
  baseURL: 'http://localhost:3001/api',
  timeout: 10000
};

export interface EmailService {
  sendOTPEmail(toEmail: string, otp: string): Promise<{ success: boolean; error?: string }>;
}

class EmailServiceImpl implements EmailService {
  async sendOTPEmail(toEmail: string, otp: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Make API call to backend email server
      const response = await axios.post(`${EMAIL_SERVICE_CONFIG.baseURL}/send-otp`, {
        to: toEmail,
        otp: otp
      }, {
        timeout: EMAIL_SERVICE_CONFIG.timeout
      });
      
      if (response.status === 200 && response.data.success) {
        console.log(`✅ Email sent successfully to: ${toEmail}`);
        return {
          success: true
        };
      } else {
        console.error('❌ Email API returned error:', response.data);
        return {
          success: false,
          error: response.data.error || 'Failed to send email'
        };
      }
    } catch (error) {
      console.error('❌ Email sending error:', error);
      
      // If backend is not available, fall back to simulation for testing
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.log(`📧 Backend not available, simulating email to: ${toEmail}`);
        console.log(`📧 OTP: ${otp}`);
        console.log(`📧 From: aryasha4906c@gmail.com`);
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
          success: true
        };
      }
      
      return {
        success: false,
        error: 'Failed to send email'
      };
    }
  }
}

export const emailService = new EmailServiceImpl(); 