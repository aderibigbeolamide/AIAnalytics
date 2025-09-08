import { emailService } from './email-service.js';

export interface OTPData {
  email: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  organizationName?: string;
}

class OTPService {
  private otpStore = new Map<string, OTPData>();
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;

  constructor() {
    // Clean up expired OTPs every 5 minutes
    setInterval(() => {
      this.cleanupExpiredOTPs();
    }, 5 * 60 * 1000);
  }

  // Generate a 6-digit OTP
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP to email
  async sendOTP(email: string, organizationName?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if there's already a recent OTP for this email
      const existingOTP = this.otpStore.get(email);
      if (existingOTP && new Date() < existingOTP.expiresAt) {
        const remainingTime = Math.ceil((existingOTP.expiresAt.getTime() - new Date().getTime()) / 1000 / 60);
        return {
          success: false,
          message: `Please wait ${remainingTime} minutes before requesting a new code`
        };
      }

      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Store OTP
      this.otpStore.set(email, {
        email,
        code: otp,
        expiresAt,
        attempts: 0,
        organizationName
      });

      // Send email
      const emailSent = await emailService.sendOTPVerificationEmail(email, otp, organizationName);

      if (emailSent) {
        console.log(`OTP sent successfully to ${email}`);
        return {
          success: true,
          message: 'Verification code sent to your email'
        };
      } else {
        // Remove from store if email failed
        this.otpStore.delete(email);
        return {
          success: false,
          message: 'Failed to send verification email. Please try again.'
        };
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      return {
        success: false,
        message: 'Failed to send verification code. Please try again.'
      };
    }
  }

  // Verify OTP
  async verifyOTP(email: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      const otpData = this.otpStore.get(email);

      if (!otpData) {
        return {
          success: false,
          message: 'No verification code found. Please request a new one.'
        };
      }

      // Check if expired
      if (new Date() > otpData.expiresAt) {
        this.otpStore.delete(email);
        return {
          success: false,
          message: 'Verification code has expired. Please request a new one.'
        };
      }

      // Check attempts
      if (otpData.attempts >= this.MAX_ATTEMPTS) {
        this.otpStore.delete(email);
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new verification code.'
        };
      }

      // Increment attempts
      otpData.attempts++;

      // Verify code
      if (otpData.code === code) {
        // Success - remove from store
        this.otpStore.delete(email);
        console.log(`OTP verified successfully for ${email}`);
        return {
          success: true,
          message: 'Email verified successfully!'
        };
      } else {
        // Update attempts in store
        this.otpStore.set(email, otpData);
        const remainingAttempts = this.MAX_ATTEMPTS - otpData.attempts;
        return {
          success: false,
          message: `Invalid verification code. ${remainingAttempts} attempts remaining.`
        };
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        message: 'Failed to verify code. Please try again.'
      };
    }
  }

  // Check if email has a valid pending OTP
  hasValidOTP(email: string): boolean {
    const otpData = this.otpStore.get(email);
    return otpData ? new Date() < otpData.expiresAt : false;
  }

  // Clean up expired OTPs
  private cleanupExpiredOTPs(): void {
    const now = new Date();
    for (const [email, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(email);
      }
    }
  }

  // Get remaining time for OTP (in seconds)
  getRemainingTime(email: string): number {
    const otpData = this.otpStore.get(email);
    if (!otpData) return 0;
    
    const remaining = Math.max(0, Math.floor((otpData.expiresAt.getTime() - new Date().getTime()) / 1000));
    return remaining;
  }
}

export const otpService = new OTPService();