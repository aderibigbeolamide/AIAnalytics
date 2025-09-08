import crypto from 'crypto';
import { mongoStorage } from '../mongodb-storage';
import { emailService } from './email-service';

export interface VerificationToken {
  _id?: string;
  email: string;
  token: string;
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

class VerificationService {
  // Generate a secure random token
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create verification token in database
  async createVerificationToken(email: string, type: 'email_verification' | 'password_reset'): Promise<VerificationToken> {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    // Remove any existing tokens for this email and type
    await mongoStorage.deleteVerificationTokens(email, type);

    const verificationToken: VerificationToken = {
      email,
      token,
      type,
      expiresAt,
      used: false,
      createdAt: new Date()
    };

    const createdToken = await mongoStorage.createVerificationToken(verificationToken);
    return createdToken as any;
  }

  // Verify token and mark as used
  async verifyToken(email: string, token: string, type: 'email_verification' | 'password_reset'): Promise<boolean> {
    const verificationToken = await mongoStorage.getVerificationToken(email, token, type);
    
    if (!verificationToken) {
      return false;
    }

    // Check if token is expired
    if (new Date() > verificationToken.expiresAt) {
      return false;
    }

    // Check if token is already used
    if (verificationToken.used) {
      return false;
    }

    // Mark token as used
    await mongoStorage.markVerificationTokenUsed(verificationToken._id!.toString());
    return true;
  }

  // Send email verification
  async sendEmailVerification(email: string, organizationName: string, verificationUrl: string): Promise<boolean> {
    const subject = 'Verify Your Email - EventValidate Organization Registration';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; margin-top: 20px; border-radius: 8px; }
            .security-info { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Verify Your Email Address</h1>
            </div>
            <div class="content">
              <h2>Welcome to EventValidate!</h2>
              <p>Thank you for registering <strong>${organizationName}</strong> with EventValidate.</p>
              
              <p>To complete your registration and activate your organization account, please verify your email address by clicking the button below:</p>

              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>

              <p>Or copy and paste this link into your browser:</p>
              <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px;">
                ${verificationUrl}
              </p>

              <div class="security-info">
                <h4>🛡️ Security Information</h4>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>This verification link expires in 24 hours</li>
                  <li>If you didn't register for EventValidate, please ignore this email</li>
                  <li>Once verified, your organization will be pending approval by our team</li>
                  <li>You'll receive a confirmation email once approved</li>
                </ul>
              </div>

              <p><strong>What happens next?</strong></p>
              <ol>
                <li>Click the verification link above</li>
                <li>Your email will be verified</li>
                <li>Our team will review your organization</li>
                <li>You'll receive approval notification via email</li>
                <li>Start creating amazing events!</li>
              </ol>

              <p>Questions? Contact our support team at admin@eventifyai.com</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 EventValidate. All rights reserved.</p>
              <p>This is an automated message for email verification</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await emailService.sendEmail({
      to: email,
      subject,
      html
    });
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string, resetUrl: string, username: string): Promise<boolean> {
    const subject = 'Reset Your Password - EventValidate';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #EF4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; margin-top: 20px; border-radius: 8px; }
            .security-info { background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔑 Reset Your Password</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hello <strong>${username}</strong>,</p>
              
              <p>We received a request to reset your password for your EventValidate account.</p>
              
              <p>If you requested this password reset, click the button below to set a new password:</p>

              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>

              <p>Or copy and paste this link into your browser:</p>
              <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px;">
                ${resetUrl}
              </p>

              <div class="security-info">
                <h4>🛡️ Security Information</h4>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>This password reset link expires in 24 hours</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password won't change until you click the link and set a new one</li>
                  <li>Contact support if you think someone else requested this</li>
                </ul>
              </div>

              <p><strong>Didn't request this?</strong></p>
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>

              <p>Questions or concerns? Contact our support team at admin@eventifyai.com</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 EventValidate. All rights reserved.</p>
              <p>This is an automated message for password reset</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await emailService.sendEmail({
      to: email,
      subject,
      html
    });
  }

  // Clean up expired tokens (run periodically)
  async cleanupExpiredTokens(): Promise<void> {
    await mongoStorage.deleteExpiredVerificationTokens();
  }
}

// Export singleton instance
export const verificationService = new VerificationService();