import express, { Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from './mongo-auth-routes.js';
import { EventReminderService } from './event-reminder-service.js';

export function registerEventReminderRoutes(app: express.Application) {
  
  // Get upcoming events that need reminders (Admin only)
  app.get("/api/events/upcoming-reminders", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const events = await EventReminderService.getUpcomingEventsForReminders();
      
      res.json({
        success: true,
        events: events.map(event => ({
          id: event._id,
          name: event.name,
          startDate: event.startDate,
          location: event.location,
          eventType: event.eventType,
          organizationId: event.organizationId
        }))
      });
    } catch (error) {
      console.error("Error getting upcoming events for reminders:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Manually trigger reminder for specific event (Admin only)
  app.post("/api/events/:eventId/send-reminder", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const { eventId } = req.params;
      const { timeRemaining } = req.body;

      if (!timeRemaining) {
        return res.status(400).json({ message: "timeRemaining is required" });
      }

      const result = await EventReminderService.triggerEventReminder(eventId, timeRemaining);
      
      res.json(result);
    } catch (error) {
      console.error("Error triggering event reminder:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  // Process all pending reminders (System/Cron endpoint)
  app.post("/api/system/process-reminders", async (req: Request, res: Response) => {
    try {
      // This endpoint could be called by a cron job or system scheduler
      // You might want to add API key authentication for system endpoints
      const systemApiKey = req.headers['x-system-api-key'];
      if (systemApiKey !== process.env.SYSTEM_API_KEY && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ message: "Invalid system API key" });
      }

      await EventReminderService.processEventReminders();
      
      res.json({ 
        success: true, 
        message: "Event reminders processed successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error processing event reminders:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to process event reminders" 
      });
    }
  });

  // Get reminder statistics (Admin only)
  app.get("/api/events/reminder-stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const upcomingEvents = await EventReminderService.getUpcomingEventsForReminders();
      
      // Calculate statistics
      const stats = {
        upcomingEvents: upcomingEvents.length,
        eventsIn24Hours: upcomingEvents.filter(event => {
          const now = new Date();
          const eventTime = new Date(event.startDate);
          const hoursDiff = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hoursDiff <= 24 && hoursDiff > 0;
        }).length,
        eventsInWeek: upcomingEvents.filter(event => {
          const now = new Date();
          const eventTime = new Date(event.startDate);
          const daysDiff = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= 7 && daysDiff > 0;
        }).length,
        eventsByType: upcomingEvents.reduce((acc, event) => {
          acc[event.eventType] = (acc[event.eventType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
      
      res.json({
        success: true,
        stats,
        upcomingEvents: upcomingEvents.map(event => ({
          id: event._id,
          name: event.name,
          startDate: event.startDate,
          eventType: event.eventType,
          location: event.location
        }))
      });
    } catch (error) {
      console.error("Error getting reminder statistics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}