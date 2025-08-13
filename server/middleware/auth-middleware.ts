import { Response, NextFunction } from "express";
import { verifyToken, type AuthenticatedRequest } from "../routes/auth-routes";

/**
 * Middleware to authenticate JWT tokens
 */
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

/**
 * Middleware to require super admin role
 */
export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin access required" });
  }

  next();
}

/**
 * Middleware to require admin role (includes super admin)
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
}

/**
 * Middleware to require organization membership
 */
export function requireOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Super admin can access any organization
  if (req.user.role === "super_admin") {
    return next();
  }

  if (!req.user.organizationId) {
    return res.status(403).json({ message: "Organization membership required" });
  }

  next();
}

/**
 * Middleware to validate organization access
 * Ensures user can only access their own organization's data
 */
export function validateOrganizationAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Super admin can access any organization
  if (req.user.role === "super_admin") {
    return next();
  }

  const organizationId = req.params.organizationId || req.body.organizationId;
  
  if (organizationId && req.user.organizationId !== organizationId) {
    return res.status(403).json({ message: "Access denied to this organization" });
  }

  next();
}