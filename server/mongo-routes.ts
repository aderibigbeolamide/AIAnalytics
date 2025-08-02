import type { Express, Request, Response } from "express";
import { mongoStorage } from "./mongodb-storage";
import { authenticateToken, type AuthenticatedRequest } from "./mongo-auth-routes";
import multer from "multer";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import { NotificationService } from "./notification-service";
import mongoose from "mongoose";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
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
  
  // Get public events (no authentication required)
  app.get("/api/events/public", async (req: Request, res: Response) => {
    try {
      const events = await mongoStorage.getEvents();
      
      const publicEvents = events.filter(event => ['upcoming', 'active'].includes(event.status)).map(event => ({
        id: event._id?.toString(),
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
        organizationId: event.organizationId?.toString()
      }));

      res.json(publicEvents);
    } catch (error) {
      console.error("Error getting public events:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

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
        customFields: event.customFields,
        organizationId: event.organizationId?.toString()
      };

      res.json(publicEvent);
    } catch (error) {
      console.error("Error getting public event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ================ EVENT MANAGEMENT ================
  
  // Create event
  app.post("/api/events", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('Creating event with user:', req.user);
      console.log('User ID:', req.user!.id, 'Org ID:', req.user?.organizationId);
      
      // Validate ObjectId strings before conversion
      if (!req.user!.id || !mongoose.Types.ObjectId.isValid(req.user!.id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      if (!req.user?.organizationId || !mongoose.Types.ObjectId.isValid(req.user.organizationId)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }
      
      const eventData = {
        ...req.body,
        createdBy: new mongoose.Types.ObjectId(req.user!.id),
        organizationId: new mongoose.Types.ObjectId(req.user.organizationId),
        createdAt: new Date(),
        status: req.body.status || 'upcoming'
      };

      const event = await mongoStorage.createEvent(eventData);
      
      res.status(201).json({
        id: event._id?.toString(),
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

      res.json({
        id: event._id.toString(),
        ...event.toObject(),
        organizationId: event.organizationId?.toString(),
        createdBy: event.createdBy?.toString()
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

  // ================ EVENT REGISTRATION ================
  
  // Register for event
  app.post("/api/events/:eventId/register", async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId;
      const registrationData = {
        ...req.body,
        eventId,
        createdAt: new Date(),
        status: 'pending',
        qrCode: nanoid(10), // Generate unique QR code
        attendanceStatus: 'registered'
      };

      const registration = await mongoStorage.createEventRegistration(registrationData);
      
      // Generate QR code image
      const qrCodeData = JSON.stringify({
        registrationId: registration._id.toString(),
        eventId,
        timestamp: Date.now()
      });
      
      const qrCodeImage = await QRCode.toDataURL(qrCodeData);

      res.status(201).json({
        id: registration._id.toString(),
        ...registration.toObject(),
        qrCodeImage,
        eventId: registration.eventId?.toString(),
        memberId: registration.memberId?.toString()
      });
    } catch (error) {
      console.error("Error registering for event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get event registrations
  app.get("/api/events/:eventId/registrations", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventId = req.params.eventId;
      
      const registrations = await mongoStorage.getEventRegistrations(eventId);
      
      const formattedRegistrations = registrations.map(reg => ({
        id: reg._id.toString(),
        ...reg.toObject(),
        eventId: reg.eventId?.toString(),
        memberId: reg.memberId?.toString()
      }));

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
        registration = await mongoStorage.getEventRegistrationById(registrationId);
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
        { attendanceStatus: 'attended', validatedAt: new Date() }
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
  
  // Upload CSV file
  app.post("/api/events/:eventId/upload-csv", authenticateToken, upload.single('csvFile'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const eventId = req.params.eventId;
      
      // Update event with CSV file path
      await mongoStorage.updateEvent(eventId, {
        csvFilePath: req.file.path,
        csvFileName: req.file.originalname
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
      
      // Update event with face photo path
      await mongoStorage.updateEvent(eventId, {
        facePhotoPath: req.file.path,
        facePhotoFileName: req.file.originalname
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

  // Initialize payment for event registration
  app.post("/api/payment/initialize", async (req: Request, res: Response) => {
    try {
      const { eventId, email, registrationData, amount, currency = "NGN" } = req.body;

      if (!eventId || !email || !amount) {
        return res.status(400).json({ message: "Event ID, email, and amount are required" });
      }

      // Get event details
      const event = await mongoStorage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Initialize Paystack payment
      const { initializePaystackPayment } = await import('./paystack');
      
      const reference = `REG_${Date.now()}_${nanoid(8)}`;
      
      const paymentData = await initializePaystackPayment({
        email,
        amount: amount * 100, // Convert to kobo for NGN
        reference,
        currency,
        metadata: {
          eventId,
          eventName: event.name,
          userEmail: email,
          registrationData: JSON.stringify(registrationData),
          type: 'event_registration'
        }
      });

      if (paymentData.status) {
        res.json({
          success: true,
          authorization_url: paymentData.data.authorization_url,
          reference: paymentData.data.reference
        });
      } else {
        res.status(400).json({ message: "Payment initialization failed" });
      }
    } catch (error) {
      console.error("Payment initialization error:", error);
      res.status(500).json({ message: "Payment initialization failed" });
    }
  });

  // Verify payment for event registration
  app.get("/api/payment/verify/:reference", async (req: Request, res: Response) => {
    try {
      const { reference } = req.params;

      // Verify payment with Paystack
      const { verifyPaystackPayment } = await import('./paystack');
      const verificationData = await verifyPaystackPayment(reference);

      if (verificationData.status && verificationData.data.status === 'success') {
        const metadata = verificationData.data.metadata;
        const eventId = metadata.eventId;
        const registrationData = JSON.parse(metadata.registrationData);
        const amount = verificationData.data.amount / 100; // Convert from kobo
        const currency = verificationData.data.currency;

        // Get event details
        const event = await mongoStorage.getEvent(eventId);
        if (!event) {
          return res.status(404).json({ message: "Event not found" });
        }

        // Create the registration
        const registrationId = nanoid(12);
        const qrData = {
          registrationId,
          eventId,
          timestamp: Date.now(),
          type: registrationData.registrationType || 'member'
        };

        // Generate QR code
        const qrCodeData = JSON.stringify(qrData);
        const qrCodeImage = await QRCode.toDataURL(qrCodeData);

        // Create registration with payment data
        const registration = await mongoStorage.createEventRegistration({
          ...registrationData,
          eventId,
          registrationId,
          paymentStatus: 'paid',
          paymentReference: reference,
          paymentAmount: amount,
          paymentCurrency: currency,
          qrCode: qrCodeImage,
          status: 'confirmed',
          paymentMethod: 'paystack',
          createdAt: new Date()
        });

        // Send payment notification to organization admin
        await NotificationService.createPaymentNotification(
          event.organizationId.toString(),
          eventId,
          amount,
          currency,
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

        res.json({
          success: true,
          message: "Payment verified and registration completed",
          registration: {
            id: registration._id.toString(),
            ...registration.toObject(),
            qrCode: qrCodeImage
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Payment verification failed"
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ message: "Payment verification failed" });
    }
  });

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

      // Initialize Paystack payment
      const { initializePaystackPayment } = await import('./paystack');
      
      const reference = `TKT_${Date.now()}_${nanoid(8)}`;
      
      const paymentData = await initializePaystackPayment({
        email: ticket.ownerEmail,
        amount: ticket.price * 100, // Convert to kobo
        reference,
        currency: ticket.currency,
        metadata: {
          ticketId: ticket._id.toString(),
          eventId: ticket.eventId.toString(),
          eventName: event.name,
          ticketNumber: ticket.ticketNumber,
          type: 'ticket_purchase'
        }
      });

      if (paymentData.status) {
        res.json({
          success: true,
          authorization_url: paymentData.data.authorization_url,
          reference: paymentData.data.reference
        });
      } else {
        res.status(400).json({ message: "Payment initialization failed" });
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
}