import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { mongoStorage } from "./mongodb-storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
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

export function registerMongoAuthRoutes(app: Express) {
  // Login route
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      console.log(`Login attempt for user: ${username}`);
      
      // Find user by username
      const user = await mongoStorage.getUserByUsername(username.trim());
      
      if (!user) {
        console.log(`User not found: ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        console.log(`Invalid password for user: ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log(`Login successful for user: ${username}`);
      
      // Generate token
      const token = generateToken({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId?.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
      });
      
      res.json({ 
        token, 
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId?.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
        }
      });
      
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user
  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await mongoStorage.getUser(req.user!.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId?.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
        }
      });
      
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}