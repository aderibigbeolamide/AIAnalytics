import type { Express, Request, Response } from "express";
import { authenticateToken, type AuthenticatedRequest } from "./auth-routes";
import { notificationService } from "../services/notification-service";
import { emailService } from "../services/email-service";
import { verificationService } from "../services/verification-service";
import { mongoStorage } from "../mongodb-storage";
import bcrypt from "bcrypt";
import { z } from "zod";

const organizationRegisterSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  email: z.string().email("Valid email is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  address: z.string().optional(),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  adminUsername: z.string().min(3, "Username must be at least 3 characters"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
  adminFirstName: z.string().min(1, "First name is required"),
  adminLastName: z.string().min(1, "Last name is required"),
});

const organizationApprovalSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reason: z.string().optional(),
});

export function registerOrganizationRoutes(app: Express) {
  // Register new organization
  app.post("/api/organizations/register", async (req: Request, res: Response) => {
    try {
      const orgData = organizationRegisterSchema.parse(req.body);
      
      // Check if organization email already exists
      const existingOrg = await mongoStorage.getOrganizationByEmail(orgData.email);
      if (existingOrg) {
        return res.status(400).json({ message: "Organization with this email already exists" });
      }

      // Check if admin username already exists
      const existingUser = await mongoStorage.getUserByUsername(orgData.adminUsername);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create organization
      const organization = await mongoStorage.createOrganization({
        name: orgData.name,
        email: orgData.email,
        contactPerson: orgData.contactPerson,
        phoneNumber: orgData.phoneNumber,
        address: orgData.address,
        description: orgData.description,
        website: orgData.website,
        status: 'pending', // Requires approval
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Hash admin password
      const hashedPassword = await bcrypt.hash(orgData.adminPassword, 10);

      // Create admin user for the organization
      const adminUser = await mongoStorage.createUser({
        username: orgData.adminUsername,
        email: orgData.email,
        password: hashedPassword,
        firstName: orgData.adminFirstName,
        lastName: orgData.adminLastName,
        role: 'admin',
        organizationId: organization._id?.toString(),
        status: 'pending_verification', // Will be activated when email is verified
        twoFactorEnabled: false,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create email verification token
      const verificationToken = await verificationService.createVerificationToken(orgData.email, 'email_verification');
      
      // Send verification email
      const verificationUrl = `${process.env.APP_DOMAIN}/verify-email?email=${encodeURIComponent(orgData.email)}&token=${verificationToken.token}`;
      
      const emailSent = await verificationService.sendEmailVerification(
        orgData.email,
        orgData.name,
        verificationUrl
      );

      if (!emailSent) {
        console.error('Failed to send verification email during organization registration');
      }

      res.status(201).json({
        message: "Organization registration submitted successfully. Please check your email to verify your account before approval.",
        organizationId: organization._id?.toString(),
        requiresEmailVerification: true
      });

      // Notify super admin about new organization registration
      // This would typically be sent to super admin email
      console.log(`📋 New organization registration: ${orgData.name} by ${orgData.contactPerson}`);

    } catch (error: any) {
      console.error("Error registering organization:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Approve/reject organization (Super admin only)
  app.patch("/api/organizations/:id/approval", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }

      const { status, reason } = organizationApprovalSchema.parse(req.body);
      const organizationId = req.params.id;

      // Get organization
      const organization = await mongoStorage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Update organization status
      const updatedOrg = await mongoStorage.updateOrganization(organizationId, {
        status,
        approvedAt: status === 'approved' ? new Date() : undefined,
        rejectedAt: status === 'rejected' ? new Date() : undefined,
        rejectionReason: status === 'rejected' ? reason : undefined,
        updatedAt: new Date()
      });

      // Update associated admin user status
      const adminUser = await mongoStorage.getUserByOrganizationId(organizationId);
      if (adminUser) {
        await mongoStorage.updateUser(adminUser._id?.toString(), {
          status: status === 'approved' ? 'active' : 'rejected',
          emailVerified: status === 'approved' ? true : false,
          updatedAt: new Date()
        });
      }

      // Send notification email to organization
      await notificationService.notifyOrganizationApproval({
        organization: updatedOrg,
        status,
        reason,
        adminUser: req.user
      });

      res.json({
        message: `Organization ${status} successfully`,
        organization: {
          id: updatedOrg._id?.toString(),
          name: updatedOrg.name,
          status: updatedOrg.status
        }
      });

    } catch (error: any) {
      console.error("Error processing organization approval:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get pending organizations (Super admin only)
  app.get("/api/organizations/pending", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }

      const pendingOrgs = await mongoStorage.getOrganizationsByStatus('pending');
      
      const formattedOrgs = pendingOrgs.map(org => ({
        id: org._id?.toString(),
        name: org.name,
        email: org.email,
        contactPerson: org.contactPerson,
        phoneNumber: org.phoneNumber,
        description: org.description,
        website: org.website,
        createdAt: org.createdAt,
        status: org.status
      }));

      res.json(formattedOrgs);

    } catch (error) {
      console.error("Error getting pending organizations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all organizations (Super admin only)
  app.get("/api/organizations", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }

      const organizations = await mongoStorage.getOrganizations();
      
      const formattedOrgs = organizations.map(org => ({
        id: org._id?.toString(),
        name: org.name,
        email: org.email,
        contactPerson: org.contactPerson,
        phoneNumber: org.phoneNumber,
        description: org.description,
        website: org.website,
        status: org.status,
        createdAt: org.createdAt,
        approvedAt: org.approvedAt,
        rejectedAt: org.rejectedAt,
        rejectionReason: org.rejectionReason
      }));

      res.json(formattedOrgs);

    } catch (error) {
      console.error("Error getting organizations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get organization by ID
  app.get("/api/organizations/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const organizationId = req.params.id;

      // Check permissions
      if (req.user.role !== 'super_admin' && req.user.organizationId !== organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const organization = await mongoStorage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      res.json({
        id: organization._id?.toString(),
        name: organization.name,
        email: organization.email,
        contactPerson: organization.contactPerson,
        phoneNumber: organization.phoneNumber,
        description: organization.description,
        website: organization.website,
        status: organization.status,
        createdAt: organization.createdAt,
        approvedAt: organization.approvedAt
      });

    } catch (error) {
      console.error("Error getting organization:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Request upgrade to Pro plan
  app.post("/api/organizations/request-pro-upgrade", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get organization details
      const organization = await mongoStorage.getOrganization(req.user.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check if organization is already on Pro plan
      if (organization.subscriptionPlan === 'pro') {
        return res.status(400).json({ message: "Organization is already on Pro plan" });
      }

      // Send upgrade request email to admin@eventifyai.com
      try {
        const { EmailService } = await import('../services/email-service.js');
        const emailService = new EmailService();
        
        await emailService.sendEmail({
          to: 'admin@eventifyai.com',
          subject: `Pro Plan Upgrade Request - ${organization.name}`,
          html: `
            <h2>Pro Plan Upgrade Request</h2>
            <p>A new organization has requested an upgrade to Pro Plan:</p>
            
            <h3>Organization Details:</h3>
            <ul>
              <li><strong>Organization Name:</strong> ${organization.name}</li>
              <li><strong>Contact Email:</strong> ${organization.contactEmail}</li>
              <li><strong>Contact Phone:</strong> ${organization.contactPhone || 'Not provided'}</li>
              <li><strong>Current Plan:</strong> ${organization.subscriptionPlan}</li>
              <li><strong>Current Events Limit:</strong> ${organization.maxEvents}</li>
              <li><strong>Current Members Limit:</strong> ${organization.maxMembers}</li>
              <li><strong>Organization ID:</strong> ${organization._id}</li>
              <li><strong>Request Date:</strong> ${new Date().toLocaleString()}</li>
            </ul>
            
            <h3>Pro Plan Benefits Requested:</h3>
            <ul>
              <li>Up to 100 events</li>
              <li>Unlimited members/registrations</li>
              <li>Priority support</li>
              <li>Advanced analytics</li>
            </ul>
            
            <p>Please review this request and proceed with the upgrade through the Super Admin dashboard.</p>
            
            <p><a href="${process.env.APP_DOMAIN}/super-admin">Super Admin Dashboard</a></p>
          `
        });
        
        // Also send confirmation email to organization
        await emailService.sendEmail({
          to: organization.contactEmail,
          subject: "Pro Plan Upgrade Request Received",
          html: `
            <h2>Upgrade Request Received</h2>
            <p>Dear ${organization.name} team,</p>
            <p>We have received your request to upgrade to the <strong>Pro Plan</strong>.</p>
            
            <h3>Pro Plan Benefits:</h3>
            <ul>
              <li>✅ Up to 100 events</li>
              <li>✅ Unlimited members/registrations</li>
              <li>✅ Priority support</li>
              <li>✅ Advanced analytics</li>
            </ul>
            
            <p>Our team will review your request and get back to you within 24-48 hours.</p>
            <p>If you have any questions, please contact us at admin@eventifyai.com</p>
            
            <p>Best regards,<br>
            Eventify AI Team</p>
          `
        });
        
      } catch (emailError) {
        console.error('Failed to send upgrade request email:', emailError);
        return res.status(500).json({ message: "Failed to send upgrade request. Please try again." });
      }

      res.json({ 
        message: "Pro plan upgrade request sent successfully. We will contact you within 24-48 hours.",
        organization: {
          id: (organization._id as any).toString(),
          name: organization.name,
          currentPlan: organization.subscriptionPlan
        }
      });
    } catch (error) {
      console.error("Error requesting pro upgrade:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}