import { Request, Response, Express } from 'express';
import { z } from 'zod';
import { otpService } from '../services/otp-service.js';
import { mongoStorage } from '../mongodb-storage.js';

const sendOTPSchema = z.object({
  email: z.string().email('Valid email is required'),
  organizationName: z.string().optional()
});

const verifyOTPSchema = z.object({
  email: z.string().email('Valid email is required'),
  code: z.string().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits')
});

export function registerOTPRoutes(app: Express) {
  // Send OTP for email verification
  app.post("/api/otp/send", async (req: Request, res: Response) => {
    try {
      const { email, organizationName } = sendOTPSchema.parse(req.body);

      console.log(`OTP requested for email: ${email}${organizationName ? ` (Organization: ${organizationName})` : ''}`);

      // Check if organization with this email already exists
      const existingOrg = await mongoStorage.getOrganizationByEmail(email);
      if (existingOrg) {
        return res.status(400).json({
          success: false,
          message: "An organization with this email already exists. Please use a different email or contact support if this is your organization."
        });
      }

      const result = await otpService.sendOTP(email, organizationName);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
          errors: error.errors
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to send verification code. Please try again."
      });
    }
  });

  // Verify OTP
  app.post("/api/otp/verify", async (req: Request, res: Response) => {
    try {
      const { email, code } = verifyOTPSchema.parse(req.body);

      console.log(`OTP verification attempt for email: ${email}`);

      const result = await otpService.verifyOTP(email, code);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          verified: true
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          verified: false
        });
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid input format",
          errors: error.errors
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to verify code. Please try again."
      });
    }
  });

  // Check OTP status (optional - for checking remaining time)
  app.get("/api/otp/status/:email", async (req: Request, res: Response) => {
    try {
      const email = req.params.email;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({
          success: false,
          message: "Valid email is required"
        });
      }

      const hasValidOTP = otpService.hasValidOTP(email);
      const remainingTime = otpService.getRemainingTime(email);

      res.status(200).json({
        success: true,
        hasValidOTP,
        remainingTime: remainingTime > 0 ? remainingTime : 0
      });
    } catch (error) {
      console.error("Error checking OTP status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check verification status"
      });
    }
  });
}