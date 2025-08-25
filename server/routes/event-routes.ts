import type { Express, Request, Response } from "express";
import { authenticateToken, type AuthenticatedRequest } from "./auth-routes";
import { EventService } from "../services/event-service";
import { RegistrationService } from "../services/registration-service";
import { notificationService } from "../services/notification-service";
import multer from "multer";
import { z } from "zod";
import mongoose from "mongoose";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|csv/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG), PDFs, and CSV files are allowed'));
    }
  }
});

const eventCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  location: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  registrationStartDate: z.string().optional(),
  registrationEndDate: z.string().optional(),
  eventType: z.enum(["registration", "ticket"]),
  maxAttendees: z.number().optional(),
  eligibleAuxiliaryBodies: z.array(z.string()),
  allowGuests: z.boolean(),
  allowInvitees: z.boolean(),
  customRegistrationFields: z.array(z.any()).optional(),
  requiresPayment: z.boolean(),
  paymentAmount: z.number().optional(),
  paymentCurrency: z.string().default("NGN"),
  paymentMethods: z.array(z.string()).optional(),
  paymentRecipient: z.string().default("platform"),
  ticketCategories: z.array(z.any()).optional(),
});

export function registerEventRoutes(app: Express) {
  // ================ PUBLIC ENDPOINTS ================
  
  // Get public events (no authentication required)
  app.get("/api/events/public", async (req: Request, res: Response) => {
    try {
      const events = await EventService.getPublicEvents();
      res.json(events);
    } catch (error) {
      console.error("Error getting public events:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get public event by ID (no authentication required)
  app.get("/api/events/:id/public", async (req: Request, res: Response) => {
    try {
      const event = await EventService.getPublicEventById(req.params.id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found or not available" });
      }

      res.json(event);
    } catch (error) {
      console.error("Error getting public event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ================ PROTECTED ENDPOINTS ================

  // Get events for authenticated user's organization
  app.get("/api/events", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Super admin can see all events, others see only their organization's events
      const organizationFilter = req.user.role === 'super_admin' 
        ? {} 
        : { organizationId: req.user.organizationId };

      const events = await EventService.getOrganizationEvents(organizationFilter);
      res.json(events);
    } catch (error) {
      console.error("Error getting events:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get event by ID
  app.get("/api/events/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const event = await EventService.getEventById(req.params.id, req.user);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json(event);
    } catch (error) {
      console.error("Error getting event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new event
  app.post("/api/events", authenticateToken, upload.single('eventImage'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const eventData = eventCreateSchema.parse(req.body);
      
      // Validate ObjectId strings before conversion
      if (!req.user!.id || !mongoose.Types.ObjectId.isValid(req.user!.id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      if (!req.user?.organizationId || !mongoose.Types.ObjectId.isValid(req.user.organizationId)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }
      
      // Add organization context
      const fullEventData = {
        ...eventData,
        organizationId: new mongoose.Types.ObjectId(req.user.organizationId),
        createdBy: new mongoose.Types.ObjectId(req.user.id),
        startDate: new Date(eventData.startDate),
        endDate: new Date(eventData.endDate),
        registrationStartDate: eventData.registrationStartDate ? new Date(eventData.registrationStartDate) : undefined,
        registrationEndDate: eventData.registrationEndDate ? new Date(eventData.registrationEndDate) : undefined,
      };

      const event = await EventService.createEvent(req.user.id, fullEventData, req.file);
      
      // Schedule event reminders for future events
      if (event) {
        try {
          await notificationService.scheduleEventReminders(event.id);
        } catch (reminderError) {
          console.warn('Failed to schedule event reminders:', reminderError);
          // Don't fail event creation if reminder scheduling fails
        }
      }
      
      res.status(201).json({
        message: "Event created successfully",
        event
      });
    } catch (error: any) {
      console.error("Error creating event:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update event
  app.put("/api/events/:id", authenticateToken, upload.single('eventImage'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const eventData = req.body;
      
      // Parse dates if provided
      if (eventData.startDate) eventData.startDate = new Date(eventData.startDate);
      if (eventData.endDate) eventData.endDate = new Date(eventData.endDate);
      if (eventData.registrationStartDate) eventData.registrationStartDate = new Date(eventData.registrationStartDate);
      if (eventData.registrationEndDate) eventData.registrationEndDate = new Date(eventData.registrationEndDate);

      const event = await EventService.updateEvent(req.params.id, eventData, req.user, req.file);
      
      res.json({
        message: "Event updated successfully",
        event
      });
    } catch (error: any) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete event
  app.delete("/api/events/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await EventService.deleteEvent(req.params.id, req.user);
      
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get event registrations
  app.get("/api/events/:id/registrations", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const filters = req.query;
      const registrations = await RegistrationService.getEventRegistrations(req.params.id, filters);
      
      res.json(registrations);
    } catch (error) {
      console.error("Error getting event registrations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get event statistics
  app.get("/api/events/:id/statistics", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const stats = await EventService.getEventStatistics(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error("Error getting event statistics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check registration eligibility
  app.post("/api/events/:id/check-eligibility", async (req: Request, res: Response) => {
    try {
      const { userType, auxiliaryBody } = req.body;
      
      const eligibility = await RegistrationService.checkRegistrationEligibility(
        req.params.id, 
        userType, 
        auxiliaryBody
      );
      
      res.json(eligibility);
    } catch (error) {
      console.error("Error checking registration eligibility:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}