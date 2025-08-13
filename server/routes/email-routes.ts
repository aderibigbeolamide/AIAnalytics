import type { Express, Request, Response } from "express";
import { authenticateToken, type AuthenticatedRequest } from "./auth-routes";
import { notificationService } from "../services/notification-service";
import { emailService } from "../services/email-service";
import { z } from "zod";

const testEmailSchema = z.object({
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1),
  isHtml: z.boolean().optional(),
});

const bulkEmailSchema = z.object({
  eventId: z.string(),
  subject: z.string().min(1),
  message: z.string().min(1),
  isHtml: z.boolean().optional(),
  recipientType: z.enum(['all', 'registered', 'attended', 'members', 'guests']),
});

export function registerEmailRoutes(app: Express) {
  // Test email functionality
  app.post("/api/email/test", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }

      const { email, subject, message, isHtml } = testEmailSchema.parse(req.body);
      
      const success = await emailService.sendNotificationEmail(email, subject, message, isHtml);
      
      if (success) {
        res.json({ message: "Test email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send test email" });
      }

    } catch (error: any) {
      console.error("Error sending test email:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Send bulk email to event participants
  app.post("/api/email/bulk", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { eventId, subject, message, isHtml, recipientType } = bulkEmailSchema.parse(req.body);
      
      // Get event and check permissions
      const { mongoStorage } = await import("../mongodb-storage");
      const event = await mongoStorage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if user has access to this event
      if (req.user.role !== 'super_admin' && event.organizationId?.toString() !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get event registrations based on recipient type
      let registrations = await mongoStorage.getEventRegistrations(eventId);
      
      switch (recipientType) {
        case 'registered':
          registrations = registrations.filter(r => r.status === 'registered');
          break;
        case 'attended':
          registrations = registrations.filter(r => r.status === 'attended');
          break;
        case 'members':
          registrations = registrations.filter(r => r.registrationType === 'member');
          break;
        case 'guests':
          registrations = registrations.filter(r => r.registrationType === 'guest');
          break;
        // 'all' includes everyone
      }

      if (registrations.length === 0) {
        return res.status(400).json({ message: "No recipients found for the selected criteria" });
      }

      // Queue emails for all recipients
      let emailCount = 0;
      for (const registration of registrations) {
        let email: string;
        let name: string;

        if (registration.registrationType === 'member' && registration.memberId) {
          const member = await mongoStorage.getMember(registration.memberId.toString());
          if (!member) continue;
          email = member.email;
          name = member.fullName;
        } else {
          email = registration.guestEmail || '';
          name = registration.guestName || 'Participant';
        }

        if (email) {
          await notificationService.queueNotification({
            type: 'general',
            recipient: { email, name },
            data: {
              subject: `${subject} - ${event.name}`,
              message: message.replace(/\{name\}/g, name).replace(/\{event\}/g, event.name),
              isHtml
            },
            priority: 'medium'
          });
          emailCount++;
        }
      }

      res.json({ 
        message: `Bulk email queued successfully`, 
        recipientCount: emailCount,
        eventName: event.name
      });

    } catch (error: any) {
      console.error("Error sending bulk email:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get email queue status
  app.get("/api/email/queue-status", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || (req.user.role !== 'super_admin' && req.user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const status = notificationService.getQueueStatus();
      res.json(status);

    } catch (error) {
      console.error("Error getting queue status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Manually trigger event reminders
  app.post("/api/email/event-reminders/:eventId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const eventId = req.params.eventId;
      
      // Get event and check permissions
      const { mongoStorage } = await import("../mongodb-storage");
      const event = await mongoStorage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (req.user.role !== 'super_admin' && event.organizationId?.toString() !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await notificationService.scheduleEventReminders(eventId);
      
      res.json({ 
        message: "Event reminders scheduled successfully",
        eventName: event.name
      });

    } catch (error) {
      console.error("Error scheduling event reminders:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}