// Organization-specific routes for multi-tenant system
import { Router } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { insertOrganizationSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Organization registration schema
const organizationRegistrationSchema = z.object({
  organization: insertOrganizationSchema,
  admin: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Valid email is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
});

// Register new organization with admin user
router.post('/register', async (req, res) => {
  try {
    const validation = organizationRegistrationSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.issues
      });
    }

    const { organization, admin } = validation.data;

    // Check if organization email already exists
    const existingOrg = await storage.getOrganizationByEmail(organization.contactEmail);
    if (existingOrg) {
      return res.status(409).json({
        error: 'An organization with this email already exists'
      });
    }

    // Check if admin username already exists
    const existingUser = await storage.getUserByUsername(admin.username);
    if (existingUser) {
      return res.status(409).json({
        error: 'Username already taken'
      });
    }

    // Check if admin email already exists
    const existingUserByEmail = await storage.getUserByEmail(admin.email);
    if (existingUserByEmail) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    // Create organization (pending approval)
    const newOrganization = await storage.createOrganization({
      ...organization,
      status: 'pending'
    });

    // Hash admin password
    const hashedPassword = await bcrypt.hash(admin.password, 10);

    // Create admin user for the organization
    await storage.createUser({
      organizationId: newOrganization.id,
      username: admin.username,
      email: admin.email,
      password: hashedPassword,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: 'admin',
      status: 'active'
    });

    res.status(201).json({
      message: 'Organization registered successfully. Awaiting approval.',
      organizationId: newOrganization.id,
      status: 'pending'
    });
  } catch (error) {
    console.error('Organization registration error:', error);
    res.status(500).json({
      error: 'Internal server error during registration'
    });
  }
});

// Get organization status (for checking approval)
router.get('/status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const organization = await storage.getOrganizationByEmail(email);
    if (!organization) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }

    res.json({
      status: organization.status,
      approvedAt: organization.approvedAt,
      rejectionReason: organization.rejectionReason
    });
  } catch (error) {
    console.error('Organization status check error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;