// Organization-specific routes for multi-tenant system
import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { z } from "zod";

const router = Router();

// Organization registration schema
const organizationRegistrationSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().min(1, "Contact phone is required"),
  adminUsername: z.string().min(3, "Username must be at least 3 characters"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
  adminFirstName: z.string().min(1, "First name is required"),
  adminLastName: z.string().min(1, "Last name is required"),
});

// Register new organization with admin user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validation = organizationRegistrationSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.issues
      });
    }

    const data = validation.data;

    // Check if admin username already exists
    const existingUser = await storage.getUserByUsername(data.adminUsername);
    if (existingUser) {
      return res.status(409).json({
        error: 'Username already taken'
      });
    }

    // Hash admin password
    const hashedPassword = await hashPassword(data.adminPassword);

    // Create admin user (simplified approach for migration)
    await storage.createUser({
      username: data.adminUsername,
      email: data.contactEmail,
      password: hashedPassword,
      firstName: data.adminFirstName,
      lastName: data.adminLastName,
      role: 'admin',
      status: 'pending_approval'
    });

    res.status(201).json({
      message: 'Organization registered successfully. Awaiting approval.',
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