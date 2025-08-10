import { Request, Response, Application } from 'express';
import { NotificationService } from './notification-service.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../shared/mongoose-schema.js';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Middleware to authenticate user
async function authenticateUser(req: AuthenticatedRequest, res: Response, next: any) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function setupNotificationRoutes(app: Application) {
  
  // Get user notifications
  app.get("/api/notifications", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';

      const notifications = await NotificationService.getUserNotifications(userId, limit, unreadOnly);
      
      res.json(notifications);
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const count = await NotificationService.getUnreadCount(userId);
      
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread count:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const notificationId = req.params.id;
      const userId = req.user.id;

      const notification = await NotificationService.markAsRead(notificationId, userId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark all notifications as read
  app.patch("/api/notifications/read-all", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      await NotificationService.markAllAsRead(userId);
      
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const notificationId = req.params.id;
      const userId = req.user.id;

      await NotificationService.deleteNotification(notificationId, userId);
      
      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Super admin: Send message to organization
  app.post("/api/super-admin/send-message", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is super admin
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin role required." });
      }

      const { organizationId, title, message, priority = 'medium' } = req.body;

      if (!organizationId || !title || !message) {
        return res.status(400).json({ message: "Organization ID, title, and message are required" });
      }

      await NotificationService.createSuperAdminMessage(
        organizationId,
        req.user.id,
        title,
        message,
        priority
      );

      res.json({ message: "Message sent successfully" });
    } catch (error) {
      console.error("Error sending super admin message:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Super admin: Send system alert to organization
  app.post("/api/super-admin/send-alert", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is super admin
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin role required." });
      }

      const { organizationId, title, message, priority = 'medium', expirationDays = 30 } = req.body;

      if (!organizationId || !title || !message) {
        return res.status(400).json({ message: "Organization ID, title, and message are required" });
      }

      await NotificationService.createSystemAlert(
        organizationId,
        title,
        message,
        priority,
        expirationDays
      );

      res.json({ message: "System alert sent successfully" });
    } catch (error) {
      console.error("Error sending system alert:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Super admin: Broadcast message to all organizations
  app.post("/api/super-admin/broadcast-message", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is super admin
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin role required." });
      }

      const { title, message, priority = 'medium', expirationDays = 30 } = req.body;

      if (!title || !message) {
        return res.status(400).json({ message: "Title and message are required" });
      }

      // Get all active organizations
      const { Organization } = await import('../shared/mongoose-schema.js');
      const organizations = await Organization.find({ status: 'approved' });

      // Send alert to each organization
      const promises = organizations.map(org =>
        NotificationService.createSystemAlert(
          (org._id as mongoose.Types.ObjectId).toString(),
          title,
          message,
          priority,
          expirationDays
        )
      );

      await Promise.all(promises);

      res.json({ 
        message: `Broadcast message sent to ${organizations.length} organizations` 
      });
    } catch (error) {
      console.error("Error broadcasting message:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Selective notifications endpoint - send to specific organizations
  app.post("/api/super-admin/notifications/selective", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is super admin
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin role required." });
      }

      const { message, organizationIds, title = "System Notification", priority = 'medium' } = req.body;

      if (!message || !organizationIds || !Array.isArray(organizationIds) || organizationIds.length === 0) {
        return res.status(400).json({ message: "Message and organizationIds array are required" });
      }

      // Send notification to each selected organization
      const promises = organizationIds.map(orgId =>
        NotificationService.createSuperAdminMessage(
          orgId,
          req.user.id,
          title,
          message,
          priority
        )
      );

      await Promise.all(promises);

      res.json({ 
        message: `Notification sent to ${organizationIds.length} organizations successfully`,
        sentCount: organizationIds.length
      });
    } catch (error) {
      console.error("Error sending selective notification:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Broadcast notifications endpoint - send to all organizations  
  app.post("/api/super-admin/notifications/broadcast", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is super admin
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin role required." });
      }

      const { message, title = "System Notification", priority = 'medium' } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get all active organizations
      const { Organization } = await import('../shared/mongoose-schema.js');
      const organizations = await Organization.find({ status: 'approved' });

      // Send notification to each organization
      const promises = organizations.map(org =>
        NotificationService.createSuperAdminMessage(
          (org._id as mongoose.Types.ObjectId).toString(),
          req.user.id,
          title,
          message,
          priority
        )
      );

      await Promise.all(promises);

      res.json({ 
        message: `Notification broadcasted to ${organizations.length} organizations successfully`,
        sentCount: organizations.length
      });
    } catch (error) {
      console.error("Error broadcasting notification:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Debug endpoint to check notification system state
  app.get("/api/debug/notification-system", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { User, Organization, Notification } = await import('../shared/mongoose-schema.js');

      const [allUsers, allOrgs, allNotifications] = await Promise.all([
        User.find({}).select('_id username role organizationId status'),
        Organization.find({}).select('_id name status'),
        Notification.find({}).sort({ createdAt: -1 }).limit(10)
      ]);

      res.json({
        users: allUsers.map(u => ({
          id: (u._id as any).toString(),
          username: u.username,
          role: u.role,
          organizationId: (u.organizationId as any)?.toString(),
          status: u.status
        })),
        organizations: allOrgs.map(o => ({
          id: (o._id as any).toString(),
          name: o.name,
          status: o.status
        })),
        recentNotifications: allNotifications.map(n => ({
          id: (n._id as any).toString(),
          recipientId: (n.recipientId as any)?.toString(),
          type: n.type,
          title: n.title,
          createdAt: n.createdAt
        }))
      });
    } catch (error) {
      console.error("Error in debug endpoint:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get notification statistics (for super admin dashboard)
  app.get("/api/super-admin/notification-stats", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is super admin
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin role required." });
      }

      const { Notification, Organization } = await import('../shared/mongoose-schema.js');

      const [
        totalNotifications,
        unreadNotifications,
        paymentNotifications,
        systemAlerts,
        activeOrganizations
      ] = await Promise.all([
        Notification.countDocuments(),
        Notification.countDocuments({ isRead: false }),
        Notification.countDocuments({ type: 'payment_received' }),
        Notification.countDocuments({ type: 'system_alert' }),
        Organization.countDocuments({ status: 'approved' })
      ]);

      res.json({
        totalNotifications,
        unreadNotifications,
        paymentNotifications,
        systemAlerts,
        activeOrganizations
      });
    } catch (error) {
      console.error("Error getting notification statistics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Clean up expired notifications (can be called via cron job)
  app.post("/api/notifications/cleanup", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is super admin or admin
      if (!['super_admin', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deletedCount = await NotificationService.cleanupExpiredNotifications();
      
      res.json({ 
        message: `Cleaned up ${deletedCount} expired notifications` 
      });
    } catch (error) {
      console.error("Error cleaning up notifications:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}