import type { Express, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { mongoStorage } from "../mongodb-storage";
import { verificationService } from "../services/verification-service";

const verifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

export function registerVerificationRoutes(app: Express) {
  // Verify email endpoint
  app.post("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { email, token } = verifyEmailSchema.parse(req.body);

      // Verify the token
      const isValidToken = await verificationService.verifyToken(email, token, 'email_verification');
      
      if (!isValidToken) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid or expired verification token" 
        });
      }

      // Update user's email verification status
      const user = await mongoStorage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      await mongoStorage.updateUser(user._id!.toString(), { 
        emailVerified: true
      });

      // Update organization status if this is an admin user
      if (user.role === 'admin' && user.organizationId) {
        const organization = await mongoStorage.getOrganization(user.organizationId.toString());
        if (organization && organization.status === 'pending') {
          await mongoStorage.updateOrganizationStatus(organization._id!.toString(), 'pending_approval');
        }
      }

      res.json({ 
        success: true,
        message: "Email verified successfully" 
      });

    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });

  // Resend verification email
  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);

      const user = await mongoStorage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({ 
          success: false,
          message: "Email is already verified" 
        });
      }

      // Create new verification token
      const verificationToken = await verificationService.createVerificationToken(email, 'email_verification');
      
      // Get organization name for the email
      let organizationName = "Your Organization";
      if (user.organizationId) {
        const organization = await mongoStorage.getOrganization(user.organizationId.toString());
        if (organization) {
          organizationName = organization.name;
        }
      }

      // Send verification email
      const verificationUrl = `${process.env.APP_DOMAIN}/verify-email?email=${encodeURIComponent(email)}&token=${verificationToken.token}`;
      
      const emailSent = await verificationService.sendEmailVerification(
        email,
        organizationName,
        verificationUrl
      );

      if (!emailSent) {
        return res.status(500).json({ 
          success: false,
          message: "Failed to send verification email" 
        });
      }

      res.json({ 
        success: true,
        message: "Verification email sent successfully" 
      });

    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });

  // Forgot password endpoint
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);

      const user = await mongoStorage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists for security
        return res.json({ 
          success: true,
          message: "If the email exists, a password reset link has been sent" 
        });
      }

      // Create password reset token
      const resetToken = await verificationService.createVerificationToken(email, 'password_reset');
      
      // Send password reset email
      const resetUrl = `${process.env.APP_DOMAIN}/reset-password?email=${encodeURIComponent(email)}&token=${resetToken.token}`;
      
      const emailSent = await verificationService.sendPasswordResetEmail(
        email,
        resetUrl,
        user.username
      );

      if (!emailSent) {
        console.error('Failed to send password reset email to:', email);
      }

      res.json({ 
        success: true,
        message: "If the email exists, a password reset link has been sent" 
      });

    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });

  // Reset password endpoint
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { email, token, newPassword } = resetPasswordSchema.parse(req.body);

      // Verify the reset token
      const isValidToken = await verificationService.verifyToken(email, token, 'password_reset');
      
      if (!isValidToken) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid or expired reset token" 
        });
      }

      // Get user and update password
      const user = await mongoStorage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await mongoStorage.updateUser(user._id!.toString(), { 
        password: hashedPassword
      });

      res.json({ 
        success: true,
        message: "Password reset successfully" 
      });

    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });

  // Verify reset token (check if token is valid)
  app.post("/api/auth/verify-reset-token", async (req: Request, res: Response) => {
    try {
      const { email, token } = verifyEmailSchema.parse(req.body);

      const verificationToken = await mongoStorage.getVerificationToken(email, token, 'password_reset');
      
      if (!verificationToken) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid or expired reset token" 
        });
      }

      res.json({ 
        success: true,
        message: "Token is valid" 
      });

    } catch (error) {
      console.error("Verify reset token error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });
}