// OTP Array - You can replace these with your actual OTPs
const OTP_ARRAY = [
  '123456', '234567', '345678', '456789', '567890',
  '678901', '789012', '890123', '901234', '012345',
  '111111', '222222', '333333', '444444', '555555',
  '666666', '777777', '888888', '999999', '000000',
  '121212', '232323', '343434', '454545', '565656',
  '676767', '787878', '898989', '909090', '010101',
  '123123', '234234', '345345', '456456', '567567',
  '678678', '789789', '890890', '901901', '012012',
  '111222', '222333', '333444', '444555', '555666',
  '666777', '777888', '888999', '999000', '000111',
  '112233', '223344', '334455', '445566', '556677',
  '667788', '778899', '889900', '990011', '001122',
  '121314', '232425', '343536', '454647', '565758',
  '676869', '787980', '898901', '909012', '010123',
  '123321', '234432', '345543', '456654', '567765',
  '678876', '789987', '890098', '901109', '012210',
  '111333', '222444', '333555', '444666', '555777',
  '666888', '777999', '888000', '999111', '000222',
  '112244', '223355', '334466', '445577', '556688',
  '667799', '778800', '889911', '990022', '001133',
  '121515', '232626', '343737', '454848', '565959',
  '676060', '787171', '898282', '909393', '010404',
  '123654', '234765', '345876', '456987', '567098',
  '678109', '789210', '890321', '901432', '012543',
  '111444', '222555', '333666', '444777', '555888',
  '666999', '777000', '888111', '999222', '000333',
  '112255', '223366', '334477', '445588', '556699',
  '667700', '778811', '889922', '990033', '001144',
  '121616', '232727', '343838', '454949', '565050',
  '676161', '787272', '898383', '909494', '010505'
];

import { emailService } from './emailService';

// Store for email-OTP mappings (in production, this should be in a database)
const emailOTPMap = new Map<string, { otp: string; timestamp: number }>();

export interface OTPService {
  generateOTP(): string;
  sendOTP(email: string): Promise<{ success: boolean; otp?: string; error?: string }>;
  verifyOTP(email: string, otp: string): Promise<{ success: boolean; error?: string }>;
  resendOTP(email: string): Promise<{ success: boolean; otp?: string; error?: string }>;
}

class OTPServiceImpl implements OTPService {
  generateOTP(): string {
    // Generate a random number between 1-100
    const randomIndex = Math.floor(Math.random() * 100);
    // Get the OTP at that index from the array
    return OTP_ARRAY[randomIndex];
  }

  async sendOTP(email: string): Promise<{ success: boolean; otp?: string; error?: string }> {
    try {
      // Generate OTP
      const otp = this.generateOTP();
      
      // Store OTP with timestamp (valid for 10 minutes)
      emailOTPMap.set(email, {
        otp,
        timestamp: Date.now()
      });

      // Send OTP via email
      const emailResult = await emailService.sendOTPEmail(email, otp);
      
      if (emailResult.success) {
        console.log(`OTP sent to ${email}: ${otp}`);
        return {
          success: true,
          otp // Keep for testing purposes - remove in production
        };
      } else {
        // Remove the stored OTP if email failed
        emailOTPMap.delete(email);
        return {
          success: false,
          error: emailResult.error || 'Failed to send OTP email'
        };
      }
    } catch (error) {
      // Remove the stored OTP if there was an error
      emailOTPMap.delete(email);
      return {
        success: false,
        error: 'Failed to send OTP'
      };
    }
  }

  async verifyOTP(email: string, otp: string): Promise<{ success: boolean; error?: string }> {
    try {
      const storedData = emailOTPMap.get(email);
      
      if (!storedData) {
        return {
          success: false,
          error: 'No OTP found for this email'
        };
      }

      // Check if OTP is expired (10 minutes)
      const now = Date.now();
      const otpAge = now - storedData.timestamp;
      const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds

      if (otpAge > tenMinutes) {
        emailOTPMap.delete(email);
        return {
          success: false,
          error: 'OTP has expired. Please request a new one.'
        };
      }

      // Check if OTP matches
      if (storedData.otp !== otp) {
        return {
          success: false,
          error: 'Invalid OTP'
        };
      }

      // OTP is valid - remove it from storage
      emailOTPMap.delete(email);

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to verify OTP'
      };
    }
  }

  async resendOTP(email: string): Promise<{ success: boolean; otp?: string; error?: string }> {
    try {
      // Remove any existing OTP for this email
      emailOTPMap.delete(email);
      
      // Generate and send new OTP
      return await this.sendOTP(email);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to resend OTP'
      };
    }
  }
}

export const otpService = new OTPServiceImpl(); 