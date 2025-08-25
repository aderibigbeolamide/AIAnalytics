import type { Express, Request, Response } from "express";
import { authenticateToken, type AuthenticatedRequest } from "./auth-routes";
import { EventService } from "../services/event-service";
import { RegistrationService } from "../services/registration-service";
import { notificationService } from "../services/notification-service";
import { AWSAIService } from "../services/aws-ai-service";
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
  eventImage: z.string().optional(),
  paymentMethods: z.array(z.string()).optional(),
  paymentRecipient: z.string().default("platform"),
  ticketCategories: z.array(z.any()).optional(),
});

export function registerEventRoutes(app: Express) {
  // ================ PUBLIC ENDPOINTS ================
  
  // Get personalized event recommendations (no authentication required)
  app.get("/api/events/recommendations", async (req: Request, res: Response) => {
    try {
      const { userId, sessionId, limit = 5 } = req.query;
      console.log(`Getting recommendations for user: ${userId}, session: ${sessionId}`);
      
      if (!userId && !sessionId) {
        return res.status(400).json({ message: "Either userId or sessionId is required" });
      }
      
      const { IntelligentRecommendationService } = await import('../services/intelligent-recommendation-service.js');
      
      if (userId) {
        // Get personalized recommendations for logged-in user
        const events = await EventService.getPublicEvents();
        const recommendations = await IntelligentRecommendationService.generatePersonalizedRecommendations(
          parseInt(userId as string), 
          events
        );
        
        res.json({
          type: 'personalized',
          userId: parseInt(userId as string),
          recommendations: recommendations.slice(0, parseInt(limit as string))
        });
      } else {
        // Get proactive recommendations for anonymous user
        const proactiveRecs = await IntelligentRecommendationService.getProactiveRecommendations(
          0, // Anonymous user
          parseInt(limit as string)
        );
        
        res.json({
          type: 'proactive',
          sessionId,
          recommendations: proactiveRecs
        });
      }
      
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Track user event interaction
  app.post("/api/events/track-interaction", async (req: Request, res: Response) => {
    try {
      const { 
        userId, 
        sessionId, 
        eventId, 
        interactionType, 
        timeSpent, 
        source, 
        searchQuery,
        deviceType,
        scrollDepth,
        clickPosition 
      } = req.body;
      
      console.log(`Tracking interaction: ${interactionType} for event ${eventId}`);
      
      const { IntelligentRecommendationService } = await import('../services/intelligent-recommendation-service.js');
      
      await IntelligentRecommendationService.trackEventInteraction({
        userId,
        sessionId,
        eventId,
        interactionType,
        timeSpent,
        source,
        searchQuery,
        deviceType,
        scrollDepth,
        clickPosition
      });
      
      res.json({ success: true, message: "Interaction tracked successfully" });
      
    } catch (error) {
      console.error("Error tracking interaction:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Submit recommendation feedback
  app.post("/api/events/recommendation-feedback", async (req: Request, res: Response) => {
    try {
      const { userId, eventId, feedbackType, feedbackReason } = req.body;
      
      if (!userId || !eventId || !feedbackType) {
        return res.status(400).json({ message: "userId, eventId, and feedbackType are required" });
      }
      
      console.log(`Processing feedback: ${feedbackType} for event ${eventId} from user ${userId}`);
      
      const { IntelligentRecommendationService } = await import('../services/intelligent-recommendation-service.js');
      
      await IntelligentRecommendationService.processFeedback({
        userId,
        eventId,
        feedbackType,
        feedbackReason
      });
      
      res.json({ success: true, message: "Feedback processed successfully" });
      
    } catch (error) {
      console.error("Error processing feedback:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get public events with AI enhancements (no authentication required)
  app.get("/api/events/public", async (req: Request, res: Response) => {
    try {
      const { search, includeAI, userId, sessionId } = req.query;
      console.log(`AI Events Search - Query: "${search}", AI: ${includeAI}, User: ${userId}`);
      
      // Add cache-busting headers
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      let events = await EventService.getPublicEvents();
      console.log(`Found ${events.length} total events before search`);
      
      // Apply AI-enhanced search if search query provided
      if (search && typeof search === 'string' && search.trim().length > 0) {
        console.log(`Applying AI search for: "${search.trim()}"`);
        events = await AWSAIService.enhancedSearch(
          search.trim(), 
          events, 
          userId ? parseInt(userId as string) : undefined,
          sessionId as string
        );
        console.log(`After AI search: ${events.length} events found`);
      }
      
      // Add AI insights if requested
      if (includeAI === 'true') {
        events = await Promise.all(events.map(async (event) => {
          const aiInsights = await AWSAIService.generateEventInsights(event);
          return {
            ...event,
            aiInsights
          };
        }));
      }
      
      console.log(`Returning ${events.length} events to frontend`);
      res.json(events);
    } catch (error) {
      console.error("Error getting public events:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get public event by ID with AI insights (no authentication required)
  app.get("/api/events/:id/public", async (req: Request, res: Response) => {
    try {
      const { includeAI } = req.query;
      const event = await EventService.getPublicEventById(req.params.id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found or not available" });
      }

      // Add AI insights if requested
      if (includeAI === 'true') {
        const aiInsights = await AWSAIService.generateEventInsights(event);
        return res.json({
          ...event,
          aiInsights
        });
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
  app.post("/api/events", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const eventData = eventCreateSchema.parse(req.body);
      
      
      // Validate ObjectId strings before conversion
      if (!req.user!.id || !mongoose.Types.ObjectId.isValid(req.user!.id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      let orgIdString: string;
      
      // Handle different user roles for organizationId
      if (req.user.role === 'super_admin') {
        // Super admin: use the first approved organization as default or require organizationId in request
        if (req.body.organizationId) {
          orgIdString = req.body.organizationId;
        } else {
          // Get the first approved organization
          const organizations = await mongoStorage.getOrganizations({ status: 'approved' });
          if (organizations.length === 0) {
            return res.status(400).json({ message: "No approved organizations found. Please create an organization first." });
          }
          orgIdString = organizations[0]._id.toString();
        }
      } else {
        // Regular admin: use their organization
        orgIdString = req.user?.organizationId?.toString() || '';
      }
      
      if (!orgIdString || !mongoose.Types.ObjectId.isValid(orgIdString)) {
        console.log("Organization ID validation failed - orgIdString:", orgIdString);
        return res.status(400).json({ message: "Invalid organization ID" });
      }
      
      // Add organization context
      const fullEventData = {
        ...eventData,
        organizationId: new mongoose.Types.ObjectId(orgIdString),
        createdBy: new mongoose.Types.ObjectId(req.user.id),
        startDate: new Date(eventData.startDate),
        endDate: new Date(eventData.endDate),
        registrationStartDate: eventData.registrationStartDate ? new Date(eventData.registrationStartDate) : undefined,
        registrationEndDate: eventData.registrationEndDate ? new Date(eventData.registrationEndDate) : undefined,
      };

      const event = await EventService.createEvent(req.user.id, fullEventData);
      
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