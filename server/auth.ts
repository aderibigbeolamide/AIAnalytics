import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const SALT_ROUNDS = 10;

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
    organizationId?: number;
    firstName?: string;
    lastName?: string;
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: { 
  id: number; 
  username: string; 
  email: string;
  role: string; 
  organizationId?: number;
  firstName?: string;
  lastName?: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { 
  id: number; 
  username: string; 
  email: string;
  role: string; 
  organizationId?: number;
  firstName?: string;
  lastName?: string;
} | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { 
      id: number; 
      username: string; 
      email: string;
      role: string; 
      organizationId?: number;
      firstName?: string;
      lastName?: string;
    };
  } catch {
    return null;
  }
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}

export function isAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
}

export function isSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin access required" });
  }

  next();
}

export function requireOrganizationAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Super admin can access all organizations
  if (req.user.role === "super_admin") {
    return next();
  }

  // Regular admins and members must belong to an organization
  if (!req.user.organizationId) {
    return res.status(403).json({ message: "Organization access required" });
  }

  next();
}
