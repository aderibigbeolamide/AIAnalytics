import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { mongoStorage } from "../mongodb-storage";
import { notificationService } from "../services/notification-service";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const usernameUpdateSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username must be less than 50 characters"),
  currentPassword: z.string().min(1, "Current password is required"),
});

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    organizationId?: string;
    firstName?: string;
    lastName?: string;
  };
}

export function generateToken(payload: { 
  id: string; 
  username: string; 
  email: string;
  role: string; 
  organizationId?: string;
  firstName?: string;
  lastName?: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { 
  id: string; 
  username: string; 
  email: string;
  role: string; 
  organizationId?: string;
  firstName?: string;
  lastName?: string;
} | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { 
      id: string; 
      username: string; 
      email: string;
      role: string; 
      organizationId?: string;
      firstName?: string;
      lastName?: string;
    };
  } catch {
    return null;
  }
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }

  req.user = user;
  next();
}

export function registerAuthRoutes(app: Express) {
  // Login route
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      console.log(`Login attempt for user: ${username}`);
      
      // Find user by username (without populate to get raw ObjectId)
      const user = await mongoStorage.getUserByUsername(username);
      
      if (!user) {
        console.log(`User not found: ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log(`Found user: ${user.username}, role: ${user.role}`);

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log(`Invalid password for user: ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Get organization info if user is not a super admin
      let organizationInfo = null;
      if (user.role !== 'super_admin' && user.organizationId) {
        organizationInfo = await mongoStorage.getOrganization(user.organizationId.toString());
      }

      // Generate JWT token
      const token = generateToken({
        id: (user._id as any)?.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId?.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
      });

      // Return user info without password
      const userResponse = {
        id: (user._id as any)?.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId?.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        organization: organizationInfo ? {
          id: (organizationInfo._id as any)?.toString(),
          name: organizationInfo.name,
          isVerified: organizationInfo.isVerified
        } : null
      };

      console.log(`Login successful for user: ${username}`);
      res.json({ 
        user: userResponse, 
        token, 
        message: "Login successful"
      });
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user
  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get fresh user data from database
      const user = await mongoStorage.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get organization info if user is not a super admin
      let organizationInfo = null;
      if (user.role !== 'super_admin' && user.organizationId) {
        organizationInfo = await mongoStorage.getOrganization(user.organizationId.toString());
      }

      const userResponse = {
        id: (user._id as any)?.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId?.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        organization: organizationInfo ? {
          id: (organizationInfo._id as any)?.toString(),
          name: organizationInfo.name,
          isVerified: organizationInfo.isVerified
        } : null
      };

      res.json({ user: userResponse });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update username
  app.patch("/api/auth/username", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { username, currentPassword } = usernameUpdateSchema.parse(req.body);

      // Get user to verify current password
      const user = await mongoStorage.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Check if username is already taken
      const existingUser = await mongoStorage.getUserByUsername(username);
      if (existingUser && existingUser._id.toString() !== req.user.id) {
        return res.status(400).json({ message: "Username is already taken" });
      }

      // Update username
      await mongoStorage.updateUser(req.user.id, { username });

      res.json({ 
        message: "Username updated successfully",
        username 
      });
    } catch (error: any) {
      console.error("Update username error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Register organization
  app.post("/api/organizations/register", async (req: Request, res: Response) => {
    try {
      const {
        organizationName,
        adminEmail,
        adminUsername,
        adminPassword,
        adminFirstName,
        adminLastName,
        organizationType,
        description,
        website,
        phone,
        address
      } = req.body;

      console.log('Registration attempt for organization:', organizationName);

      // Validate required fields
      if (!organizationName || !adminEmail || !adminUsername || !adminPassword || !adminFirstName || !adminLastName) {
        return res.status(400).json({ 
          success: false, 
          message: "All required fields must be provided" 
        });
      }

      // Check if organization name already exists
      const existingOrg = await mongoStorage.getOrganizationByName(organizationName);
      if (existingOrg) {
        return res.status(400).json({ 
          success: false, 
          message: "Organization name already exists" 
        });
      }

      // Check if admin email already exists
      const existingUser = await mongoStorage.getUserByEmail(adminEmail);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "Admin email already exists" 
        });
      }

      // Check if admin username already exists
      const existingUsername = await mongoStorage.getUserByUsername(adminUsername);
      if (existingUsername) {
        return res.status(400).json({ 
          success: false, 
          message: "Admin username already exists" 
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      // Create organization first
      const organization = await mongoStorage.createOrganization({
        name: organizationName,
        type: organizationType || 'other',
        description: description || '',
        website: website || '',
        phone: phone || '',
        address: address || '',
        isActive: true,
        isVerified: false, // Requires super admin approval
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('Organization created:', organization.name);

      // Create admin user for the organization
      const adminUser = await mongoStorage.createUser({
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        firstName: adminFirstName,
        lastName: adminLastName,
        organizationId: organization._id,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('Admin user created:', adminUser.username);

      res.status(201).json({
        success: true,
        message: "Organization registration successful. Awaiting super admin approval.",
        data: {
          organizationId: organization._id.toString(),
          organizationName: organization.name,
          adminId: adminUser._id.toString(),
          adminUsername: adminUser.username,
          isVerified: organization.isVerified
        }
      });

    } catch (error: any) {
      console.error("Organization registration error:", error);
      res.status(500).json({
        success: false,
        message: "Registration failed. Please try again."
      });
    }
  });
}