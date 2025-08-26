import type { Express, Request, Response } from "express";
import { mongoStorage } from "./mongodb-storage";
import { authenticateToken, type AuthenticatedRequest } from "./mongo-auth-routes";
import multer from "multer";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import { NotificationService } from "./notification-service";
import { FaceRecognitionService } from "./face-recognition";
import { FileStorageHandler } from "./storage-handler";
import mongoose from "mongoose";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage to get file.buffer
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and CSV files
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

export function registerMongoRoutes(app: Express) {
  // ================ PUBLIC ENDPOINTS (PRIORITY) ================
  
  // Get public events (DISABLED - AI-enhanced version in event-routes.ts is used instead)
  // app.get("/api/events/public", async (req: Request, res: Response) => {
  //   try {
  //     const events = await mongoStorage.getEvents();
  //     
  //     const publicEvents = events.filter(event => ['upcoming', 'active'].includes(event.status)).map(event => ({
  //       id: event._id?.toString(),
  //       name: event.name,
  //       description: event.description,
  //       location: event.location,
  //       startDate: event.startDate,
  //       endDate: event.endDate,
  //       registrationStartDate: event.registrationStartDate,
  //       registrationEndDate: event.registrationEndDate,
  //       status: event.status,
  //       maxAttendees: event.maxAttendees,
  //       eligibleAuxiliaryBodies: event.eligibleAuxiliaryBodies,
  //       allowGuests: event.allowGuests,
  //       allowInvitees: event.allowInvitees,
  //       eventType: event.eventType,
  //       eventImage: event.eventImage,
  //       ticketCategories: event.ticketCategories || [],
  //       customRegistrationFields: event.customRegistrationFields,
  //       paymentSettings: event.paymentSettings,
  //       organizationId: event.organizationId?.toString()
  //     }));

  //     res.json(publicEvents);
  //   } catch (error) {
  //     console.error("Error getting public events:", error);
  //     res.status(500).json({ message: "Internal server error" });
  //   }
  // });

  // Get public event by ID (no authentication required)
  app.get("/api/events/:id/public", async (req: Request, res: Response) => {
    try {
      const eventId = req.params.id;
      
      const event = await mongoStorage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const publicEvent = {
        id: event._id.toString(),
        name: event.name,
        description: event.description,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        registrationStartDate: event.registrationStartDate,
        registrationEndDate: event.registrationEndDate,
        status: event.status,
        maxAttendees: event.maxAttendees,
        eligibleAuxiliaryBodies: event.eligibleAuxiliaryBodies,
        allowGuests: event.allowGuests,
        allowInvitees: event.allowInvitees,
        eventType: event.eventType,
        eventImage: event.eventImage,
        ticketCategories: event.ticketCategories || [],
        customFields: event.customFields,
        customRegistrationFields: event.customRegistrationFields,
        paymentSettings: event.paymentSettings,
        faceRecognitionSettings: event.faceRecognitionSettings,
        organizationId: event.organizationId?.toString()
      };

      res.json(publicEvent);
    } catch (error) {
      console.error("Error getting public event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ================ EVENT MANAGEMENT ================
  
  // Get events for organization (admin dashboard)
  app.get("/api/events", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    console.log('*** DEBUG: GET /api/events route called with FRESH stats logic ***', new Date().toISOString());
    
    // Force no caching for this endpoint
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Last-Modified', new Date().toUTCString());
    
    try {
      const organizationId = req.user?.organizationId;
      console.log('GET /api/events - Organization ID:', organizationId);
      
      // Get all events for this organization
      const events = await mongoStorage.getEvents();
      console.log('Total events found:', events.length);
      const organizationEvents = events.filter(event => 
        event.organizationId?.toString() === organizationId
      );
      console.log('Organization events found:', organizationEvents.length);
      console.log('*** EXECUTING STATS CALCULATION FOR', organizationEvents.length, 'EVENTS ***');
      
      // Calculate registration statistics for each event
      const eventsWithStats = [];
      
      for (const event of organizationEvents) {
        try {
          const eventId = (event as any)._id?.toString();
          console.log(`Processing event: ${event.name} (${eventId})`);
          
          // Get registrations for this event
          const registrations = await mongoStorage.getEventRegistrations(eventId || '');
          console.log(`Found ${registrations.length} registrations for ${event.name}`);
          
          // Get tickets for this event (if ticket-based)
          let tickets: any[] = [];
          if (event.eventType === 'ticket') {
            try {
              tickets = await mongoStorage.getTickets({ eventId: eventId || '' });
              console.log(`Event ${event.name} (${eventId}): Found ${tickets.length} tickets`);
            } catch (error) {
              console.error(`Error getting tickets for event ${eventId}:`, error);
              tickets = [];
            }
          }
          
          // Calculate registration statistics
          const totalRegistrations = event.eventType === 'ticket' 
            ? tickets.length 
            : registrations.length;
            
          const memberRegistrations = event.eventType === 'ticket' 
            ? tickets.filter(ticket => ticket.paymentStatus === 'completed').length // Paid tickets
            : registrations.filter(reg => (reg.registrationType === 'member' || reg.registration_type === 'member')).length;
            
          const guestRegistrations = event.eventType === 'ticket' 
            ? tickets.filter(ticket => ticket.paymentStatus === 'pending').length // Pending payment tickets
            : registrations.filter(reg => (reg.registrationType === 'guest' || reg.registration_type === 'guest')).length;
            
          const inviteeRegistrations = event.eventType === 'ticket' 
            ? tickets.filter(ticket => ticket.paymentStatus === 'failed').length // Failed payment tickets
            : registrations.filter(reg => (reg.registrationType === 'invitee' || reg.registration_type === 'invitee')).length;
          
          // Calculate attendance rate
          const attendedCount = event.eventType === 'ticket'
            ? tickets.filter(ticket => ticket.status === 'used').length
            : registrations.filter(reg => reg.status === 'attended').length;
            
          const attendanceRate = totalRegistrations > 0 
            ? (attendedCount / totalRegistrations) * 100 
            : 0;
          
          console.log(`Stats for ${event.name}: total=${totalRegistrations}, members=${memberRegistrations}, guests=${guestRegistrations}, invitees=${inviteeRegistrations}`);
          
          // Create base event object and remove existing statistics fields
          const baseEvent = (event as any).toObject();
          delete baseEvent.totalRegistrations;
          delete baseEvent.memberRegistrations;
          delete baseEvent.guestRegistrations;
          delete baseEvent.inviteeRegistrations;
          delete baseEvent.attendanceRate;
          
          // Override with calculated statistics (important: do this AFTER the spread)
          const eventData = {
            ...baseEvent,
            id: (event as any)._id?.toString(),
            organizationId: event.organizationId?.toString(),
            createdBy: event.createdBy?.toString(),
            // Add calculated statistics
            totalRegistrations: totalRegistrations || 0,
            memberRegistrations: memberRegistrations || 0,
            guestRegistrations: guestRegistrations || 0,
            inviteeRegistrations: inviteeRegistrations || 0,
            attendanceRate: Math.round(attendanceRate * 10) / 10 // Round to 1 decimal
          };
          
          console.log(`Event data for ${event.name}:`, {
            totalRegistrations: eventData.totalRegistrations,
            memberRegistrations: eventData.memberRegistrations,
            guestRegistrations: eventData.guestRegistrations,
            inviteeRegistrations: eventData.inviteeRegistrations
          });
          
          eventsWithStats.push(eventData);
        } catch (error) {
          console.error(`Error processing event ${event.name}:`, error);
          // Add event without stats if there's an error
          eventsWithStats.push({
            id: (event as any)._id?.toString(),
            ...(event as any).toObject(),
            organizationId: event.organizationId?.toString(),
            createdBy: event.createdBy?.toString(),
            totalRegistrations: 0,
            memberRegistrations: 0,
            guestRegistrations: 0,
            inviteeRegistrations: 0,
            attendanceRate: 0
          });
        }
      }
      
      console.log('*** FINAL EVENTS WITH STATS COUNT:', eventsWithStats.length);
      console.log('*** SAMPLE EVENT WITH STATS:', eventsWithStats[0] ? {
        name: eventsWithStats[0].name,
        totalRegistrations: eventsWithStats[0].totalRegistrations,
        memberRegistrations: eventsWithStats[0].memberRegistrations
      } : 'No events');
      
      // Ensure we send clean JSON data, not MongoDB objects
      const cleanEvents = eventsWithStats.map(event => {
        if (event && typeof event === 'object') {
          // Convert MongoDB document to plain object if needed
          const plainEvent = event.toObject ? event.toObject() : event;
          return {
            id: plainEvent.id || plainEvent._id?.toString(),
            name: plainEvent.name,
            description: plainEvent.description,
            location: plainEvent.location,
            startDate: plainEvent.startDate,
            endDate: plainEvent.endDate,
            eventImage: plainEvent.eventImage,
            eventType: plainEvent.eventType,
            status: plainEvent.status,
            organizationId: plainEvent.organizationId?.toString() || plainEvent.organizationId,
            totalRegistrations: plainEvent.totalRegistrations || 0,
            memberRegistrations: plainEvent.memberRegistrations || 0,
            guestRegistrations: plainEvent.guestRegistrations || 0,
            inviteeRegistrations: plainEvent.inviteeRegistrations || 0,
            attendanceRate: plainEvent.attendanceRate || 0,
            maxAttendees: plainEvent.maxAttendees,
            allowGuests: plainEvent.allowGuests,
            allowInvitees: plainEvent.allowInvitees,
            ticketCategories: plainEvent.ticketCategories || [],
            paymentSettings: plainEvent.paymentSettings,
            createdAt: plainEvent.createdAt,
            updatedAt: plainEvent.updatedAt
          };
        }
        return event;
      });
      
      console.log('*** SENDING CLEAN EVENTS:', cleanEvents.length);
      console.log('*** SAMPLE CLEAN EVENT:', cleanEvents[0]);
      
      res.json(cleanEvents);
    } catch (error) {
      console.error("Error getting events:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get event registration counts (separate endpoint for compatibility)
  app.get("/api/events/:eventId/registration-counts", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventId = req.params.eventId;
      console.log('Getting registration counts for event:', eventId);
      
      // Get registrations for this event
      const registrations = await mongoStorage.getEventRegistrations(eventId);
      console.log(`Found ${registrations.length} registrations for event ${eventId}`);
      
      // Get event to check if it's ticket-based
      const event = await mongoStorage.getEventById(eventId);
      
      let counts;
      if (event?.eventType === 'ticket') {
        // For ticket events, get tickets and calculate stats
        const tickets = await mongoStorage.getTickets({ eventId });
        counts = {
          totalRegistrations: tickets.length,
          memberCount: tickets.filter(ticket => ticket.paymentStatus === 'completed').length, // Paid tickets
          guestCount: tickets.filter(ticket => ticket.paymentStatus === 'pending').length, // Pending payment tickets  
          inviteeCount: tickets.filter(ticket => ticket.paymentStatus === 'failed').length, // Failed payment tickets
          attendedCount: tickets.filter(ticket => ticket.status === 'used').length,
          registeredCount: tickets.filter(ticket => ticket.status === 'active').length,
        };
      } else {
        // For registration events, count registrations by type
        counts = {
          totalRegistrations: registrations.length,
          memberCount: registrations.filter(r => r.registrationType === 'member').length,
          guestCount: registrations.filter(r => r.registrationType === 'guest').length,
          inviteeCount: registrations.filter(r => r.registrationType === 'invitee').length,
          attendedCount: registrations.filter(r => r.status === 'attended').length,
          registeredCount: registrations.filter(r => r.status === 'registered').length,
        };
      }
      
      console.log('Registration counts:', counts);
      res.json(counts);
    } catch (error) {
      console.error('Error fetching event registration counts:', error);
      res.status(500).json({ message: "Failed to fetch registration counts" });
    }
  });

  // Global reports endpoint
  app.get("/api/reports", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      console.log('GET /api/reports - Organization ID:', organizationId);
      
      // Get all reports for this organization
      const allReports = await mongoStorage.getAllEventReports();
      const organizationReports = allReports.filter(report => 
        report.organizationId?.toString() === organizationId
      );
      
      console.log(`Found ${organizationReports.length} reports for organization ${organizationId}`);
      res.json(organizationReports);
    } catch (error) {
      console.error('Error fetching all reports:', error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // Event reports endpoints
  app.get("/api/events/:eventId/reports", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventId = req.params.eventId;
      const reports = await mongoStorage.getEventReports(eventId);
      res.json(reports);
    } catch (error) {
      console.error('Error fetching event reports:', error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post("/api/events/:eventId/reports", async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId;
      const { name, email, phone, reportType, message } = req.body;
      
      // Validate required fields
      if (!name || !reportType || !message) {
        return res.status(400).json({ message: "Name, report type, and message are required" });
      }

      // Get event to find organization ID
      const event = await mongoStorage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const report = await mongoStorage.createEventReport({
        eventId,
        organizationId: event.organizationId?.toString(), // Add organization ID for filtering
        eventName: event.name, // Add event name for display
        reporterName: name,
        reporterEmail: email,
        reporterPhone: phone,
        reportType,
        message,
        status: 'pending'
      });
      
      res.status(201).json(report);
    } catch (error) {
      console.error("Failed to submit report:", error);
      res.status(400).json({ message: "Failed to submit report" });
    }
  });

  // Create event
  app.post("/api/events", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventData = { ...req.body };
      
      // Ensure required fields
      if (!eventData.name || !eventData.startDate) {
        return res.status(400).json({ message: "Event name and start date are required" });
      }

      // Convert dates
      eventData.startDate = new Date(eventData.startDate);
      if (eventData.endDate) eventData.endDate = new Date(eventData.endDate);
      if (eventData.registrationStartDate) eventData.registrationStartDate = new Date(eventData.registrationStartDate);
      if (eventData.registrationEndDate) eventData.registrationEndDate = new Date(eventData.registrationEndDate);

      // Set defaults
      eventData.createdBy = req.user!.id;
      eventData.organizationId = req.user!.organizationId;
      eventData.status = 'upcoming';
      
      // Create event in MongoDB
      const event = await mongoStorage.createEvent(eventData);
      
      res.status(201).json({
        id: event._id.toString(),
        ...event.toObject(),
        organizationId: event.organizationId?.toString(),
        createdBy: event.createdBy?.toString()
      });
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update event
  app.put("/api/events/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const updateData = { ...req.body };
      
      const updatedEvent = await mongoStorage.updateEvent(eventId, updateData);
      
      if (!updatedEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json({
        id: updatedEvent._id.toString(),
        ...updatedEvent.toObject(),
        organizationId: updatedEvent.organizationId?.toString(),
        createdBy: updatedEvent.createdBy?.toString()
      });
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete event
  app.delete("/api/events/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      
      const deleted = await mongoStorage.deleteEvent(eventId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single event
  app.get("/api/events/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      
      const event = await mongoStorage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Properly serialize Mongoose document to plain object
      const plainEvent = JSON.parse(JSON.stringify(event));
      
      // Disable caching for event details to always get fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json({
        id: plainEvent._id || event.id,
        name: plainEvent.name,
        description: plainEvent.description,
        location: plainEvent.location,
        startDate: plainEvent.startDate,
        endDate: plainEvent.endDate,
        registrationStartDate: plainEvent.registrationStartDate,
        registrationEndDate: plainEvent.registrationEndDate,
        eventType: plainEvent.eventType,
        status: plainEvent.status,
        eventImage: plainEvent.eventImage,
        eligibleAuxiliaryBodies: plainEvent.eligibleAuxiliaryBodies || [],
        allowGuests: plainEvent.allowGuests || false,
        allowInvitees: plainEvent.allowInvitees || false,
        customRegistrationFields: plainEvent.customRegistrationFields || [],
        paymentSettings: plainEvent.paymentSettings || {},
        faceRecognitionSettings: plainEvent.faceRecognitionSettings || {},
        reminderSettings: plainEvent.reminderSettings || {},
        ticketCategories: plainEvent.ticketCategories || [],
        tags: plainEvent.tags || [],
        requiresPayment: plainEvent.requiresPayment || false,
        paymentAmount: plainEvent.paymentAmount,
        paymentCurrency: plainEvent.paymentCurrency || 'NGN',
        paymentMethods: plainEvent.paymentMethods || [],
        isPrivate: plainEvent.isPrivate || false,
        organizationId: plainEvent.organizationId,
        createdBy: plainEvent.createdBy,
        createdAt: plainEvent.createdAt,
        updatedAt: plainEvent.updatedAt
      });
    } catch (error) {
      console.error("Error getting event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ================ MEMBER MANAGEMENT ================
  
  // Create member
  app.post("/api/members", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const memberData = {
        ...req.body,
        organizationId: req.user?.organizationId,
        createdAt: new Date(),
        status: req.body.status || 'active'
      };

      const member = await mongoStorage.createMember(memberData);
      
      res.status(201).json({
        id: member._id.toString(),
        ...member.toObject(),
        organizationId: member.organizationId?.toString()
      });
    } catch (error) {
      console.error("Error creating member:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update member
  app.put("/api/members/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const memberId = req.params.id;
      const updateData = { ...req.body };
      
      const updatedMember = await mongoStorage.updateMember(memberId, updateData);
      
      if (!updatedMember) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.json({
        id: updatedMember._id.toString(),
        ...updatedMember.toObject(),
        organizationId: updatedMember.organizationId?.toString()
      });
    } catch (error) {
      console.error("Error updating member:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete member
  app.delete("/api/members/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const memberId = req.params.id;
      
      const deleted = await mongoStorage.deleteMember(memberId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.json({ message: "Member deleted successfully" });
    } catch (error) {
      console.error("Error deleting member:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's registrations (both authenticated and unauthenticated lookup)
  app.get("/api/my-registrations", async (req: Request, res: Response) => {
    try {
      const { uniqueId, email } = req.query;
      const authHeader = req.headers.authorization;
      
      let userRegistrations: any[] = [];
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Authenticated user - get their registrations
        const token = authHeader.split(' ')[1];
        try {
          const jwt = await import('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
          
          // Get all registrations for this user's organization
          const registrations = await mongoStorage.getEventRegistrations();
          userRegistrations = [];
          
          for (const reg of registrations) {
            if (reg.email === decoded.email || reg.organizationId?.toString() === decoded.organizationId) {
              const event = await mongoStorage.getEvent(reg.eventId?.toString() || '');
              userRegistrations.push({
                id: reg._id?.toString(),
                eventId: reg.eventId?.toString(),
                registrationType: reg.registrationType,
                firstName: reg.firstName,
                lastName: reg.lastName,
                email: reg.email,
                uniqueId: reg.uniqueId,
                status: reg.status,
                qrCode: reg.qrCode,
                createdAt: reg.createdAt,
                event: {
                  id: event?._id?.toString(),
                  name: event?.name || 'Event',
                  description: event?.description || '',
                  location: event?.location || '',
                  startDate: event?.startDate,
                  endDate: event?.endDate,
                  status: event?.status
                }
              });
            }
          }
        } catch (err) {
          console.error("Token verification failed:", err);
        }
      }
      
      // Unauthenticated lookup by uniqueId or email
      if (userRegistrations.length === 0 && (uniqueId || email)) {
        const registrations = await mongoStorage.getEventRegistrations();
        
        if (uniqueId) {
          const foundRegistrations = registrations.filter(reg => reg.uniqueId === uniqueId);
          for (const reg of foundRegistrations) {
            let eventId = reg.eventId;
            if (typeof eventId === 'object' && eventId?._id) {
              eventId = eventId._id.toString();
            } else if (eventId) {
              eventId = eventId.toString();
            }
            
            const event = await mongoStorage.getEvent(eventId || '');
            userRegistrations.push({
              id: reg._id?.toString(),
              eventId: eventId,
              registrationType: reg.registrationType,
              firstName: reg.firstName,
              lastName: reg.lastName,
              email: reg.email,
              uniqueId: reg.uniqueId,
              status: reg.status,
              qrCode: reg.qrCode,
              createdAt: reg.createdAt,
              event: {
                id: event?._id?.toString(),
                name: event?.name || 'Event',
                description: event?.description || '',
                location: event?.location || '',
                startDate: event?.startDate,
                endDate: event?.endDate,
                status: event?.status
              }
            });
          }
        }
        
        if (email) {
          const foundRegistrations = registrations.filter(reg => reg.email === email);
          for (const reg of foundRegistrations) {
            let eventId = reg.eventId;
            if (typeof eventId === 'object' && eventId?._id) {
              eventId = eventId._id.toString();
            } else if (eventId) {
              eventId = eventId.toString();
            }
            
            const event = await mongoStorage.getEvent(eventId || '');
            userRegistrations.push({
              id: reg._id?.toString(),
              eventId: eventId,
              registrationType: reg.registrationType,
              firstName: reg.firstName,
              lastName: reg.lastName,
              email: reg.email,
              uniqueId: reg.uniqueId,
              status: reg.status,
              qrCode: reg.qrCode,
              createdAt: reg.createdAt,
              event: {
                id: event?._id?.toString(),
                name: event?.name || 'Event',
                description: event?.description || '',
                location: event?.location || '',
                startDate: event?.startDate,
                endDate: event?.endDate,
                status: event?.status
              }
            });
          }
        }
      }

      // Return empty array if no registrations found
      if (userRegistrations.length === 0) {
        return res.json([]);
      }

      res.json(userRegistrations);

    } catch (error) {
      console.error("Error fetching registrations:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });

  // ================ EVENT REGISTRATION ================
  
  // Register for event with custom fields and validation
  app.post("/api/events/:eventId/register", upload.fields([
    { name: 'paymentReceipt', maxCount: 1 },
    { name: 'facePhoto', maxCount: 1 }
  ]), async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId;
      
      // Get event details first
      const event = await mongoStorage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Extract form data (multipart/form-data or JSON)
      const formData = req.body;
      console.log("Registration form data:", formData);
      console.log("Registration type being processed:", formData.registrationType);

      // Validate required base fields
      if (!formData.registrationType) {
        return res.status(400).json({ message: "Registration type is required" });
      }

      // Validate custom fields based on event configuration
      if (event.customRegistrationFields && Array.isArray(event.customRegistrationFields)) {
        for (const field of event.customRegistrationFields) {
          // Check if field should be shown for this registration type
          const shouldShow = !field.visibleForTypes || field.visibleForTypes.includes(formData.registrationType);
          if (!shouldShow) continue;

          // Check if field is required for this registration type
          const isRequired = field.required === true || 
                           (field.requiredForTypes && field.requiredForTypes.includes(formData.registrationType));
          
          if (isRequired) {
            const fieldValue = formData[field.name];
            if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
              return res.status(400).json({ 
                message: `${field.label} is required for ${formData.registrationType} registration` 
              });
            }
          }
        }
      }

      // Generate unique identifiers  
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let uniqueId = '';
      for (let i = 0; i < 6; i++) {
        uniqueId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const qrCode = nanoid(16);

      // Determine initial status based on payment requirements
      // Check if event requires payment
      const requiresPayment = event.paymentAmount && event.paymentAmount > 0;
      const initialStatus = requiresPayment ? 'pending' : 'active';
      const initialPaymentStatus = requiresPayment ? 'pending' : 'not_required';

      // Helper function to split FullName into firstName and lastName
      const splitFullName = (fullName: string) => {
        if (!fullName || typeof fullName !== 'string') return { firstName: '', lastName: '' };
        const parts = fullName.trim().split(' ');
        return {
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || ''
        };
      };

      // Extract firstName and lastName, handling FullName fields
      let firstName = formData.firstName || formData.FirstName || formData.guestName || '';
      let lastName = formData.lastName || formData.LastName || formData.guestLastName || '';
      
      // If we don't have both firstName and lastName but have a FullName field, split it
      if ((!firstName || !lastName) && (formData.FullName || formData.fullName || formData.full_name || formData.Fullname)) {
        const fullName = formData.FullName || formData.fullName || formData.full_name || formData.Fullname;
        const splitName = splitFullName(fullName);
        firstName = firstName || splitName.firstName;
        lastName = lastName || splitName.lastName;
      }
      
      // Ensure we always have at least empty strings for firstName and lastName
      firstName = firstName || '';
      lastName = lastName || '';
      
      console.log("Name processing result:", { 
        originalFirstName: formData.firstName, 
        originalLastName: formData.lastName, 
        fullName: formData.FullName || formData.fullName || formData.full_name || formData.Fullname,
        finalFirstName: firstName, 
        finalLastName: lastName 
      });

      // Prepare registration data
      const registrationData: any = {
        eventId: new mongoose.Types.ObjectId(eventId),
        registrationType: formData.registrationType,
        uniqueId,
        qrCode,
        status: initialStatus,
        paymentStatus: initialPaymentStatus,
        createdAt: new Date(),
        // Extract standard fields from custom field data
        firstName,
        lastName,
        email: formData.email || formData.Email || formData.guestEmail || '',
        phoneNumber: formData.phone || formData.Phone || formData.phoneNumber || '',
        auxiliaryBody: formData.auxiliaryBody || formData.AuxiliaryBody || formData.auxiliary_body || 
                       formData.Gender || formData.gender || formData.Student || formData.student || 
                       (Array.isArray(formData.Gender) ? formData.Gender[0] : '') || 
                       (Array.isArray(formData.Student) ? formData.Student[0] : '') || '',
        // Store all custom field data
        registrationData: formData
      };

      // Process custom fields and ensure names are captured
      if (event.customRegistrationFields) {
        for (const field of event.customRegistrationFields) {
          const fieldValue = formData[field.name];
          if (fieldValue !== undefined) {
            // Map standard fields properly
            if (field.name === 'firstName' || field.name === 'FirstName' || field.name === 'guestName') {
              registrationData.firstName = fieldValue;
            } else if (field.name === 'lastName' || field.name === 'LastName' || field.name === 'guestLastName') {
              registrationData.lastName = fieldValue;
            } else if (field.name === 'FullName' || field.name === 'fullName' || field.name === 'full_name' || field.name === 'Fullname') {
              // Handle FullName fields by splitting them
              const splitName = splitFullName(fieldValue);
              // Only overwrite if we don't already have better values
              if (!registrationData.firstName || registrationData.firstName === '') {
                registrationData.firstName = splitName.firstName;
              }
              if (!registrationData.lastName || registrationData.lastName === '') {
                registrationData.lastName = splitName.lastName;
              }
            } else if (field.name === 'email' || field.name === 'Email' || field.name === 'guestEmail') {
              registrationData.email = fieldValue;
            } else if (field.name === 'phone' || field.name === 'Phone' || field.name === 'phoneNumber') {
              registrationData.phoneNumber = fieldValue;
            } else if (field.name === 'auxiliaryBody' || field.name === 'AuxiliaryBody' || field.name === 'auxiliary_body' || 
                       field.name === 'Gender' || field.name === 'gender' || field.name === 'Student' || field.name === 'student' ||
                       (field.type === 'select' && field.options && (field.options.includes('Male') || field.options.includes('Female'))) ||
                       (field.type === 'radio' && field.options && (field.options.includes('Male') || field.options.includes('Female'))) ||
                       (field.type === 'checkbox' && field.options && (field.options.includes('Male') || field.options.includes('Female')))) {
              // Map any gender/selection field to auxiliaryBody
              if (field.type === 'checkbox' && Array.isArray(fieldValue)) {
                // For checkbox, take the first selected value
                registrationData.auxiliaryBody = fieldValue[0] || '';
              } else {
                registrationData.auxiliaryBody = fieldValue;
              }
            }
          }
        }
      }

      // Generate manual verification code - alphabetic for registration events, numeric for ticket events
      let manualVerificationCode;
      if (event.eventType === 'registration') {
        // Generate 6-character alphabetic code for secured registration events
        manualVerificationCode = Array.from({length: 6}, () => 
          String.fromCharCode(65 + Math.floor(Math.random() * 26))
        ).join('');
      } else {
        // Generate 6-digit numeric code for ticket-based events
        manualVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      }
      
      // Store manual verification code at root level for validation lookup
      registrationData.manualVerificationCode = manualVerificationCode;
      
      // Also store in nested registrationData for compatibility
      registrationData.registrationData = {
        ...formData,
        manualVerificationCode
      };

      // Handle payment data if applicable
      if (event.requiresPayment && event.paymentAmount) {
        registrationData.paymentAmount = event.paymentAmount;
        registrationData.paymentMethod = formData.paymentMethod || 'pending';
        
        // Only online payment (Paystack) is supported - no manual receipt upload
      }

      // Handle face photo upload and AWS registration
      let faceRegistrationData = null;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files?.facePhoto?.[0]) {
        try {
          // Import face recognition service
          const { faceRecognitionService } = await import('../routes/face-recognition-routes');
          
          // Generate unique user ID for face recognition (combination of registration data)
          const faceUserId = `${eventId}_${firstName}_${lastName}_${Date.now()}`.replace(/\s+/g, '_');
          
          // Register face with AWS
          const faceResult = await faceRecognitionService.registerFace(
            files.facePhoto[0].buffer, 
            faceUserId,
            {
              eventId,
              firstName,
              lastName,
              email: formData.email || formData.Email || '',
              registrationTime: new Date().toISOString()
            }
          );
          
          if (faceResult.success) {
            registrationData.facePhotoPath = files.facePhoto[0].path;
            registrationData.awsFaceId = faceResult.faceId;
            registrationData.faceUserId = faceUserId;
            faceRegistrationData = faceResult;
            console.log(`Face registered successfully for ${firstName} ${lastName} with ID: ${faceUserId}`);
          } else {
            console.error('Face registration failed:', faceResult.error);
            // Don't fail registration if face upload fails, just log it
          }
        } catch (faceError) {
          console.error('Error processing face photo:', faceError);
          // Continue with registration even if face processing fails
        }
      }

      // Create registration
      const registration = await mongoStorage.createEventRegistration(registrationData);
      
      // Generate QR code image
      const qrCodeData = JSON.stringify({
        registrationId: registration._id.toString(),
        eventId,
        uniqueId: registration.uniqueId,
        timestamp: Date.now()
      });
      
      const qrImageBase64 = await QRCode.toDataURL(qrCodeData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Update registration with QR code image
      await mongoStorage.updateEventRegistration(registration._id.toString(), {
        qrImage: qrImageBase64,
        qrImageBase64: qrImageBase64.replace('data:image/png;base64,', '')
      });

      // Send success response
      res.status(201).json({
        success: true,
        message: "Registration completed successfully",
        registration: {
          id: registration._id.toString(),
          uniqueId: registration.uniqueId,
          registrationType: registration.registrationType,
          firstName: registration.firstName,
          lastName: registration.lastName,
          email: registration.email,
          status: registration.status,
          paymentStatus: registration.paymentStatus,
          qrCode: registration.qrCode,
          qrImage: qrImageBase64,
          qrImageBase64: qrImageBase64.replace('data:image/png;base64,', ''),
          eventId: registration.eventId.toString(),
          createdAt: registration.createdAt
        },
        qrImage: qrImageBase64,
        qrImageBase64: qrImageBase64.replace('data:image/png;base64,', ''),
        event: {
          name: event.name,
          location: event.location,
          startDate: event.startDate
        }
      });

    } catch (error) {
      console.error("Error registering for event:", error);
      
      // More specific error messages
      if (error.code === 11000) {
        return res.status(400).json({ message: "Duplicate registration detected" });
      }
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err: any) => err.message);
        return res.status(400).json({ message: `Validation failed: ${errors.join(', ')}` });
      }
      
      res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  // Get event registrations
  app.get("/api/events/:eventId/registrations", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventId = req.params.eventId;
      
      const registrations = await mongoStorage.getEventRegistrations(eventId);
      
      const formattedRegistrations = registrations.map(reg => {
        const regObj = reg.toObject();
        return {
          id: regObj._id.toString(),
          eventId: regObj.eventId?.toString(),
          registrationType: regObj.registrationType || 'member',
          firstName: regObj.firstName,
          lastName: regObj.lastName,
          email: regObj.email,
          auxiliaryBody: regObj.auxiliaryBody,
          status: regObj.status || 'registered',
          paymentStatus: regObj.paymentStatus || 'not_required',
          paymentAmount: regObj.paymentAmount,
          paymentReceiptUrl: regObj.paymentReceiptUrl,
          uniqueId: regObj.uniqueId,
          qrCode: regObj.qrCode,
          customData: regObj.customData || {},
          createdAt: regObj.createdAt,
          memberId: regObj.memberId?.toString()
        };
      });

      // Disable caching for registrations to always get fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json(formattedRegistrations);
    } catch (error) {
      console.error("Error getting event registrations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Validate QR code
  app.post("/api/events/:eventId/validate", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { qrCode, registrationId } = req.body;
      
      let registration;
      
      if (registrationId) {
        registration = await mongoStorage.getEventRegistration(registrationId);
      } else if (qrCode) {
        const registrations = await mongoStorage.getEventRegistrations();
        registration = registrations.find(r => r.qrCode === qrCode);
      }
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      // Update attendance status
      const updatedRegistration = await mongoStorage.updateEventRegistration(
        registration._id.toString(),
        { status: 'attended', validatedAt: new Date() }
      );

      res.json({
        id: updatedRegistration!._id.toString(),
        ...updatedRegistration!.toObject(),
        eventId: updatedRegistration!.eventId?.toString(),
        memberId: updatedRegistration!.memberId?.toString()
      });
    } catch (error) {
      console.error("Error validating registration:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ================ FILE UPLOADS ================
  
  // General image upload endpoint (used by event form)
  app.post("/api/upload/image", authenticateToken, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }

      // Import the singleton file storage instance
      const { fileStorage } = await import('./storage-handler');
      
      // Get folder from form data or default
      const folder = req.body.folder || 'general';
      
      // Upload file to Cloudinary or local storage
      const uploadedFile = await fileStorage.saveFile(req.file, folder);

      res.json({
        success: true,
        url: uploadedFile.url,
        publicId: uploadedFile.publicId || uploadedFile.filename,
        message: "Image uploaded successfully"
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Upload event image
  app.post("/api/events/:eventId/upload-image", authenticateToken, upload.single('eventImage'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }

      const eventId = req.params.eventId;
      
      // Initialize file storage handler
      const fileStorage = new FileStorageHandler();
      await fileStorage.initialize();
      
      // Upload file to Cloudinary or local storage
      const uploadedFile = await fileStorage.saveFile(req.file, 'event-images');
      
      // Update event with image URL
      const updatedEvent = await mongoStorage.updateEvent(eventId, {
        eventImage: uploadedFile.url
      });

      if (!updatedEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json({
        success: true,
        message: "Event image uploaded successfully",
        imageUrl: uploadedFile.url,
        event: {
          id: updatedEvent._id.toString(),
          ...updatedEvent.toObject(),
          organizationId: updatedEvent.organizationId?.toString(),
          createdBy: updatedEvent.createdBy?.toString()
        }
      });
    } catch (error) {
      console.error("Error uploading event image:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Upload CSV file
  app.post("/api/events/:eventId/upload-csv", authenticateToken, upload.single('csvFile'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const eventId = req.params.eventId;
      
      // Update event with CSV file path
      await mongoStorage.updateEvent(eventId, {
        csvData: req.file.path
      });

      res.json({ 
        message: "CSV file uploaded successfully",
        fileName: req.file.originalname,
        filePath: req.file.path
      });
    } catch (error) {
      console.error("Error uploading CSV:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upload face photo
  app.post("/api/events/:eventId/upload-face-photo", authenticateToken, upload.single('facePhoto'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const eventId = req.params.eventId;
      
      // Update event with face photo path (store in event's csvData for now)
      await mongoStorage.updateEvent(eventId, {
        csvData: req.file.path
      });

      res.json({ 
        message: "Face photo uploaded successfully",
        fileName: req.file.originalname,
        filePath: req.file.path
      });
    } catch (error) {
      console.error("Error uploading face photo:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ================ PAYMENT ENDPOINTS ================
  
  // Initialize payment for existing registration (PaymentForm component)
  app.post("/api/payment/initialize", async (req: Request, res: Response) => {
    try {
      const { registrationId, amount, email } = req.body;
      
      // Handle existing registration payment
      if (registrationId) {
        // Validate required fields
        if (!registrationId || !email) {
          return res.status(400).json({ 
            message: "Registration ID and email are required" 
          });
        }

        // Get registration details
        const registration = await mongoStorage.getEventRegistration(registrationId);
        if (!registration) {
          return res.status(404).json({ message: "Registration not found" });
        }

        // Get event details
        const event = await mongoStorage.getEvent(registration.eventId);
        if (!event) {
          return res.status(404).json({ message: "Event not found" });
        }

        // Validate payment is required
        if (!event.paymentSettings?.requiresPayment) {
          return res.status(400).json({ message: "Payment not required for this event" });
        }

        // Get payment amount
        const amountInNaira = amount || parseFloat(event.paymentSettings.amount?.toString() || '5000');
        const amountInKobo = Math.round(amountInNaira * 100);
        
        // Generate payment reference
        const paymentReference = `REG_${Date.now()}_${nanoid(8)}`;

        // Get organization to check for subaccount
        const organization = await mongoStorage.getOrganization(event.organizationId);
        
        // Prepare metadata for Paystack
        const metadata = {
          registrationId: registration._id.toString(),
          eventId: event._id.toString(),
          registrationType: registration.registrationType,
          type: 'existing_registration_payment',
          eventName: event.name,
          userEmail: email,
          firstName: registration.firstName,
          lastName: registration.lastName,
          custom_fields: [
            {
              display_name: "Event",
              variable_name: "event_name",
              value: event.name
            },
            {
              display_name: "Registration Type", 
              variable_name: "registration_type",
              value: registration.registrationType
            }
          ]
        };

        // Import paystack module
        const { initializePaystackPayment } = await import('./paystack');

        // Get current platform fee from settings
        const platformSettings = await mongoStorage.getPlatformSettings();
        const platformFeeRate = platformSettings.platformFee || 2;

        // Initialize payment with Paystack
        // Temporarily disable subaccount to fix split configuration error
        const paymentResponse = await initializePaystackPayment(
          email,
          amountInKobo,
          paymentReference,
          metadata,
          undefined, // subaccountCode - disabled temporarily
          undefined, // splitConfig - not needed for basic payments  
          undefined  // platformFeePercentage - disabled temporarily
        );

        if (paymentResponse.status) {
          // Update registration with payment reference
          await mongoStorage.updateEventRegistration(registrationId, {
            paymentReference,
            paymentAmount: amountInNaira,
            paymentCurrency: 'NGN'
          });

          res.json({
            success: true,
            data: {
              authorization_url: paymentResponse.data.authorization_url,
              access_code: paymentResponse.data.access_code,
              reference: paymentReference
            },
            registrationId: registration._id.toString(),
            message: "Payment initialized successfully"
          });
        } else {
          console.error("Paystack initialization failed:", paymentResponse);
          res.status(400).json({
            success: false,
            message: paymentResponse.message || "Payment initialization failed"
          });
        }
        return;
      }

      // Handle new registration payment (original code)
      const { eventId, email: userEmail, registrationData } = req.body;
      
      // Validate required fields
      if (!eventId || !userEmail) {
        return res.status(400).json({ 
          message: "Event ID, email are required" 
        });
      }

      // Get event details
      const event = await mongoStorage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Validate payment is required
      if (!event.paymentSettings?.requiresPayment) {
        return res.status(400).json({ message: "Payment not required for this event" });
      }

      // Get payment rule for registration type
      const registrationType = registrationData.registrationType || 'member';
      
      // Check if payment is required for this registration type
      let amountInNaira = 0;
      if (event.paymentSettings.paymentRules && typeof event.paymentSettings.paymentRules === 'object') {
        // Check if this registration type requires payment
        if (event.paymentSettings.paymentRules[registrationType] === true) {
          amountInNaira = parseFloat(event.paymentSettings.amount?.toString() || '5000');
        } else if (typeof event.paymentSettings.paymentRules[registrationType] === 'object') {
          amountInNaira = parseFloat(event.paymentSettings.paymentRules[registrationType].amount?.toString() || '5000');
        } else {
          return res.status(400).json({ 
            message: `Payment not required for ${registrationType} registration` 
          });
        }
      } else {
        // Fallback to general amount
        amountInNaira = parseFloat(event.paymentSettings.amount?.toString() || '5000');
      }

      if (amountInNaira <= 0) {
        return res.status(400).json({ 
          message: `Invalid payment amount for ${registrationType} registration` 
        });
      }

      // Get organization to check for subaccount
      const organization = await mongoStorage.getOrganization(event.organizationId.toString());
      
      // Calculate amount in kobo (Paystack uses kobo for NGN)
      const amountInKobo = Math.round(amountInNaira * 100);
      
      // Generate unique identifiers for registration
      const uniqueId = `${registrationType.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const qrCode = nanoid(16);
      const paymentReference = `REG_${Date.now()}_${nanoid(8)}`;

      // Helper function to split FullName into firstName and lastName  
      const splitFullName = (fullName: string) => {
        if (!fullName || typeof fullName !== 'string') return { firstName: '', lastName: '' };
        const parts = fullName.trim().split(' ');
        return {
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || ''
        };
      };

      // Extract firstName and lastName, handling FullName fields
      let firstName = registrationData.firstName || registrationData.FirstName || '';
      let lastName = registrationData.lastName || registrationData.LastName || '';
      
      // If we don't have both firstName and lastName but have a FullName field, split it
      if ((!firstName || !lastName) && (registrationData.FullName || registrationData.fullName || registrationData.full_name)) {
        const fullName = registrationData.FullName || registrationData.fullName || registrationData.full_name;
        const splitName = splitFullName(fullName);
        firstName = firstName || splitName.firstName;
        lastName = lastName || splitName.lastName;
      }
      
      // Ensure we always have at least empty strings for firstName and lastName
      firstName = firstName || '';
      lastName = lastName || '';

      // Create pending registration record first (like ticket creation)
      const registrationRecord = {
        eventId: new mongoose.Types.ObjectId(eventId),
        registrationType,
        uniqueId,
        qrCode,
        status: 'pending',
        paymentStatus: 'pending',
        paymentReference,
        paymentAmount: amountInNaira,
        paymentCurrency: 'NGN',
        attendanceStatus: 'registered',
        createdAt: new Date(),
        // Extract standard fields from custom field data with FullName handling
        firstName,
        lastName,
        email: registrationData.email || registrationData.Email || userEmail,
        phone: registrationData.phone || registrationData.Phone || '',
        // Store the complete registration data as required by schema
        registrationData: registrationData,
        // Store all custom field data
        customFieldData: {}
      };

      // Process custom fields
      if (event.customRegistrationFields) {
        for (const field of event.customRegistrationFields) {
          const fieldValue = registrationData[field.name];
          if (fieldValue !== undefined) {
            registrationRecord.customFieldData[field.name] = fieldValue;
            
            // Also set standard fields if they match
            if (field.name === 'firstName' || field.name === 'FirstName') {
              registrationRecord.firstName = fieldValue;
            } else if (field.name === 'lastName' || field.name === 'LastName') {
              registrationRecord.lastName = fieldValue;
            } else if (field.name === 'FullName' || field.name === 'fullName' || field.name === 'full_name') {
              // Handle FullName fields by splitting them
              const splitName = splitFullName(fieldValue);
              // Only overwrite if we don't already have better values
              if (!registrationRecord.firstName || registrationRecord.firstName === '') {
                registrationRecord.firstName = splitName.firstName;
              }
              if (!registrationRecord.lastName || registrationRecord.lastName === '') {
                registrationRecord.lastName = splitName.lastName;
              }
            } else if (field.name === 'email' || field.name === 'Email') {
              registrationRecord.email = fieldValue;
            } else if (field.name === 'phone' || field.name === 'Phone') {
              registrationRecord.phone = fieldValue;
            }
          }
        }
      }

      // Create the pending registration
      const registration = await mongoStorage.createEventRegistration(registrationRecord);
      
      // Prepare metadata for Paystack
      const metadata = {
        registrationId: registration._id.toString(),
        eventId,
        registrationType,
        type: 'event_registration',
        eventName: event.name,
        userEmail: userEmail,
        firstName: registrationRecord.firstName,
        lastName: registrationRecord.lastName,
        custom_fields: [
          {
            display_name: "Event",
            variable_name: "event_name",
            value: event.name
          },
          {
            display_name: "Registration Type", 
            variable_name: "registration_type",
            value: registrationType
          }
        ]
      };

      // Import paystack module
      const { initializePaystackPayment } = await import('./paystack');

      // Get current platform fee from settings
      const platformSettings = await mongoStorage.getPlatformSettings();
      const platformFeeRate = platformSettings.platformFee || 2;

      // Initialize payment with Paystack (same pattern as ticket purchase)
      // Temporarily disable subaccount to fix split configuration error
      const paymentResponse = await initializePaystackPayment(
        userEmail,
        amountInKobo,
        paymentReference,
        metadata,
        undefined, // subaccountCode - disabled temporarily
        undefined, // splitConfig - not needed for basic payments
        undefined  // platformFeePercentage - disabled temporarily
      );

      if (paymentResponse.status) {
        // Update registration with payment reference
        await mongoStorage.updateEventRegistration(registration._id.toString(), {
          paymentReference: paymentReference
        });
        
        res.json({
          success: true,
          data: {
            authorization_url: paymentResponse.data.authorization_url,
            access_code: paymentResponse.data.access_code,
            reference: paymentReference
          },
          registrationId: registration._id.toString(),
          message: "Payment initialized successfully"
        });
      } else {
        // Delete registration if payment initialization failed
        await mongoStorage.deleteEventRegistration(registration._id.toString());
        console.error("Paystack initialization failed:", paymentResponse);
        res.status(400).json({
          success: false,
          message: paymentResponse.message || "Payment initialization failed"
        });
      }

    } catch (error) {
      console.error("Payment initialization error:", error);
      res.status(500).json({ 
        success: false,
        message: "Payment initialization failed: " + error.message 
      });
    }
  });



  // Payment verification route commented out - now handled in payment-routes.ts
  /*
  app.get("/api/payment/verify/:reference", async (req: Request, res: Response) => {
    try {
      const { reference } = req.params;
      console.log(`Verifying payment with reference: ${reference}`);

      // Verify payment with Paystack
      const { verifyPaystackPayment } = await import('./paystack');
      const verificationData = await verifyPaystackPayment(reference);
      console.log('Paystack verification response:', JSON.stringify(verificationData, null, 2));

      if (verificationData.status && verificationData.data.status === 'success') {
        const metadata = verificationData.data.metadata;
        const eventId = metadata.eventId;
        const amount = verificationData.data.amount / 100; // Convert from kobo
        const currency = verificationData.data.currency;

        // Find the existing registration by payment reference
        const existingRegistrations = await mongoStorage.getEventRegistrations(eventId);
        const registration = existingRegistrations.find(reg => reg.paymentReference === reference);
        
        if (!registration) {
          console.log(`No registration found for payment reference: ${reference}`);
          return res.status(404).json({ 
            success: false,
            message: "Registration not found for this payment reference" 
          });
        }

        console.log(`Found registration:`, registration);

        // Update the existing registration to mark payment as completed
        const updatedRegistration = await mongoStorage.updateEventRegistration(registration._id!.toString(), {
          paymentStatus: 'paid',
          status: 'active',
          paymentAmount: amount,
          paymentMethod: 'paystack',
        });

        if (!updatedRegistration) {
          return res.status(500).json({ 
            success: false,
            message: "Failed to update registration" 
          });
        }

        // Get event details for notifications
        const event = await mongoStorage.getEvent(eventId);
        if (event) {
          // Send payment notification to organization admin
          await NotificationService.createPaymentNotification(
            event.organizationId.toString(),
            eventId,
            amount,
            currency,
            updatedRegistration.firstName + ' ' + updatedRegistration.lastName,
            'event_registration'
          );

          // Send registration notification
          await NotificationService.createRegistrationNotification(
            event.organizationId.toString(),
            eventId,
            updatedRegistration._id!.toString(),
            updatedRegistration.firstName + ' ' + updatedRegistration.lastName,
            updatedRegistration.registrationType || 'member'
          );
        }

        res.json({
          success: true,
          message: "Payment verified and registration completed",
          registration: {
            id: updatedRegistration._id!.toString(),
            ...updatedRegistration.toObject()
          }
        });
      } else {
        console.log('Payment verification failed:', verificationData);
        res.status(400).json({
          success: false,
          message: "Payment verification failed",
          details: verificationData
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ 
        message: "Payment verification failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  */

  // Initialize ticket purchase payment
  app.post("/api/tickets/initialize-payment", async (req: Request, res: Response) => {
    try {
      const { ticketId } = req.body;

      if (!ticketId) {
        return res.status(400).json({ message: "Ticket ID is required" });
      }

      // Get ticket details
      const ticket = await mongoStorage.getTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Get event details
      const event = await mongoStorage.getEventById(ticket.eventId.toString());
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if ticket is already paid
      if (ticket.paymentStatus === 'paid') {
        return res.status(400).json({ message: "Ticket is already paid" });
      }

      // Initialize Paystack payment
      const { initializePaystackPayment } = await import('./paystack');
      const { nanoid } = await import('nanoid');
      
      // Get organization to check for subaccount and platform fee
      const organization = await mongoStorage.getOrganization(event.organizationId.toString());
      
      // Get current platform fee from settings
      const platformSettings = await mongoStorage.getPlatformSettings();
      const platformFeeRate = platformSettings.platformFee || 2;
      
      const reference = `TKT_${Date.now()}_${nanoid(8)}`;
      const amount = ticket.price * 100; // Convert to kobo
      
      const paymentData = await initializePaystackPayment(
        ticket.ownerEmail,
        amount,
        reference,
        {
          ticketId: ticket._id.toString(),
          eventId: ticket.eventId.toString(),
          eventName: event.name,
          ticketNumber: ticket.ticketNumber,
          type: 'ticket_purchase'
        },
        organization?.paystackSubaccountCode || undefined,
        undefined, // splitConfig - not needed for basic payments
        platformFeeRate // Dynamic platform fee from settings
      );

      if (paymentData.status) {
        // Update ticket with payment reference
        await mongoStorage.updateTicket(ticket._id.toString(), {
          paymentReference: reference
        });

        res.json({
          success: true,
          authorization_url: paymentData.data.authorization_url,
          reference: paymentData.data.reference
        });
      } else {
        console.error("Payment initialization failed:", paymentData);
        res.status(400).json({ 
          message: paymentData.message || "Payment initialization failed" 
        });
      }
    } catch (error) {
      console.error("Ticket payment initialization error:", error);
      res.status(500).json({ message: "Ticket payment initialization failed" });
    }
  });

  // Verify ticket payment
  app.get("/api/tickets/verify-payment/:reference", async (req: Request, res: Response) => {
    try {
      const { reference } = req.params;

      // Verify payment with Paystack
      const { verifyPaystackPayment } = await import('./paystack');
      const verificationData = await verifyPaystackPayment(reference);

      if (verificationData.status && verificationData.data.status === 'success') {
        const metadata = verificationData.data.metadata;
        const ticketId = metadata.ticketId;
        const amount = verificationData.data.amount / 100; // Convert from kobo

        // Update ticket payment status
        const updatedTicket = await mongoStorage.updateTicket(ticketId, {
          paymentStatus: 'paid',
          paymentReference: reference,
          status: 'paid'
        });

        if (!updatedTicket) {
          return res.status(404).json({ message: "Ticket not found" });
        }

        // Get event details for notification
        const event = await mongoStorage.getEventById(updatedTicket.eventId.toString());
        if (event) {
          // Send payment notification to organization admin
          await NotificationService.createPaymentNotification(
            event.organizationId.toString(),
            event._id.toString(),
            amount,
            updatedTicket.currency,
            updatedTicket.ownerName,
            'ticket_purchase'
          );
        }

        res.json({
          success: true,
          message: "Payment verified successfully",
          ticket: {
            id: updatedTicket._id.toString(),
            ...updatedTicket.toObject()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Payment verification failed"
        });
      }
    } catch (error) {
      console.error("Ticket payment verification error:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  // Manual payment verification (for receipt uploads)
  app.post("/api/payment/verify-manual", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { registrationId, status = 'paid' } = req.body;

      if (!registrationId) {
        return res.status(400).json({ message: "Registration ID is required" });
      }

      // Update registration payment status
      const updatedRegistration = await mongoStorage.updateEventRegistration(registrationId, {
        paymentStatus: status,
        paymentMethod: 'manual',
        status: status === 'paid' ? 'confirmed' : 'pending'
      });

      if (!updatedRegistration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      // Get event details for notification
      const event = await mongoStorage.getEventById(updatedRegistration.eventId.toString());
      if (event && status === 'paid') {
        // Send payment notification
        await NotificationService.createPaymentNotification(
          event.organizationId.toString(),
          event._id.toString(),
          updatedRegistration.paymentAmount || 0,
          updatedRegistration.paymentCurrency || 'NGN',
          updatedRegistration.firstName + ' ' + updatedRegistration.lastName,
          'event_registration'
        );
      }

      res.json({ 
        message: `Payment ${status} successfully`,
        registration: {
          id: updatedRegistration._id.toString(),
          ...updatedRegistration.toObject()
        }
      });
    } catch (error) {
      console.error('Manual payment verification error:', error);
      res.status(500).json({ message: "Payment verification failed" });
    }
  });

  // Manual payment verification for tickets
  app.post("/api/tickets/verify-manual", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketId, status = 'paid' } = req.body;

      if (!ticketId) {
        return res.status(400).json({ message: "Ticket ID is required" });
      }

      // Get ticket details first
      const ticket = await mongoStorage.getTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Generate QR code data and image for manual payments when status is paid
      let updateData: any = {
        paymentStatus: status,
        paymentMethod: 'manual',
        status: status === 'paid' ? 'paid' : 'pending'
      };

      if (status === 'paid') {
        // Generate QR code data for the paid ticket
        const qrData = {
          ticketId: ticket._id.toString(),
          ticketNumber: ticket.ticketNumber,
          eventId: ticket.eventId.toString(),
          timestamp: Date.now()
        };

        const QRCode = await import('qrcode');
        const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData), {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        updateData.qrCodeImage = qrCodeImage;
      }

      // Update ticket payment status
      const updatedTicket = await mongoStorage.updateTicket(ticketId, updateData);

      if (!updatedTicket) {
        return res.status(404).json({ message: "Failed to update ticket" });
      }

      // Get event details for notification
      const event = await mongoStorage.getEventById(updatedTicket.eventId.toString());
      if (event && status === 'paid') {
        // Send payment notification
        await NotificationService.createPaymentNotification(
          event.organizationId.toString(),
          event._id.toString(),
          updatedTicket.price || 0,
          updatedTicket.currency || 'NGN',
          updatedTicket.ownerName,
          'ticket_purchase'
        );
      }

      res.json({ 
        message: `Ticket payment ${status} successfully`,
        ticket: {
          id: updatedTicket._id.toString(),
          ...updatedTicket.toObject()
        }
      });
    } catch (error) {
      console.error('Manual ticket payment verification error:', error);
      res.status(500).json({ message: "Ticket payment verification failed" });
    }
  });

  // Test notification endpoint (for demonstration)
  app.post("/api/notifications/create-test", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Create a test payment notification
      const notification = await NotificationService.createNotification({
        organizationId: userId,
        recipientId: userId,
        type: 'payment_received',
        title: 'Payment Received - NGN5,000',
        message: 'John Doe has made a payment of NGN5,000 for Annual Conference 2025. This is a demonstration of the automatic payment notification system.',
        priority: 'high',
        category: 'payments',
        actionUrl: '/dashboard',
        actionLabel: 'View Dashboard',
        data: {
          eventName: 'Annual Conference 2025',
          paymentAmount: 5000,
          currency: 'NGN',
          payerName: 'John Doe'
        }
      });

      res.json({ 
        message: "Test notification created successfully",
        notification: {
          id: notification._id.toString(),
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        }
      });
    } catch (error) {
      console.error("Error creating test notification:", error);
      res.status(500).json({ message: "Failed to create test notification" });
    }
  });

  // ================ ADDITIONAL ENDPOINTS ================

  // ================ ORGANIZATION MANAGEMENT ================
  
  // Register organization
  app.post("/api/organizations/register", async (req: Request, res: Response) => {
    try {
      const organizationData = {
        ...req.body,
        status: 'pending',
        createdAt: new Date()
      };

      const organization = await mongoStorage.createOrganization(organizationData);
      
      res.status(201).json({
        id: organization._id.toString(),
        ...organization.toObject()
      });
    } catch (error) {
      console.error("Error registering organization:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get organizations
  app.get("/api/organizations", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizations = await mongoStorage.getOrganizations();
      
      const formattedOrganizations = organizations.map(org => ({
        id: org._id.toString(),
        ...org.toObject()
      }));

      res.json(formattedOrganizations);
    } catch (error) {
      console.error("Error getting organizations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Ticket Purchase API (MongoDB-based)
  app.post("/api/tickets/purchase", async (req: Request, res: Response) => {
    try {
      const { eventId, ownerEmail, ownerPhone, ticketCategoryId, paymentMethod } = req.body;
      
      if (!eventId || !ownerEmail || !ticketCategoryId || !paymentMethod) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Generate owner name from email if not provided (for privacy)
      const ownerName = ownerEmail.split('@')[0];

      // Get event details
      const event = await mongoStorage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.eventType !== "ticket") {
        return res.status(400).json({ message: "This is not a ticket-based event" });
      }

      // Check if ticket sales are open
      const now = new Date();
      const registrationStart = new Date(event.registrationStartDate || event.startDate);
      const registrationEnd = new Date(event.registrationEndDate || event.endDate || event.startDate);

      if (now < registrationStart) {
        return res.status(400).json({ message: "Ticket sales haven't started yet" });
      }

      if (now > registrationEnd) {
        return res.status(400).json({ message: "Ticket sales have ended" });
      }

      // Find the selected ticket category
      const ticketCategory = event.ticketCategories?.find(cat => cat.id === ticketCategoryId);
      if (!ticketCategory) {
        return res.status(400).json({ message: "Invalid ticket category selected" });
      }

      if (!ticketCategory.available) {
        return res.status(400).json({ message: "This ticket category is no longer available" });
      }

      // Generate ticket data
      const ticketNumber = `TKT${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      // Generate QR code data
      const qrData = {
        eventId,
        ticketNumber,
        ownerEmail,
        issuedAt: new Date().toISOString()
      };

      const QRCode = await import('qrcode');
      const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData));

      // Create ticket record
      const ticketData = {
        eventId: new mongoose.Types.ObjectId(eventId),
        organizationId: new mongoose.Types.ObjectId(event.organizationId),
        ownerEmail,
        ownerPhone: ownerPhone || '',
        ownerName,
        ticketNumber,
        category: ticketCategory.name,
        price: ticketCategory.price,
        currency: ticketCategory.currency,
        status: "pending",
        paymentStatus: paymentMethod === "manual" ? "pending" : "pending",
        paymentMethod,
        qrCode: qrCodeImage,
        qrCodeImage: paymentMethod === "manual" ? qrCodeImage : undefined, // Provide QR image for manual payments immediately
        transferHistory: []
      };

      const ticket = await mongoStorage.createTicket(ticketData);

      if (paymentMethod === "paystack" && ticketCategory.price > 0) {
        // Initialize Paystack payment
        const { initializePaystackPayment } = await import('./paystack');
        const { nanoid } = await import('nanoid');
        
        const reference = `TKT_${Date.now()}_${nanoid(8)}`;
        const amount = ticketCategory.price * 100; // Convert to kobo

        try {
          const paymentData = await initializePaystackPayment(
            ownerEmail,
            amount,
            reference,
            {
              ticketId: ticket._id.toString(),
              eventId,
              ticketCategoryId,
              ticketNumber,
              ownerName,
              eventName: event.name,
              type: 'ticket_purchase'
            }
          );

          if (paymentData.status) {
            // Update ticket with payment reference
            await mongoStorage.updateTicket(ticket._id.toString(), {
              paymentReference: reference
            });

            res.json({
              ticketId: ticket._id.toString(),
              paymentUrl: paymentData.data.authorization_url,
              reference,
            });
          } else {
            // Delete ticket if payment initialization failed
            await mongoStorage.deleteTicket(ticket._id.toString());
            res.status(400).json({ message: "Payment initialization failed" });
          }
        } catch (paymentError) {
          // Delete ticket if payment initialization failed
          await mongoStorage.deleteTicket(ticket._id.toString());
          console.error("Payment initialization error:", paymentError);
          res.status(500).json({ message: "Payment initialization failed" });
        }
      } else {
        // For manual payment or free tickets
        res.json({
          ticketId: ticket._id.toString(),
          message: paymentMethod === "manual" ? "Ticket reserved. Complete payment to activate." : "Free ticket created successfully.",
        });
      }
    } catch (error) {
      console.error("Ticket purchase error:", error);
      res.status(500).json({ message: "Failed to purchase ticket" });
    }
  });

  // Payment callback endpoint (Paystack redirects here after payment)
  app.get("/payment/callback", async (req: Request, res: Response) => {
    try {
      const { reference, trxref } = req.query;
      const paymentReference = reference || trxref;

      if (!paymentReference) {
        return res.redirect("/payment/failed?error=missing_reference");
      }

      // Verify payment with Paystack
      const { verifyPaystackPayment } = await import('./paystack');
      const verificationData = await verifyPaystackPayment(paymentReference as string);

      if (verificationData.status && verificationData.data.status === 'success') {
        const metadata = verificationData.data.metadata;
        const amount = verificationData.data.amount / 100; // Convert from kobo

        if (metadata.type === 'ticket_purchase') {
          // Handle ticket purchase payment
          const ticketId = metadata.ticketId;
          
          // Get the ticket first to access its data
          const ticket = await mongoStorage.getTicketById(ticketId);
          if (!ticket) {
            return res.redirect("/payment/failed?error=ticket_not_found");
          }

          // Generate QR code image for the ticket
          const qrCodeData = JSON.stringify({
            ticketId: ticket._id.toString(),
            ticketNumber: ticket.ticketNumber,
            eventId: ticket.eventId.toString(),
            timestamp: Date.now()
          });
          
          const QRCode = await import('qrcode');
          const qrImageBase64 = await QRCode.toDataURL(qrCodeData, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });

          // Update ticket payment status and add QR code image
          const updatedTicket = await mongoStorage.updateTicket(ticketId, {
            paymentStatus: 'paid',
            paymentReference: paymentReference as string,
            status: 'paid',
            qrCodeImage: qrImageBase64
          });

          if (updatedTicket) {
            // Get event details for notification
            const event = await mongoStorage.getEvent(updatedTicket.eventId.toString());
            if (event) {
              // Send payment notification to organization admin
              await NotificationService.createPaymentNotification(
                event.organizationId.toString(),
                event._id.toString(),
                amount,
                updatedTicket.currency,
                updatedTicket.ownerName,
                'ticket_purchase'
              );
            }

            // Redirect to ticket success page with QR code
            const encodedQRCode = encodeURIComponent(qrImageBase64);
            return res.redirect(`/payment/success?type=ticket&ticketId=${ticketId}&ticketNumber=${encodeURIComponent(updatedTicket.ticketNumber)}&qrCode=${encodedQRCode}&eventName=${encodeURIComponent(event?.name || 'Event')}&ownerName=${encodeURIComponent(updatedTicket.ownerName)}`);
          }
        } else if (metadata.type === 'event_registration' && metadata.registrationId) {
          // Handle event registration payment
          const registrationId = metadata.registrationId;
          const eventId = metadata.eventId;
          
          // Find the existing pending registration
          const registration = await mongoStorage.getEventRegistration(registrationId);
          
          if (registration) {
            // Generate QR code for the confirmed registration
            const qrCodeData = JSON.stringify({
              registrationId: registration._id.toString(),
              eventId,
              uniqueId: registration.uniqueId,
              timestamp: Date.now()
            });
            
            const QRCode = await import('qrcode');
            const qrImageBase64 = await QRCode.toDataURL(qrCodeData, {
              width: 200,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });

            // Update registration payment status
            await mongoStorage.updateEventRegistration(registration._id.toString(), {
              paymentStatus: 'completed',
              status: 'confirmed',
              paymentVerifiedAt: new Date(),
              paymentReference: paymentReference as string,
              qrCodeImage: qrImageBase64
            });

            // Get event details for notification
            const event = await mongoStorage.getEvent(eventId);
            if (event) {
              // Send registration notification
              await NotificationService.createRegistrationNotification(
                event.organizationId.toString(),
                eventId,
                registration._id!.toString(),
                registration.firstName + ' ' + registration.lastName,
                registration.registrationType || 'member'
              );
            }

            // Generate manual verification code - alphabetic for registration events, numeric for ticket events
            let shortCode;
            // Reuse the event variable that was already fetched above
            if (event && event.eventType === 'registration') {
              // Generate 6-character alphabetic code for secured registration events
              shortCode = Array.from({length: 6}, () => 
                String.fromCharCode(65 + Math.floor(Math.random() * 26))
              ).join('');
            } else {
              // Generate 6-digit numeric code for ticket-based events
              shortCode = Math.floor(100000 + Math.random() * 900000).toString();
            }
            
            // Update registration with short verification code
            await mongoStorage.updateEventRegistration(registration._id.toString(), {
              manualVerificationCode: shortCode
            });

            // Use the same event variable for redirect data
            const eventName = event ? encodeURIComponent(event.name) : '';
            const eventLocation = event ? encodeURIComponent(event.location || 'TBD') : '';
            const eventDate = event ? event.startDate?.toISOString() : '';

            // Redirect to registration success page with all data
            const successUrl = `/payment/success?type=registration&registrationId=${registrationId}&eventId=${eventId}&uniqueId=${encodeURIComponent(registration.uniqueId)}&firstName=${encodeURIComponent(registration.firstName)}&lastName=${encodeURIComponent(registration.lastName)}&email=${encodeURIComponent(registration.email)}&qrCodeImage=${encodeURIComponent(qrImageBase64)}&shortCode=${shortCode}&eventName=${eventName}&eventLocation=${eventLocation}&eventDate=${encodeURIComponent(eventDate)}`;
            return res.redirect(successUrl);
          }
        } else if (metadata.type === 'event_registration_legacy') {
          // Handle legacy event registration payment (fallback)
          const eventId = metadata.eventId;
          const userEmail = metadata.userEmail;
          const registrationData = JSON.parse(metadata.registrationData || '{}');
          
          // Generate registration ID and QR code
          const registrationId = `REG${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
          
          const qrData = {
            eventId,
            registrationId,
            userEmail,
            issuedAt: new Date().toISOString()
          };

          const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData));

          // Create registration with payment data
          const registration = await mongoStorage.createEventRegistration({
            ...registrationData,
            eventId,
            registrationId,
            paymentStatus: 'paid',
            paymentReference: paymentReference as string,
            paymentAmount: amount,
            paymentCurrency: 'NGN',
            qrCode: qrCodeImage,
            status: 'confirmed',
            paymentMethod: 'paystack',
            createdAt: new Date()
          });

          // Get event details
          const event = await mongoStorage.getEvent(eventId);
          if (event) {
            // Send payment notification to organization admin
            await NotificationService.createPaymentNotification(
              event.organizationId.toString(),
              eventId,
              amount,
              'NGN',
              registrationData.firstName + ' ' + registrationData.lastName,
              'event_registration'
            );

            // Send registration notification
            await NotificationService.createRegistrationNotification(
              event.organizationId.toString(),
              eventId,
              registration._id.toString(),
              registrationData.firstName + ' ' + registrationData.lastName,
              registrationData.registrationType || 'member'
            );
          }

          // Redirect to registration success page
          return res.redirect(`/payment/success?type=registration&registrationId=${registration._id.toString()}&eventId=${eventId}`);
        } else if (metadata.type === 'existing_registration_payment') {
          // Handle existing registration payment
          const registrationId = metadata.registrationId;
          const eventId = metadata.eventId;
          
          // Get the existing registration
          const registration = await mongoStorage.getEventRegistration(registrationId);
          if (!registration) {
            return res.redirect("/payment/failed?error=registration_not_found");
          }

          // Update registration payment status
          await mongoStorage.updateEventRegistration(registrationId, {
            paymentStatus: 'paid',
            paymentReference: paymentReference as string,
            paymentAmount: amount.toString(),
            paymentCurrency: 'NGN',
            paymentVerifiedAt: new Date()
          });

          // Generate QR code for the registration if not already present
          let qrImageBase64 = registration.qrCodeImage;
          if (!qrImageBase64) {
            const qrCodeData = JSON.stringify({
              registrationId: registration._id.toString(),
              eventId,
              uniqueId: registration.uniqueId,
              timestamp: Date.now()
            });
            
            const QRCode = await import('qrcode');
            qrImageBase64 = await QRCode.toDataURL(qrCodeData, {
              width: 200,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });

            // Update registration with QR code
            await mongoStorage.updateEventRegistration(registrationId, {
              qrCodeImage: qrImageBase64
            });
          }

          // Generate manual verification code if not already present
          let shortCode = registration.manualVerificationCode;
          if (!shortCode) {
            shortCode = Array.from({length: 6}, () => 
              String.fromCharCode(65 + Math.floor(Math.random() * 26))
            ).join('');
            
            // Update registration with short verification code
            await mongoStorage.updateEventRegistration(registrationId, {
              manualVerificationCode: shortCode
            });
          }

          // Get event details for notification and redirect
          const event = await mongoStorage.getEvent(eventId);
          if (event) {
            // Send payment notification to organization admin
            await NotificationService.createPaymentNotification(
              event.organizationId.toString(),
              eventId,
              amount,
              'NGN',
              `${registration.firstName} ${registration.lastName}`,
              'existing_registration_payment'
            );
          }

          // Prepare event data for redirect (same format as other registration success redirects)
          const eventName = event ? encodeURIComponent(event.name) : '';
          const eventLocation = event ? encodeURIComponent(event.location || 'TBD') : '';
          const eventDate = event ? event.startDate?.toISOString() : '';

          // Redirect to registration success page with complete data
          const successUrl = `/payment/success?type=registration&registrationId=${registrationId}&eventId=${eventId}&uniqueId=${encodeURIComponent(registration.uniqueId)}&firstName=${encodeURIComponent(registration.firstName)}&lastName=${encodeURIComponent(registration.lastName)}&email=${encodeURIComponent(registration.email)}&qrCodeImage=${encodeURIComponent(qrImageBase64)}&shortCode=${shortCode}&eventName=${eventName}&eventLocation=${eventLocation}&eventDate=${encodeURIComponent(eventDate)}`;
          return res.redirect(successUrl);
        }
      }

      // Payment verification failed
      res.redirect("/payment/failed?error=verification_failed");
    } catch (error) {
      console.error("Payment callback error:", error);
      res.redirect("/payment/failed?error=system_error");
    }
  });

  // Get registration details directly by ID (fallback endpoint)
  app.get("/api/registrations/:registrationId", async (req: Request, res: Response) => {
    try {
      const { registrationId } = req.params;
      
      const registration = await mongoStorage.getEventRegistration(registrationId);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      // Get event details
      const event = await mongoStorage.getEvent(registration.eventId.toString());
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json({
        id: registration._id.toString(),
        registrationId: registration.registrationId,
        uniqueId: registration.uniqueId,
        firstName: registration.firstName,
        lastName: registration.lastName,
        email: registration.email,
        phone: registration.phone,
        status: registration.status,
        paymentStatus: registration.paymentStatus,
        qrCode: registration.qrCode,
        qrCodeImage: registration.qrCodeImage,
        registrationType: registration.registrationType,
        paymentReference: registration.paymentReference,
        paymentAmount: registration.paymentAmount,
        event: {
          id: event._id.toString(),
          name: event.name,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate
        },
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt,
        validatedAt: registration.validatedAt
      });
    } catch (error) {
      console.error("Get registration error:", error);
      res.status(500).json({ message: "Failed to get registration" });
    }
  });

  // Get registration details (public endpoint for verification)
  app.get("/api/events/:eventId/registrations/:registrationId", async (req: Request, res: Response) => {
    try {
      const { eventId, registrationId } = req.params;
      
      const registration = await mongoStorage.getEventRegistration(registrationId);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      // Debug logging
      console.log(`Registration eventId: ${registration.eventId.toString()}, URL eventId: ${eventId}`);

      // Verify it belongs to the event
      if (registration.eventId.toString() !== eventId) {
        return res.status(404).json({ message: "Registration not found for this event" });
      }

      // Get event details
      const event = await mongoStorage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json({
        id: registration._id.toString(),
        registrationId: registration.registrationId,
        uniqueId: registration.uniqueId,
        firstName: registration.firstName,
        lastName: registration.lastName,
        email: registration.email,
        phone: registration.phone,
        status: registration.status,
        paymentStatus: registration.paymentStatus,
        qrCode: registration.qrCode,
        qrCodeImage: registration.qrCodeImage,
        registrationType: registration.registrationType,
        paymentReference: registration.paymentReference,
        paymentAmount: registration.paymentAmount,
        event: {
          id: event._id.toString(),
          name: event.name,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate
        },
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt,
        validatedAt: registration.validatedAt
      });
    } catch (error) {
      console.error("Get registration error:", error);
      res.status(500).json({ message: "Failed to get registration" });
    }
  });

  // Duplicate route removed - using the improved version below at line 3072

  // QR Code Scanning and Validation Endpoints
  app.post("/api/scan", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { qrData } = req.body;

      if (!qrData) {
        return res.status(400).json({ message: "QR data is required" });
      }

      let parsedQRData;
      try {
        parsedQRData = JSON.parse(qrData);
      } catch (error) {
        return res.status(400).json({ message: "Invalid QR code format" });
      }

      const { eventId, ticketNumber, registrationId, ownerEmail } = parsedQRData;

      if (!eventId) {
        return res.status(400).json({ message: "Invalid QR code: missing event information" });
      }

      // Get event details
      const event = await mongoStorage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      let validationResult = {
        validationStatus: "invalid",
        message: "Invalid QR code",
        details: null as any
      };

      // Check if it's a ticket-based QR code
      if (ticketNumber && ownerEmail) {
        const ticket = await mongoStorage.getTicketByNumber(ticketNumber);
        
        if (!ticket) {
          return res.json({
            validationStatus: "invalid",
            message: "Ticket not found"
          });
        }

        // Verify ticket belongs to the event
        if (ticket.eventId.toString() !== eventId) {
          return res.json({
            validationStatus: "invalid",
            message: "Ticket does not belong to this event"
          });
        }

        // CRITICAL: Check payment status - this was the main issue
        if (ticket.paymentStatus !== 'paid') {
          return res.json({
            validationStatus: "invalid",
            message: `Payment not completed. Status: ${ticket.paymentStatus}`,
            details: {
              ticketNumber: ticket.ticketNumber,
              status: ticket.paymentStatus,
              ownerName: ticket.ownerName,
              eventName: event.name
            }
          });
        }

        // Check if ticket is already used (if using attendance tracking)
        if (ticket.status === 'used') {
          return res.json({
            validationStatus: "already_used",
            message: "Ticket has already been used for entry",
            details: {
              ticketNumber: ticket.ticketNumber,
              ownerName: ticket.ownerName,
              eventName: event.name,
              usedAt: ticket.updatedAt
            }
          });
        }

        // Mark ticket as used and create attendance record
        await mongoStorage.updateTicket(ticket._id.toString(), {
          status: 'used',
          usedAt: new Date()
        });

        validationResult = {
          validationStatus: "valid",
          message: "Ticket validated successfully",
          details: {
            type: 'ticket',
            ticketNumber: ticket.ticketNumber,
            ownerName: ticket.ownerName,
            ownerEmail: ticket.ownerEmail,
            eventName: event.name,
            category: ticket.category,
            price: ticket.price,
            currency: ticket.currency
          }
        };
      }
      // Check if it's a registration-based QR code
      else if (registrationId) {
        const registration = await mongoStorage.getEventRegistration(registrationId);
        
        if (!registration) {
          return res.json({
            validationStatus: "invalid",
            message: "Registration not found"
          });
        }

        // Verify registration belongs to the event
        if ((registration.eventId._id || registration.eventId).toString() !== eventId) {
          return res.json({
            validationStatus: "invalid",
            message: "Registration does not belong to this event"
          });
        }

        // CRITICAL: Check payment status for paid events
        if (event.paymentSettings?.requiresPayment && registration.paymentStatus !== 'paid' && registration.paymentStatus !== 'not_required') {
          return res.json({
            validationStatus: "invalid",
            message: `Payment not completed. Status: ${registration.paymentStatus}`,
            details: {
              registrationId: registration._id!.toString(),
              status: registration.paymentStatus,
              participantName: `${registration.firstName} ${registration.lastName}`,
              eventName: event.name
            }
          });
        }

        // Check if registration is already used for entry
        if (registration.status === 'online' || registration.status === 'attended') {
          return res.json({
            validationStatus: "already_used",
            message: "Registration has already been validated for entry",
            details: {
              registrationId: registration._id!.toString(),
              participantName: `${registration.firstName} ${registration.lastName}`,
              eventName: event.name,
              attendedAt: registration.updatedAt
            }
          });
        }

        // Mark registration as attended (online = present at event)
        await mongoStorage.updateEventRegistration(registration._id!.toString(), {
          status: 'online',
          validatedAt: new Date(),
          validatedBy: new mongoose.Types.ObjectId(req.user!.id)
        });

        validationResult = {
          validationStatus: "valid",
          message: "Registration validated successfully",
          details: {
            type: 'registration',
            registrationId: registration._id!.toString(),
            participantName: `${registration.firstName} ${registration.lastName}`,
            email: registration.email,
            eventName: event.name,
            registrationType: registration.registrationType,
            auxiliaryBody: registration.auxiliaryBody,
            member: {
              firstName: registration.firstName,
              lastName: registration.lastName,
              email: registration.email
            },
            event: {
              name: event.name,
              location: event.location
            }
          }
        };
      }

      res.json(validationResult);
    } catch (error) {
      console.error("QR scan validation error:", error);
      res.status(500).json({ message: "QR code validation failed" });
    }
  });

  // Get payment history for user's events
  app.get("/api/payments/my-events", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get all events for this user's organization
      const userEvents = await mongoStorage.getEventsByOrganization(req.user.organizationId);
      const eventIds = userEvents.map(event => event._id.toString());

      if (eventIds.length === 0) {
        return res.json({ payments: [], totalRevenue: 0, eventCount: 0 });
      }

      // Get all paid registrations for user's events
      const payments = await mongoStorage.getPaymentHistory(eventIds);

      // Calculate total revenue
      const totalRevenue = payments.reduce((sum: number, payment: any) => {
        return sum + (payment.paymentAmount || 0);
      }, 0);

      res.json({
        payments: payments.map((payment: any) => ({
          id: payment._id.toString(),
          reference: payment.paymentReference,
          amount: payment.paymentAmount * 100, // Convert to kobo for display consistency
          status: payment.paymentStatus === 'paid' ? 'success' : payment.paymentStatus,
          eventName: payment.eventName,
          registrationData: {
            guestName: `${payment.firstName} ${payment.lastName}`.trim() || 'Unknown'
          },
          createdAt: payment.paymentVerifiedAt || payment.createdAt
        })),
        totalRevenue,
        eventCount: eventIds.length
      });
    } catch (error) {
      console.error("Get payment history error:", error);
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });

  // Manual validation endpoint (for backup when QR doesn't work)
  app.post("/api/validate-manual", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { identifier, eventId } = req.body; // identifier can be ticket number or registration ID

      if (!identifier || !eventId) {
        return res.status(400).json({ message: "Identifier and event ID are required" });
      }

      // Get event details
      const event = await mongoStorage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Try to find as ticket first
      let ticket = await mongoStorage.getTicketByNumber(identifier);
      if (ticket && ticket.eventId.toString() === eventId) {
        // Same validation logic as QR scan
        if (ticket.paymentStatus !== 'paid') {
          return res.json({
            validationStatus: "invalid",
            message: `Payment not completed. Status: ${ticket.paymentStatus}`
          });
        }

        if (ticket.status === 'used') {
          return res.json({
            validationStatus: "already_used",
            message: "Ticket has already been used for entry"
          });
        }

        await mongoStorage.updateTicket(ticket._id.toString(), {
          status: 'used',
          usedAt: new Date()
        });

        return res.json({
          validationStatus: "valid",
          message: "Ticket validated successfully",
          details: {
            type: 'ticket',
            ticketNumber: ticket.ticketNumber,
            ownerName: ticket.ownerName,
            eventName: event.name
          }
        });
      }

      // Try to find as registration
      const registration = await mongoStorage.getEventRegistration(identifier);
      if (registration && registration.eventId.toString() === eventId) {
        if (event.paymentSettings?.requiresPayment && registration.paymentStatus !== 'paid' && registration.paymentStatus !== 'not_required') {
          return res.json({
            validationStatus: "invalid",
            message: `Payment not completed. Status: ${registration.paymentStatus}`
          });
        }

        if (registration.status === 'online' || registration.status === 'attended') {
          return res.json({
            validationStatus: "already_used",
            message: "Registration has already been validated for entry"
          });
        }

        await mongoStorage.updateEventRegistration(registration._id.toString(), {
          status: 'online',
          attendedAt: new Date(),
          validatedBy: new mongoose.Types.ObjectId(req.user!.id),
          validationMethod: 'manual_unique_id'
        });

        return res.json({
          validationStatus: "valid",
          message: "Registration validated successfully",
          details: {
            type: 'registration',
            participantName: `${registration.firstName} ${registration.lastName}` || registration.fullName || registration.FullName,
            eventName: event.name,
            validationMethod: 'manual_unique_id'
          }
        });
      }

      res.json({
        validationStatus: "invalid",
        message: "No valid ticket or registration found with this identifier"
      });
    } catch (error) {
      console.error("Manual validation error:", error);
      res.status(500).json({ message: "Manual validation failed" });
    }
  });

  // Manual validation endpoint (for validation using manual IDs and 6-digit codes)
  // Debug endpoint to add verification codes
  app.post("/api/debug/add-verification-code", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { uniqueId, verificationCode } = req.body;
      
      // Get the registration
      const registration = await mongoStorage.getEventRegistrationByUniqueId(uniqueId);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      // Update with verification code
      const updatedData = {
        ...registration.registrationData,
        manualVerificationCode: verificationCode
      };
      
      await mongoStorage.updateEventRegistration(registration._id!.toString(), {
        registrationData: updatedData
      });
      
      console.log(`Added verification code ${verificationCode} to registration ${registration.firstName} ${registration.lastName}`);
      
      res.json({ 
        message: "Verification code added successfully",
        registrationId: registration._id,
        verificationCode: verificationCode
      });
      
    } catch (error) {
      console.error("Error adding verification code:", error);
      res.status(500).json({ message: "Failed to add verification code" });
    }
  });

  // Manual ID validation endpoint - matches frontend call to /api/validate-id
  app.post("/api/validate-id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { uniqueId } = req.body;
      
      if (!uniqueId) {
        return res.status(400).json({ message: "Unique ID is required" });
      }

      console.log(`Validating unique ID: ${uniqueId}`);

      // Find registration by unique ID
      const registration = await mongoStorage.getEventRegistrationByUniqueId(uniqueId);
      if (!registration) {
        console.log(`Registration not found for ID: ${uniqueId}`);
        return res.status(404).json({ 
          message: "Registration not found",
          validationStatus: "invalid" 
        });
      }

      // Handle both populated and non-populated eventId first
      let eventId: string;
      if (typeof registration.eventId === 'object' && registration.eventId._id) {
        eventId = registration.eventId._id.toString();
      } else {
        eventId = registration.eventId.toString();
      }

      const event = await mongoStorage.getEvent(eventId);
      if (!event) {
        console.log(`Event not found for ID: ${eventId}`);
        return res.status(404).json({ 
          message: "Event not found",
          validationStatus: "invalid" 
        });
      }

      console.log(`Found registration:`, {
        id: registration._id?.toString(),
        firstName: registration.firstName,
        lastName: registration.lastName,
        status: registration.status,
        eventId: registration.eventId
      });

      // Check if already validated - provide better feedback
      if (registration.status === "online" || registration.status === "attended") {
        return res.status(200).json({ 
          success: false,
          message: `${registration.firstName} ${registration.lastName} has already been validated for this event`,
          validationStatus: "already_validated",
          registration: {
            id: registration._id?.toString(),
            uniqueId: registration.uniqueId,
            firstName: registration.firstName,
            lastName: registration.lastName,
            email: registration.email,
            auxiliaryBody: registration.auxiliaryBody,
            status: registration.status
          },
          event: {
            id: eventId,
            name: event.name,
            location: event.location,
            startDate: event.startDate
          }
        });
      }

      console.log(`Found event: ${event.name} (${event._id})`);

      // Check payment status for paid events
      if (event.paymentSettings?.isPaymentRequired && registration.paymentStatus !== 'paid' && registration.paymentStatus !== 'not_required') {
        return res.status(400).json({
          message: "Payment required but not completed",
          validationStatus: "payment_required"
        });
      }

      // Update registration status to "online" to indicate presence
      await mongoStorage.updateEventRegistration(registration._id!.toString(), { 
        status: "online",
        attendanceStatus: "attended",
        validatedAt: new Date(),
        validatedBy: new mongoose.Types.ObjectId(req.user!.id)
      });

      console.log(`Successfully validated registration for ${registration.firstName} ${registration.lastName}`);

      res.json({
        success: true,
        message: "Validation successful",
        validationStatus: "valid",
        registration: {
          id: registration._id?.toString(),
          uniqueId: registration.uniqueId,
          firstName: registration.firstName,
          lastName: registration.lastName,
          email: registration.email,
          auxiliaryBody: registration.auxiliaryBody,
          registrationType: registration.registrationType,
          status: "online"
        },
        event: {
          id: event._id?.toString(),
          name: event.name,
          location: event.location,
          startDate: event.startDate
        }
      });

    } catch (error) {
      console.error("Manual validation error:", error);
      res.status(500).json({ 
        message: "Validation failed",
        validationStatus: "invalid" 
      });
    }
  });

  app.post("/api/validate", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { identifier, eventId } = req.body;
      
      if (!identifier || !eventId) {
        return res.status(400).json({ message: "Identifier and event ID are required" });
      }

      // Get event details
      const event = await mongoStorage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Try to find as ticket first
      let ticket = await mongoStorage.getTicketByNumber(identifier);
      if (ticket && ticket.eventId.toString() === eventId) {
        // Same validation logic as QR scan
        if (ticket.paymentStatus !== 'paid') {
          return res.json({
            validationStatus: "invalid",
            message: `Payment not completed. Status: ${ticket.paymentStatus}`
          });
        }

        if (ticket.status === 'used') {
          return res.json({
            validationStatus: "already_used",
            message: "Ticket has already been used for entry"
          });
        }

        await mongoStorage.updateTicket(ticket._id!.toString(), {
          status: 'used'
        });

        return res.json({
          validationStatus: "valid",
          message: "Ticket validated successfully",
          details: {
            type: 'ticket',
            ticketNumber: ticket.ticketNumber,
            ownerName: ticket.ownerName,
            eventName: event.name
          }
        });
      }

      let registration;
      
      // First check if it's a 6-character letter code (new format)
      if (/^[A-Z]{6}$/.test(identifier)) {
        const allRegistrations = await mongoStorage.getEventRegistrations(eventId);
        registration = allRegistrations.find(reg => 
          reg.registrationData?.manualVerificationCode === identifier ||
          reg.manualVerificationCode === identifier
        );
      } else if (/^\d{6}$/.test(identifier)) {
        // Support legacy 6-digit numeric codes
        const allRegistrations = await mongoStorage.getEventRegistrations(eventId);
        registration = allRegistrations.find(reg => 
          reg.registrationData?.manualVerificationCode === identifier.toString() ||
          reg.manualVerificationCode === identifier.toString()
        );
      } else {
        // For longer IDs, first try by uniqueId (most common case)
        registration = await mongoStorage.getEventRegistrationByUniqueId(identifier);
        
        // If not found and looks like ObjectId, try by registration ID
        if (!registration && /^[0-9a-fA-F]{24}$/.test(identifier)) {
          try {
            registration = await mongoStorage.getEventRegistration(identifier);
          } catch (error) {
            // If invalid ObjectId, registration stays null
          }
        }
      }


      const registrationEventId = registration?.eventId?._id || registration?.eventId;
      if (registration && registrationEventId && registrationEventId.toString() === eventId) {
        if (event.paymentSettings?.requiresPayment && registration.paymentStatus !== 'paid' && registration.paymentStatus !== 'not_required') {
          return res.json({
            validationStatus: "invalid",
            message: `Payment not completed. Status: ${registration.paymentStatus}`
          });
        }

        if (registration.status === 'online' || registration.status === 'attended') {
          return res.json({
            validationStatus: "already_used",
            message: "Registration has already been validated for entry"
          });
        }

        await mongoStorage.updateEventRegistration(registration._id!.toString(), {
          status: 'online',
          validatedAt: new Date(),
          validatedBy: new mongoose.Types.ObjectId(req.user!.id),
          validationMethod: (registration.registrationData?.manualVerificationCode === identifier || registration.manualVerificationCode === identifier) ? 'manual_verification_code' : 'manual_unique_id'
        });

        return res.json({
          validationStatus: "valid",
          message: "Registration validated successfully",
          details: {
            type: 'registration',
            participantName: `${registration.firstName} ${registration.lastName}`,
            email: registration.email,
            eventName: event.name,
            registrationType: registration.registrationType,
            validationMethod: (registration.registrationData?.manualVerificationCode === identifier || registration.manualVerificationCode === identifier) ? 'manual_verification_code' : 'manual_unique_id'
          }
        });
      }

      res.json({
        validationStatus: "invalid",
        message: "No valid ticket or registration found with this identifier"
      });
    } catch (error) {
      console.error("Manual validation error:", error);
      res.status(500).json({ message: "Manual validation failed" });
    }
  });

  // Face Recognition Validation Endpoint
  app.post("/api/validate-face", authenticateToken, upload.single('faceImage'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { eventId, memberName, email } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ 
          message: "Face image is required",
          validationStatus: "invalid" 
        });
      }

      if (!eventId || !memberName) {
        return res.status(400).json({ 
          message: "Event ID and member name are required",
          validationStatus: "invalid" 
        });
      }

      // Convert uploaded image to base64 for comparison
      const uploadedImageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      // Validate image quality first
      const qualityCheck = FaceRecognitionService.validateImageQuality(uploadedImageBase64);
      if (!qualityCheck.isValid) {
        return res.status(400).json({ 
          message: qualityCheck.message,
          validationStatus: "invalid" 
        });
      }

      // Get event details for reference photos
      const event = await mongoStorage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ 
          message: "Event not found",
          validationStatus: "invalid" 
        });
      }

      // Find member registrations for this event
      const registrations = await mongoStorage.getEventRegistrations(eventId, {});
      const memberRegistrations = registrations.filter(reg => 
        (reg.firstName + ' ' + reg.lastName).toLowerCase().includes(memberName.toLowerCase()) ||
        (email && reg.email.toLowerCase() === email.toLowerCase())
      );

      if (memberRegistrations.length === 0) {
        return res.status(404).json({ 
          message: "No registration found for this member in this event",
          validationStatus: "invalid" 
        });
      }

      let bestMatch = null;
      let highestConfidence = 0;

      // Try to compare with stored face photos
      for (const registration of memberRegistrations) {
        if (registration.facePhotoPath) {
          try {
            // Read the stored face photo
            const fs = await import('fs');
            const storedImageBuffer = fs.readFileSync(registration.facePhotoPath);
            const storedImageBase64 = `data:image/jpeg;base64,${storedImageBuffer.toString('base64')}`;

            // Perform face comparison
            const comparisonResult = await FaceRecognitionService.enhancedFaceComparison(
              storedImageBase64,
              uploadedImageBase64,
              memberName
            );

            if (comparisonResult.confidence > highestConfidence) {
              highestConfidence = comparisonResult.confidence;
              bestMatch = {
                registration,
                result: comparisonResult
              };
            }
          } catch (error) {
            console.error(`Error comparing face for registration ${registration._id}:`, error);
          }
        }
      }

      // If no face photos available, try with basic member data validation
      if (!bestMatch && memberRegistrations.length > 0) {
        const registration = memberRegistrations[0];
        
        // Check if already validated
        if (registration.status === 'attended') {
          return res.json({
            validationStatus: "already_used",
            message: "Member has already been validated for this event"
          });
        }

        // Mark as validated
        await mongoStorage.updateEventRegistration(registration._id!.toString(), {
          status: 'attended',
          validatedAt: new Date(),
          validatedBy: new mongoose.Types.ObjectId(req.user!.id)
        });

        return res.json({
          validationStatus: "valid",
          message: `${memberName} validated successfully (face recognition not available)`,
          details: {
            type: 'registration',
            participantName: `${registration.firstName} ${registration.lastName}`,
            email: registration.email,
            eventName: event.name,
            confidence: 0,
            method: 'manual_override'
          }
        });
      }

      // Process best match if available
      if (bestMatch && bestMatch.result.isMatch) {
        const registration = bestMatch.registration;

        // Check if already validated
        if (registration.status === 'attended') {
          return res.json({
            validationStatus: "already_used",
            message: "Member has already been validated for this event"
          });
        }

        // Mark as validated
        await mongoStorage.updateEventRegistration(registration._id!.toString(), {
          status: 'attended',
          validatedAt: new Date(),
          validatedBy: new mongoose.Types.ObjectId(req.user!.id)
        });

        return res.json({
          validationStatus: "valid",
          message: bestMatch.result.message,
          details: {
            type: 'registration',
            participantName: `${registration.firstName} ${registration.lastName}`,
            email: registration.email,
            eventName: event.name,
            confidence: Math.round(bestMatch.result.confidence * 100),
            method: 'face_recognition'
          }
        });
      }

      // No match found
      return res.json({
        validationStatus: "face_mismatch",
        message: `Face does not match any registered member for this event (${Math.round(highestConfidence * 100)}% confidence)`,
        details: {
          confidence: Math.round(highestConfidence * 100),
          memberName,
          eventName: event.name
        }
      });

    } catch (error) {
      console.error("Face validation error:", error);
      res.status(500).json({ 
        message: "Face validation failed",
        validationStatus: "error" 
      });
    }
  });

  // ================ MEMBERS API ================
  
  // Get all members
  app.get("/api/members", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      
      // Get members for the organization
      const members = await mongoStorage.getMembers(organizationId ? { organizationId } : {});
      
      // Format members for frontend
      const formattedMembers = members.map(member => ({
        id: member._id?.toString(),
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        auxiliaryBody: member.auxiliaryBody,
        status: member.status || 'active',
        organizationId: member.organizationId?.toString(),
        createdAt: member.createdAt
      }));

      res.json(formattedMembers);
    } catch (error) {
      console.error("Error getting members:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create member
  app.post("/api/members", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      
      const memberData = {
        ...req.body,
        organizationId: organizationId || undefined,
        status: req.body.status || 'active',
        createdAt: new Date()
      };
      
      const member = await mongoStorage.createMember(memberData);
      
      res.status(201).json({
        id: member._id?.toString(),
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        auxiliaryBody: member.auxiliaryBody,
        status: member.status,
        organizationId: member.organizationId?.toString(),
        createdAt: member.createdAt
      });
    } catch (error) {
      console.error("Error creating member:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update member
  app.put("/api/members/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const memberId = req.params.id;
      const updatedMember = await mongoStorage.updateMember(memberId, req.body);
      
      if (!updatedMember) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      res.json({
        id: updatedMember._id?.toString(),
        firstName: updatedMember.firstName,
        lastName: updatedMember.lastName,
        email: updatedMember.email,
        auxiliaryBody: updatedMember.auxiliaryBody,
        status: updatedMember.status,
        organizationId: updatedMember.organizationId?.toString(),
        createdAt: updatedMember.createdAt
      });
    } catch (error) {
      console.error("Error updating member:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete member
  app.delete("/api/members/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const memberId = req.params.id;
      const deleted = await mongoStorage.deleteMember(memberId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      res.json({ message: "Member deleted successfully" });
    } catch (error) {
      console.error("Error deleting member:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ================ AUXILIARY BODIES API ================
  
  // Get auxiliary bodies dynamically based on events
  app.get("/api/auxiliary-bodies", async (req: Request, res: Response) => {
    try {
      // Get all events to extract unique auxiliary bodies
      const events = await mongoStorage.getEvents();
      const auxiliaryBodiesSet = new Set<string>();
      
      // Extract all auxiliary bodies from events
      events.forEach(event => {
        if (event.eligibleAuxiliaryBodies && Array.isArray(event.eligibleAuxiliaryBodies)) {
          event.eligibleAuxiliaryBodies.forEach(body => {
            if (body && body.trim()) {
              auxiliaryBodiesSet.add(body.trim());
            }
          });
        }
      });
      
      // Also add auxiliary bodies from existing members
      const members = await mongoStorage.getMembers();
      members.forEach(member => {
        if (member.auxiliaryBody && member.auxiliaryBody.trim()) {
          auxiliaryBodiesSet.add(member.auxiliaryBody.trim());
        }
      });
      
      // Convert to array and sort
      const auxiliaryBodies = Array.from(auxiliaryBodiesSet).sort();
      
      // Return empty array if no auxiliary bodies found (no hardcoded fallback)
      res.json(auxiliaryBodies);
    } catch (error) {
      console.error("Error getting auxiliary bodies:", error);
      // Return empty array on error (no hardcoded fallback)
      res.json([]);
    }
  });

  // ================ FILE UPLOAD API ================
  
  // Initialize file storage handler
  const fileStorage = new FileStorageHandler();
  
  // Image upload endpoint
  app.post("/api/upload/image", authenticateToken, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log("Image upload request received");
      console.log("File info:", req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer,
        bufferLength: req.file.buffer?.length
      } : "No file");
      
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      if (!req.file.buffer) {
        return res.status(400).json({ message: "Invalid file data - no buffer" });
      }

      // Get folder from request body (optional)
      const folder = req.body.folder || 'images';
      console.log("Uploading to folder:", folder);

      // Save file using storage handler
      const uploadedFile = await fileStorage.saveFile(req.file, folder);
      console.log("File uploaded successfully:", uploadedFile);

      res.json({ 
        message: "Image uploaded successfully",
        url: uploadedFile.url,
        filename: uploadedFile.filename
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ 
        message: "Failed to upload image",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ================ TICKET RETRIEVAL API ================
  
  // Get ticket by ID
  app.get("/api/tickets/:ticketId", async (req: Request, res: Response) => {
    try {
      const { ticketId } = req.params;
      
      if (!ticketId) {
        return res.status(400).json({ message: "Ticket ID is required" });
      }

      // Try to get ticket by ID first (only if it looks like an ObjectId)
      let ticket = null;
      
      // Check if ticketId looks like a valid ObjectId (24 hex characters)
      if (/^[a-f\d]{24}$/i.test(ticketId)) {
        try {
          ticket = await mongoStorage.getTicketById(ticketId);
        } catch (error) {
          console.log('Failed to get ticket by ID, trying by number...');
        }
      }
      
      // If not found by ID, try by ticket number
      if (!ticket) {
        ticket = await mongoStorage.getTicketByNumber(ticketId);
      }
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Get event details
      const event = await mongoStorage.getEvent(ticket.eventId.toString());
      
      // Return ticket with event details
      res.json({
        id: ticket._id?.toString(),
        ticketNumber: ticket.ticketNumber,
        eventId: ticket.eventId?.toString(),
        organizationId: ticket.organizationId?.toString(),
        ownerEmail: ticket.ownerEmail,
        ownerPhone: ticket.ownerPhone,
        ownerName: ticket.ownerName,
        category: ticket.category,
        price: ticket.price,
        currency: ticket.currency,
        status: ticket.status,
        paymentStatus: ticket.paymentStatus,
        paymentReference: ticket.paymentReference,
        paymentMethod: ticket.paymentMethod,
        qrCode: ticket.qrCode,
        qrCodeImage: ticket.qrCodeImage,
        validatedAt: ticket.validatedAt,
        validatedBy: ticket.validatedBy?.toString(),
        transferHistory: ticket.transferHistory || [],
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        event: event ? {
          id: event._id?.toString(),
          name: event.name,
          description: event.description,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
          status: event.status
        } : null
      });
    } catch (error) {
      console.error("Error getting ticket:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get tickets for a specific event (for admin dashboard)
  app.get("/api/events/:eventId/tickets", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const organizationId = req.user?.organizationId;
      
      if (!eventId) {
        return res.status(400).json({ message: "Event ID is required" });
      }

      // Verify event belongs to organization
      const event = await mongoStorage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.organizationId.toString() !== organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get all tickets for this event
      const tickets = await mongoStorage.getTickets({ eventId });
      
      // Format tickets for frontend
      const formattedTickets = tickets.map(ticket => ({
        id: ticket._id?.toString(),
        ticketNumber: ticket.ticketNumber,
        ownerEmail: ticket.ownerEmail,
        ownerPhone: ticket.ownerPhone,
        ownerName: ticket.ownerName,
        category: ticket.category,
        price: ticket.price,
        currency: ticket.currency,
        status: ticket.status,
        paymentStatus: ticket.paymentStatus,
        paymentMethod: ticket.paymentMethod,
        validatedAt: ticket.validatedAt,
        createdAt: ticket.createdAt,
        transferHistory: ticket.transferHistory || []
      }));

      res.json(formattedTickets);
    } catch (error) {
      console.error("Error getting event tickets:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });



  // ================ QR CODE VALIDATION API ================
  // Note: Main /api/validate-id endpoint is defined above to handle all validation methods

  // ================ ADMIN UTILITIES ================
  
  // Add missing verification codes endpoint
  app.post("/api/admin/add-verification-codes", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Only super admin can run this
      if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }

      const { addMissingVerificationCodes } = await import('./add-verification-codes.js');
      await addMissingVerificationCodes();
      
      res.json({ 
        success: true, 
        message: "Verification codes added successfully" 
      });
    } catch (error) {
      console.error("Error adding verification codes:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to add verification codes" 
      });
    }
  });

  // Temporary route to fix face recognition settings for existing events
  app.patch("/api/events/:id/fix-face-recognition", async (req: Request, res: Response) => {
    try {
      const eventId = req.params.id;
      
      const updatedEvent = await mongoStorage.updateEvent(eventId, {
        faceRecognitionSettings: {
          enabled: false,
          required: false,
          description: "",
        }
      });
      
      if (!updatedEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json({ message: "Face recognition settings added successfully", event: updatedEvent });
    } catch (error) {
      console.error("Error fixing face recognition settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}