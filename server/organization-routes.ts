import { Router } from "express";
import { authenticateToken, isSuperAdmin, isAdmin, AuthenticatedRequest } from "./auth";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { z } from "zod";

const router = Router();

// Organization registration schema
const organizationRegistrationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  description: z.string().optional(),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  adminUsername: z.string().min(3, "Username must be at least 3 characters"),
  adminEmail: z.string().email("Valid admin email is required"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
  adminFirstName: z.string().min(1, "First name is required"),
  adminLastName: z.string().min(1, "Last name is required"),
});

// Organization update schema
const organizationUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  subscriptionPlan: z.enum(["basic", "premium", "enterprise"]).optional(),
  maxEvents: z.number().min(1).optional(),
  maxMembers: z.number().min(1).optional(),
});

// Public route for organization registration
router.post("/register", async (req, res) => {
  try {
    const data = organizationRegistrationSchema.parse(req.body);
    
    // Check if organization email already exists
    const existingOrg = await storage.findOrganizationByEmail(data.contactEmail);
    if (existingOrg) {
      return res.status(400).json({ message: "Organization with this email already exists" });
    }

    // Check if admin username or email already exists
    const existingUser = await storage.findUserByUsernameOrEmail(data.adminUsername, data.adminEmail);
    if (existingUser) {
      return res.status(400).json({ message: "Admin username or email already exists" });
    }

    // Create organization
    const organization = await storage.createOrganization({
      name: data.name,
      description: data.description,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      address: data.address,
      website: data.website,
      status: "pending",
    });

    // Create admin user
    const hashedPassword = await hashPassword(data.adminPassword);
    const adminUser = await storage.createUser({
      organizationId: organization.id,
      username: data.adminUsername,
      email: data.adminEmail,
      password: hashedPassword,
      firstName: data.adminFirstName,
      lastName: data.adminLastName,
      role: "admin",
      status: "active",
      emailVerified: false,
    });

    // Log activity
    await storage.logOrganizationActivity({
      organizationId: organization.id,
      userId: adminUser.id,
      action: "organization_registered",
      details: { organizationName: data.name },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(201).json({
      message: "Organization registered successfully. Awaiting approval from super admin.",
      organization: {
        id: organization.id,
        name: organization.name,
        status: organization.status,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Organization registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Super admin routes
router.use("/super-admin", authenticateToken, isSuperAdmin);

// Get all organizations (super admin only)
router.get("/super-admin/organizations", async (req, res) => {
  try {
    const organizations = await storage.getAllOrganizations();
    res.json(organizations);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get organization details (super admin only)
router.get("/super-admin/organizations/:id", async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const organization = await storage.getOrganizationById(organizationId);
    
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const stats = await storage.getOrganizationStats(organizationId);
    
    res.json({
      ...organization,
      stats,
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Approve organization (super admin only)
router.put("/super-admin/organizations/:id/approve", async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const organization = await storage.getOrganizationById(organizationId);
    
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    if (organization.status !== "pending") {
      return res.status(400).json({ message: "Organization is not pending approval" });
    }

    await storage.updateOrganization(organizationId, {
      status: "approved",
      approvedBy: req.user!.id,
      approvedAt: new Date().toISOString(),
    });

    // Log activity
    await storage.logOrganizationActivity({
      organizationId,
      userId: req.user!.id,
      action: "organization_approved",
      details: { organizationName: organization.name },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json({ message: "Organization approved successfully" });
  } catch (error) {
    console.error("Error approving organization:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Reject organization (super admin only)
router.put("/super-admin/organizations/:id/reject", async (req: AuthenticatedRequest, res) => {
  try {
    const { reason } = req.body;
    const organizationId = parseInt(req.params.id);
    const organization = await storage.getOrganizationById(organizationId);
    
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    if (organization.status !== "pending") {
      return res.status(400).json({ message: "Organization is not pending approval" });
    }

    await storage.updateOrganization(organizationId, {
      status: "rejected",
      rejectionReason: reason,
      approvedBy: req.user!.id,
      approvedAt: new Date().toISOString(),
    });

    // Log activity
    await storage.logOrganizationActivity({
      organizationId,
      userId: req.user!.id,
      action: "organization_rejected",
      details: { organizationName: organization.name, reason },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json({ message: "Organization rejected successfully" });
  } catch (error) {
    console.error("Error rejecting organization:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Suspend organization (super admin only)
router.put("/super-admin/organizations/:id/suspend", async (req: AuthenticatedRequest, res) => {
  try {
    const { reason } = req.body;
    const organizationId = parseInt(req.params.id);
    
    await storage.updateOrganization(organizationId, {
      subscriptionStatus: "suspended",
    });

    // Log activity
    await storage.logOrganizationActivity({
      organizationId,
      userId: req.user!.id,
      action: "organization_suspended",
      details: { reason },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json({ message: "Organization suspended successfully" });
  } catch (error) {
    console.error("Error suspending organization:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get platform statistics (super admin only)
router.get("/super-admin/statistics", async (req, res) => {
  try {
    const stats = await storage.getPlatformStatistics();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching platform statistics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get organization activity log (super admin only)
router.get("/super-admin/organizations/:id/activity", async (req, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const activity = await storage.getOrganizationActivity(organizationId, page, limit);
    res.json(activity);
  } catch (error) {
    console.error("Error fetching organization activity:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Organization admin routes
router.use(authenticateToken, requireOrganizationAccess);

// Get current organization details
router.get("/current", async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({ message: "No organization access" });
    }

    const organization = await storage.getOrganizationById(req.user.organizationId);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const stats = await storage.getOrganizationStats(req.user.organizationId);
    
    res.json({
      ...organization,
      stats,
    });
  } catch (error) {
    console.error("Error fetching current organization:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update organization settings (admin only)
router.put("/settings", authenticateToken, isAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({ message: "No organization access" });
    }

    const data = organizationUpdateSchema.parse(req.body);
    
    await storage.updateOrganization(req.user.organizationId, data);

    // Log activity
    await storage.logOrganizationActivity({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action: "organization_settings_updated",
      details: data,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json({ message: "Organization settings updated successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating organization:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;