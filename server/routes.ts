import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  authenticateToken, 
  requireRole,
  type AuthenticatedRequest 
} from "./auth";
import { 
  generateQRCode, 
  generateQRImage, 
  generateShortUniqueId,
  encryptQRData, 
  decryptQRData, 
  validateQRData,
  type QRData 
} from "./qr";
import { 
  insertUserSchema, 
  insertMemberSchema, 
  insertEventSchema,
  updateEventSchema,
  insertEventRegistrationSchema,
  insertAttendanceSchema,
  insertEventReportSchema,
  insertMemberValidationCsvSchema,
  insertFaceRecognitionPhotoSchema
} from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and CSV files
    if (file.mimetype.startsWith('image/') || 
        file.mimetype === 'application/pdf' || 
        file.mimetype === 'text/csv' ||
        file.mimetype === 'application/csv' ||
        file.mimetype === 'text/plain' ||
        file.mimetype === 'application/octet-stream' ||
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}. Only image, PDF, and CSV files are accepted.`));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePassword(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken({ id: user.id, username: user.username, role: user.role });
      
      // Get member data if user is a member
      const member = await storage.getMemberByUserId(user.id);
      
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        },
        member 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      userData.password = await hashPassword(userData.password);
      
      const user = await storage.createUser(userData);
      const token = generateToken({ id: user.id, username: user.username, role: user.role });
      
      res.status(201).json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        } 
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const member = await storage.getMemberByUserId(req.user!.id);
    res.json({ user: req.user, member });
  });

  // Dashboard stats route
  app.get("/api/dashboard/stats", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const attendanceStats = await storage.getAttendanceStats();
      const events = await storage.getEvents();
      const members = await storage.getMembers();
      
      const stats = {
        ...attendanceStats,
        totalMembers: members.length,
        activeEvents: events.filter(e => e.status === 'active').length,
        totalEvents: events.length,
        activeMembers: members.filter(m => m.status === 'active').length,
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Member routes
  app.get("/api/members", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { auxiliaryBody, search, chandaNumber } = req.query;
      const members = await storage.getMembers({
        auxiliaryBody: auxiliaryBody as string,
        search: search as string,
        chandaNumber: chandaNumber as string,
      });
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.get("/api/members/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const member = await storage.getMember(id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch member" });
    }
  });

  app.post("/api/members", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const memberData = insertMemberSchema.parse(req.body);
      const member = await storage.createMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      res.status(400).json({ message: "Failed to create member" });
    }
  });

  app.put("/api/members/:id", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertMemberSchema.partial().parse(req.body);
      const member = await storage.updateMember(id, updates);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(400).json({ message: "Failed to update member" });
    }
  });

  app.delete("/api/members/:id", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMember(id);
      if (!deleted) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete member" });
    }
  });

  // Event routes
  app.get("/api/events", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.query;
      const events = await storage.getEvents({ status: status as string });
      
      // Enhance events with statistics
      const eventsWithStats = await Promise.all(events.map(async (event) => {
        const registrations = await storage.getEventRegistrations(event.id);
        const attendance = await storage.getAttendance(event.id);
        
        return {
          ...event,
          totalRegistrations: registrations.length,
          totalAttendance: attendance.length,
          memberRegistrations: registrations.filter(r => r.registrationType === 'member').length,
          guestRegistrations: registrations.filter(r => r.registrationType === 'guest').length,
          inviteeRegistrations: registrations.filter(r => r.registrationType === 'invitee').length,
          attendanceRate: registrations.length > 0 ? (attendance.length / registrations.length) * 100 : 0,
        };
      }));
      
      res.json(eventsWithStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Public route for event details (for registration page)
  app.get("/api/events/:id/public", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      // Return only necessary public information
      const publicEvent = {
        id: event.id,
        name: event.name,
        description: event.description,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        eligibleAuxiliaryBodies: event.eligibleAuxiliaryBodies,
        allowGuests: event.allowGuests,
        requiresPayment: event.requiresPayment,
        status: event.status,
      };
      res.json(publicEvent);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.get("/api/events/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Public endpoint for event details (for registration)
  app.get("/api/events/:id/public", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Return only public information
      const publicEvent = {
        id: event.id,
        name: event.name,
        description: event.description,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        status: event.status,
        eligibleAuxiliaryBodies: event.eligibleAuxiliaryBodies,
        allowGuests: event.allowGuests,
        requiresPayment: event.requiresPayment,
        paymentAmount: event.paymentAmount,
      };
      
      res.json(publicEvent);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.delete("/api/events/:id", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteEvent(id);
      if (!success) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  app.post("/api/events", authenticateToken, requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const { invitations, ...eventData } = req.body;
      
      // Convert date strings to Date objects and add createdBy
      const processedEventData = {
        ...eventData,
        startDate: new Date(eventData.startDate),
        endDate: eventData.endDate ? new Date(eventData.endDate) : undefined,
        createdBy: req.user!.id,
      };
      
      const validatedEventData = insertEventSchema.parse(processedEventData);
      
      const event = await storage.createEvent(validatedEventData);
      
      // Generate QR code for the event that links to registration page
      const { getRegistrationUrl, getReportUrl } = await import('./utils');
      const registrationUrl = getRegistrationUrl(event.id, req);
      const qrCodeImage = await generateQRImage(registrationUrl);
      
      // Generate report link for complaints/feedback
      const reportLink = getReportUrl(event.id, req);
      
      await storage.updateEvent(event.id, { 
        qrCode: qrCodeImage,
        reportLink: reportLink
      } as any);
      
      // Create invitations if provided
      if (invitations && Array.isArray(invitations)) {
        for (const invitation of invitations) {
          if (invitation.name && invitation.email) {
            await storage.createInvitation({
              eventId: event.id,
              inviteeName: invitation.name,
              inviteeEmail: invitation.email,
              invitedBy: req.user!.id,
              status: "pending",
            });
          }
        }
      }
      
      const updatedEvent = await storage.getEvent(event.id);
      res.status(201).json(updatedEvent);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(400).json({ message: "Failed to create event" });
    }
  });

  app.put("/api/events/:id", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const eventData = req.body;
      
      // Convert date strings to Date objects
      const updates = {
        ...eventData,
        startDate: eventData.startDate ? new Date(eventData.startDate) : undefined,
        endDate: eventData.endDate ? new Date(eventData.endDate) : undefined,
      };
      
      const event = await storage.updateEvent(id, updates);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Event update error:", error);
      res.status(400).json({ message: "Failed to update event", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.delete("/api/events/:id", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEvent(id);
      if (!deleted) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Event registration routes
  app.get("/api/events/:id/registrations", authenticateToken, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { auxiliaryBody, uniqueId, chandaNumber, startDate, endDate, status } = req.query;
      
      const filters = {
        auxiliaryBody: auxiliaryBody as string,
        uniqueId: uniqueId as string,
        chandaNumber: chandaNumber as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as string,
      };
      
      const registrations = await storage.getEventRegistrations(eventId, filters);
      // Filter out cancelled registrations
      const activeRegistrations = registrations.filter(reg => reg.status !== 'cancelled');
      res.json(activeRegistrations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  // Delete registration route
  app.delete("/api/events/:id/registrations/:registrationId", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const registrationId = parseInt(req.params.registrationId);
      
      // Get the registration to verify it exists and belongs to the event
      const registration = await storage.getEventRegistration(registrationId);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      if (registration.eventId !== eventId) {
        return res.status(400).json({ message: "Registration does not belong to this event" });
      }
      
      // Note: We don't actually delete from database, just mark as deleted
      // For data integrity, we should keep records but mark them as inactive
      await storage.updateEventRegistration(registrationId, { 
        status: "cancelled"
      });
      
      res.json({ message: "Registration deleted successfully" });
    } catch (error) {
      console.error("Error deleting registration:", error);
      res.status(500).json({ message: "Failed to delete registration" });
    }
  });

  // Global registrations filter route
  app.get("/api/registrations", authenticateToken, async (req, res) => {
    try {
      const { eventId, auxiliaryBody, uniqueId, chandaNumber, startDate, endDate, status } = req.query;
      
      const filters = {
        auxiliaryBody: auxiliaryBody as string,
        uniqueId: uniqueId as string,
        chandaNumber: chandaNumber as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as string,
      };
      
      const registrations = await storage.getEventRegistrations(
        eventId ? parseInt(eventId as string) : undefined, 
        filters
      );
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  app.post("/api/events/:id/register", upload.single('paymentReceipt'), async (req: Request, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const now = new Date();

      // Check if event has started (members cannot register before event starts)
      if (now < event.startDate) {
        return res.status(400).json({ 
          message: "Registration is not yet open. Please wait until the event starts.",
          eventStartDate: event.startDate
        });
      }

      // Check if event has ended (additional safety check)
      if (event.endDate && now > event.endDate) {
        return res.status(400).json({ message: "This event has already ended" });
      }

      const {
        firstName,
        lastName,
        jamaat,
        auxiliaryBody,
        chandaNumber,
        circuit,
        email,
        registrationType,
        paymentReceiptUrl,
        paymentAmount
      } = req.body;



      // Validate required fields based on registration type
      if (!firstName || !lastName) {
        return res.status(400).json({ message: "First name and last name are required" });
      }

      // Handle payment receipt upload first
      let paymentReceiptUrlFinal = paymentReceiptUrl;
      if (req.file) {
        try {
          const { fileStorage } = await import('./storage-handler');
          const uploadedFile = await fileStorage.saveFile(req.file, 'payment-receipts');
          paymentReceiptUrlFinal = uploadedFile.url;
        } catch (error) {
          console.error('File upload error:', error);
          return res.status(400).json({ message: "Failed to upload payment receipt" });
        }
      }

      // For members, additional fields are required
      if (registrationType === "member") {
        if (!jamaat || !auxiliaryBody || !email) {
          return res.status(400).json({ message: "Jamaat, auxiliary body, and email are required for members" });
        }
        
        // Check if payment receipt is required for members
        if (event.requiresPayment && !paymentReceiptUrlFinal) {
          return res.status(400).json({ message: "Payment receipt is required for members in paid events" });
        }
      }

      // Check payment receipt if event requires payment (make it optional for now)
      // if (event.requiresPayment && !paymentReceiptUrlFinal) {
      //   return res.status(400).json({ message: "Payment receipt is required for this event" });
      // }

      // Check if auxiliary body is eligible for this event (only for members)
      if (registrationType === "member" && auxiliaryBody && !event.eligibleAuxiliaryBodies.includes(auxiliaryBody)) {
        return res.status(400).json({ message: "Auxiliary body not eligible for this event" });
      }

      // Create or find member based on registration data
      let member = null;
      if (registrationType === "member") {
        try {
          // First check if member exists by chanda number (primary identifier)
          if (chandaNumber) {
            member = await storage.getMemberByChandaNumber(chandaNumber);
          }
          
          if (!member) {
            // Create new member if doesn't exist
            // Use chanda number + timestamp for unique username if chanda number exists
            const uniqueUsername = chandaNumber ? 
              `${chandaNumber}_${Date.now()}` : 
              `${email}_${Date.now()}`;
              
            member = await storage.createMember({
              username: uniqueUsername,
              firstName,
              lastName,
              jamaat,
              auxiliaryBody,
              chandaNumber,
              circuit,
              email,
              status: "active"
            });
          }
        } catch (error) {
          console.error("Member creation/lookup error:", error);
          // Continue with registration even if member creation fails
        }
      }

      const qrCode = generateQRCode();
      const uniqueId = generateShortUniqueId(); // Generate shorter 6-character ID for manual validation
      
      const registrationData = {
        eventId,
        memberId: member?.id,
        registrationType,
        qrCode,
        uniqueId,
        // Store data for all registration types (including members for fallback)
        guestName: `${firstName} ${lastName}`,
        guestEmail: email,
        guestJamaat: jamaat,
        guestAuxiliaryBody: auxiliaryBody,
        guestChandaNumber: chandaNumber,
        guestCircuit: circuit,
        guestPost: registrationType === "invitee" ? req.body.post : undefined,
        paymentReceiptUrl: paymentReceiptUrlFinal,
        paymentAmount,
        paymentStatus: paymentReceiptUrlFinal ? "pending" : undefined,
        status: "registered"
      };

      const registration = await storage.createEventRegistration(registrationData);
      
      // Generate QR data for validation
      const qrData: QRData = {
        registrationId: registration.id,
        eventId,
        memberId: member?.id,
        type: registrationType as "member" | "guest" | "invitee",
        timestamp: Date.now(),
      };
      
      const qrImageData = await generateQRImage(encryptQRData(qrData));
      
      // Get the full registration with member data if available
      const fullRegistration = await storage.getEventRegistration(registration.id);
      
      // Send email with registration card
      const { sendEmail, generateRegistrationCardHTML } = await import('./email');
      const emailHtml = generateRegistrationCardHTML(fullRegistration || registration, event, qrImageData.replace('data:image/png;base64,', ''));
      
      const emailSent = await sendEmail({
        to: email,
        from: 'admin@letbud.com',
        subject: `Registration Confirmation - ${event.name}`,
        html: emailHtml,
        text: `Registration confirmed for ${event.name}. Your unique ID is: ${registration.uniqueId}`
      });
      
      res.status(201).json({ 
        registration: fullRegistration || registration, 
        qrImage: qrImageData,
        emailSent,
        message: emailSent ? "Registration successful! Confirmation email sent." : "Registration successful! Please save your QR code."
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Failed to register for event" });
    }
  });

  // QR Code generation endpoint
  app.post("/api/qr/generate", async (req: Request, res: Response) => {
    try {
      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ message: "Data required for QR generation" });
      }
      
      const qrImage = await generateQRImage(data);
      res.json({ qrImage });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // QR Scanning and validation
  app.post("/api/scan", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { qrData: encryptedData } = req.body;
      
      if (!encryptedData) {
        return res.status(400).json({ message: "QR data required" });
      }

      const qrData = decryptQRData(encryptedData);
      if (!qrData) {
        return res.status(400).json({ 
          message: "Invalid QR code",
          validationStatus: "invalid" 
        });
      }

      if (!validateQRData(qrData)) {
        return res.status(400).json({ 
          message: "QR code expired",
          validationStatus: "invalid" 
        });
      }

      const registration = await storage.getEventRegistration(qrData.registrationId);
      if (!registration) {
        return res.status(404).json({ 
          message: "Registration not found",
          validationStatus: "invalid" 
        });
      }

      const event = await storage.getEvent(qrData.eventId);
      if (!event) {
        return res.status(404).json({ 
          message: "Event not found",
          validationStatus: "invalid" 
        });
      }

      let member = null;
      if (qrData.memberId) {
        member = await storage.getMember(qrData.memberId);
        
        // Check auxiliary body eligibility
        if (member && !event.eligibleAuxiliaryBodies.includes(member.auxiliaryBody)) {
          return res.status(403).json({ 
            message: `${member.auxiliaryBody} members not eligible for this event`,
            validationStatus: "invalid" 
          });
        }
      }

      // Enhanced CSV validation logic based on registration type
      const csvData = await storage.getMemberValidationCsv(qrData.eventId);
      console.log(`CSV Data found: ${csvData.length} files for event ${qrData.eventId}`);
      console.log(`Registration type: ${registration.registrationType}`);
      
      let csvValidationPassed = true;
      let validationRequired = false;
      
      // Determine if CSV validation is required
      if (csvData.length > 0 && registration.registrationType === 'member') {
        // CSV validation is required only for members when CSV exists
        validationRequired = true;
        console.log(`CSV validation required for member registration:`, {
          name: registration.guestName,
          email: registration.guestEmail,
          chanda: registration.guestChandaNumber
        });
        
        // Check if user exists in any of the CSV files
        csvValidationPassed = csvData.some(csv => 
          csv.memberData.some((csvMember: any) => {
            // Support multiple possible field names for CSV data
            const csvName = csvMember.name || csvMember.Fullname || csvMember.fullName || csvMember.fullname;
            const csvEmail = csvMember.email || csvMember.Email || csvMember.emailAddress;
            const csvChanda = csvMember.chandaNumber || csvMember.ChandaNO || csvMember.chandaNo || csvMember.chanda_number;
            
            // Compare name (case insensitive)
            const nameMatch = csvName && registration.guestName && 
              csvName.toLowerCase().trim() === registration.guestName.toLowerCase().trim();
            
            // Compare email (case insensitive)
            const emailMatch = csvEmail && registration.guestEmail && 
              csvEmail.toLowerCase().trim() === registration.guestEmail.toLowerCase().trim();
            
            // Compare chanda number
            const chandaMatch = csvChanda && registration.guestChandaNumber && 
              csvChanda.toString().trim() === registration.guestChandaNumber.toString().trim();
            
            console.log(`CSV QR Validation Check:
              CSV Member: ${csvName} | ${csvEmail} | ${csvChanda}
              Registration: ${registration.guestName} | ${registration.guestEmail} | ${registration.guestChandaNumber}
              Matches: name=${nameMatch}, email=${emailMatch}, chanda=${chandaMatch}`);
            
            return nameMatch || emailMatch || chandaMatch;
          })
        );
        
        if (!csvValidationPassed) {
          return res.status(403).json({ 
            message: "Member validation failed. Your information was not found in the member validation list. Please contact the event organizer.",
            validationStatus: "csv_validation_failed",
            details: "Members must be validated against the uploaded member list for this event." 
          });
        }
      } else if (registration.registrationType === 'guest' || registration.registrationType === 'invitee') {
        // Guests and invitees are allowed regardless of CSV content
        console.log(`Allowing ${registration.registrationType} registration - CSV validation not required`);
        csvValidationPassed = true;
      } else if (csvData.length === 0) {
        // No CSV uploaded - allow all registrations
        console.log(`No CSV validation data found - allowing all registration types`);
        csvValidationPassed = true;
      }
      
      console.log(`CSV QR Validation Result: Required=${validationRequired}, Passed=${csvValidationPassed}`);

      // Create attendance record
      const attendanceData = {
        eventId: qrData.eventId,
        registrationId: qrData.registrationId,
        scannedBy: req.user!.id,
        validationStatus: "valid" as const,
      };

      const attendanceRecord = await storage.createAttendance(attendanceData);
      
      // Update registration status to "online"
      await storage.updateEventRegistration(registration.id, { 
        status: "online",
        validationMethod: "qr_scan"
      });
      
      // Update member status to "online" if they exist
      if (member) {
        await storage.updateMember(member.id, { status: "online" });
      }
      
      // Also update member status if registration has member data but no member record
      if (!member && registration.memberId) {
        const regMember = await storage.getMember(registration.memberId);
        if (regMember) {
          await storage.updateMember(registration.memberId, { status: "online" });
        }
      }

      res.json({
        message: "Validation successful",
        validationStatus: "valid",
        member,
        event,
        registration,
        attendance: attendanceRecord,
      });

    } catch (error) {
      res.status(500).json({ 
        message: "Validation failed",
        validationStatus: "invalid" 
      });
    }
  });

  // Manual validation by unique ID
  // Export Attendance endpoint
  app.get("/api/events/:eventId/export-attendance", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const registrations = await storage.getEventRegistrations(eventId);
      const attendance = await storage.getAttendance(eventId);
      
      // Create CSV data
      const csvData = await Promise.all(registrations.map(async (reg) => {
        const attendanceRecord = attendance.find(att => att.registrationId === reg.id);
        let member = null;
        if (reg.memberId) {
          member = await storage.getMember(reg.memberId);
        }
        
        return {
          'Registration ID': reg.id,
          'Name': reg.guestName || (member ? `${member.firstName} ${member.lastName}` : 'N/A'),
          'Auxiliary Body': reg.guestAuxiliaryBody || member?.auxiliaryBody || 'N/A',
          'Chanda Number': reg.guestChandaNumber || member?.chandaNumber || 'N/A',
          'Email': reg.guestEmail || member?.email || 'N/A',
          'Registration Type': reg.registrationType,
          'Status': reg.status,
          'Attended': attendanceRecord ? 'Yes' : 'No',
          'Validated At': attendanceRecord?.scannedAt || '',
          'Registered At': reg.createdAt
        };
      }));

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${event.name}_attendance.json"`);
      res.json({ event, registrations: csvData });
    } catch (error) {
      res.status(500).json({ message: "Failed to export attendance" });
    }
  });

  // Analytics endpoint
  app.get("/api/analytics", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const events = await storage.getEvents();
      const members = await storage.getMembers();
      const stats = await storage.getAttendanceStats();
      
      // Calculate analytics
      const totalEvents = events.length;
      const activeEvents = events.filter(e => e.status === 'active').length;
      const completedEvents = events.filter(e => e.status === 'completed').length;
      
      const auxiliaryBodyDistribution = members.reduce((acc, member) => {
        acc[member.auxiliaryBody] = (acc[member.auxiliaryBody] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const eventAnalytics = await Promise.all(events.map(async (event) => {
        const registrations = await storage.getEventRegistrations(event.id);
        const attendance = await storage.getAttendance(event.id);
        return {
          eventId: event.id,
          name: event.name,
          totalRegistrations: registrations.length,
          totalAttendance: attendance.length,
          attendanceRate: registrations.length > 0 ? (attendance.length / registrations.length) * 100 : 0,
          memberRegistrations: registrations.filter(r => r.registrationType === 'member').length,
          guestRegistrations: registrations.filter(r => r.registrationType === 'guest').length,
          inviteeRegistrations: registrations.filter(r => r.registrationType === 'invitee').length,
        };
      }));

      res.json({
        totalEvents,
        activeEvents,
        completedEvents,
        totalMembers: members.length,
        auxiliaryBodyDistribution,
        eventAnalytics,
        overallStats: stats
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Manage Invitees endpoints
  app.get("/api/events/:eventId/invitees", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const invitees = await storage.getEventInvitations(eventId);
      res.json(invitees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invitees" });
    }
  });

  app.post("/api/events/:eventId/invitees", authenticateToken, requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const { email, name, message } = req.body;
      
      const invitation = await storage.createInvitation({
        eventId,
        inviteeEmail: email,
        inviteeName: name,
        invitedBy: req.user!.id,
        status: 'sent'
      });
      
      res.status(201).json(invitation);
    } catch (error) {
      res.status(400).json({ message: "Failed to create invitation" });
    }
  });

  // System Settings endpoints
  app.get("/api/settings", authenticateToken, requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      // Return current system settings
      res.json({
        emailEnabled: !!process.env.SMTP_USER,
        qrValidationTime: 24, // hours
        auxiliaryBodies: ['Atfal', 'Khuddam', 'Lajna', 'Ansarullah', 'Nasra'],
        systemVersion: '1.0.0',
        databaseConnected: true
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Reports endpoints
  app.get("/api/reports", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Get all reports with event information
      const reports = await storage.getAllEventReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/events/:eventId/reports", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const reports = await storage.getEventReports(eventId);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post("/api/events/:eventId/reports", async (req: Request, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const { name, email, phone, reportType, message } = req.body;
      
      const report = await storage.createEventReport({
        eventId,
        reporterName: name,
        reporterEmail: email,
        reporterPhone: phone,
        reportType,
        message,
        status: 'pending'
      });
      
      res.status(201).json(report);
    } catch (error) {
      res.status(400).json({ message: "Failed to submit report" });
    }
  });

  app.put("/api/reports/:id", authenticateToken, requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const { status, reviewNotes } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const validStatuses = ['pending', 'reviewed', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updates: any = { status };
      if (reviewNotes) {
        updates.reviewNotes = reviewNotes;
      }
      
      const updatedReport = await storage.updateEventReport(reportId, updates);
      
      if (!updatedReport) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      res.json(updatedReport);
    } catch (error) {
      res.status(500).json({ message: "Failed to update report" });
    }
  });

  app.post("/api/validate-id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { uniqueId } = req.body;
      
      if (!uniqueId) {
        return res.status(400).json({ message: "Unique ID is required" });
      }

      // Find registration by unique ID
      const registration = await storage.getEventRegistrationByUniqueId(uniqueId);
      if (!registration) {
        return res.status(404).json({ 
          message: "Registration not found",
          validationStatus: "invalid" 
        });
      }

      // Check if already attended
      if (registration.status === "online" || registration.status === "attended") {
        return res.status(400).json({ 
          message: "This registration has already been validated",
          validationStatus: "duplicate" 
        });
      }

      const event = await storage.getEvent(registration.eventId);
      if (!event) {
        return res.status(404).json({ 
          message: "Event not found",
          validationStatus: "invalid" 
        });
      }

      let member = null;
      if (registration.memberId) {
        member = await storage.getMember(registration.memberId);
        
        // Check auxiliary body eligibility
        if (member && !event.eligibleAuxiliaryBodies.includes(member.auxiliaryBody)) {
          return res.status(403).json({ 
            message: `${member.auxiliaryBody} members not eligible for this event`,
            validationStatus: "invalid" 
          });
        }
      }

      // Enhanced CSV validation logic based on registration type
      const csvData = await storage.getMemberValidationCsv(registration.eventId);
      console.log(`CSV Data found: ${csvData.length} files for event ${registration.eventId}`);
      console.log(`Registration type: ${registration.registrationType}`);
      
      let csvValidationPassed = true;
      let validationRequired = false;
      
      // Determine if CSV validation is required
      if (csvData.length > 0 && registration.registrationType === 'member') {
        // CSV validation is required only for members when CSV exists
        validationRequired = true;
        console.log(`CSV validation required for member registration:`, {
          name: registration.guestName,
          email: registration.guestEmail,
          chanda: registration.guestChandaNumber
        });
        
        // Check if user exists in any of the CSV files
        csvValidationPassed = csvData.some(csv => 
          csv.memberData.some((member: any) => {
            // Support multiple possible field names for CSV data
            const csvName = member.name || member.Fullname || member.fullName || member.fullname;
            const csvEmail = member.email || member.Email || member.emailAddress;
            const csvChanda = member.chandaNumber || member.ChandaNO || member.chandaNo || member.chanda_number;
            
            // Compare name (case insensitive)
            const nameMatch = csvName && registration.guestName && 
              csvName.toLowerCase().trim() === registration.guestName.toLowerCase().trim();
            
            // Compare email (case insensitive)
            const emailMatch = csvEmail && registration.guestEmail && 
              csvEmail.toLowerCase().trim() === registration.guestEmail.toLowerCase().trim();
            
            // Compare chanda number
            const chandaMatch = csvChanda && registration.guestChandaNumber && 
              csvChanda.toString().trim() === registration.guestChandaNumber.toString().trim();
            
            console.log(`CSV Validation Check:
              CSV Member: ${csvName} | ${csvEmail} | ${csvChanda}
              Registration: ${registration.guestName} | ${registration.guestEmail} | ${registration.guestChandaNumber}
              Matches: name=${nameMatch}, email=${emailMatch}, chanda=${chandaMatch}`);
            
            return nameMatch || emailMatch || chandaMatch;
          })
        );
        
        if (!csvValidationPassed) {
          return res.status(403).json({ 
            message: "Member validation failed. Your information was not found in the member validation list. Please contact the event organizer.",
            validationStatus: "csv_validation_failed",
            details: "Members must be validated against the uploaded member list for this event." 
          });
        }
      } else if (registration.registrationType === 'guest' || registration.registrationType === 'invitee') {
        // Guests and invitees are allowed regardless of CSV content
        console.log(`Allowing ${registration.registrationType} registration - CSV validation not required`);
        csvValidationPassed = true;
      } else if (csvData.length === 0) {
        // No CSV uploaded - allow all registrations
        console.log(`No CSV validation data found - allowing all registration types`);
        csvValidationPassed = true;
      }
      
      console.log(`CSV Validation Result: Required=${validationRequired}, Passed=${csvValidationPassed}`);

      // Create attendance record
      const attendanceData = {
        eventId: registration.eventId,
        registrationId: registration.id,
        scannedBy: req.user!.id,
        validationStatus: "valid" as const,
      };

      const attendanceRecord = await storage.createAttendance(attendanceData);
      
      // Update registration status to "online"
      await storage.updateEventRegistration(registration.id, { 
        status: "online",
        validationMethod: "manual_validation"
      });

      // Update member status to "online" if member exists
      if (member) {
        await storage.updateMember(member.id, { status: "online" });
      }

      res.json({
        message: "Validation successful",
        validationStatus: "valid",
        member,
        event,
        registration,
        attendance: attendanceRecord,
      });

    } catch (error) {
      res.status(500).json({ 
        message: "Validation failed",
        validationStatus: "invalid" 
      });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
    try {
      const attendanceStats = await storage.getAttendanceStats();
      const totalMembers = (await storage.getMembers()).length;
      const activeEvents = (await storage.getEvents({ status: "active" })).length;
      const totalRegistrations = (await storage.getEventRegistrations()).length;

      res.json({
        totalMembers,
        activeEvents,
        totalRegistrations,
        ...attendanceStats,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Generate QR for existing registration
  app.get("/api/registrations/:id/qr", authenticateToken, async (req, res) => {
    try {
      const registrationId = parseInt(req.params.id);
      const registration = await storage.getEventRegistration(registrationId);
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      const qrData: QRData = {
        registrationId: registration.id,
        eventId: registration.eventId!,
        memberId: registration.memberId!,
        type: registration.registrationType as "member" | "guest" | "invitee",
        timestamp: Date.now(),
      };

      const qrImageData = await generateQRImage(encryptQRData(qrData));
      res.json({ qrImageData });
      
    } catch (error) {
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // CSV Member Import routes
  app.get("/api/events/:eventId/csv-validation", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const csvs = await storage.getMemberValidationCsv(eventId);
      res.json(csvs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch CSV data" });
    }
  });

  app.post("/api/events/:eventId/csv-validation", authenticateToken, requireRole(["admin"]), upload.single('csvFile'), async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      
      if (!req.file) {
        return res.status(400).json({ message: "CSV file is required" });
      }

      // Parse CSV file
      const csvData = req.file.buffer.toString('utf8');
      const lines = csvData.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV file must contain header and at least one data row" });
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const memberData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const member: any = {};
        headers.forEach((header, index) => {
          member[header] = values[index] || '';
        });
        return member;
      });

      const csv = await storage.createMemberValidationCsv({
        eventId,
        fileName: req.file.originalname,
        uploadedBy: req.user!.id,
        memberData: memberData as any
      });

      res.status(201).json(csv);
    } catch (error) {
      res.status(400).json({ message: "Failed to upload CSV data" });
    }
  });

  app.delete("/api/csv-validation/:id", authenticateToken, requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMemberValidationCsv(id);
      
      if (!success) {
        return res.status(404).json({ message: "CSV data not found" });
      }
      
      res.json({ message: "CSV data deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete CSV data" });
    }
  });

  // Face Recognition routes
  app.get("/api/events/:eventId/face-recognition", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const photos = await storage.getFaceRecognitionPhotos(eventId);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch face recognition photos" });
    }
  });

  app.post("/api/events/:eventId/face-recognition", authenticateToken, requireRole(["admin"]), upload.single('photoFile'), async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const { memberName, auxiliaryBody, chandaNumber, memberId } = req.body;
      
      if (!req.file || !memberName) {
        return res.status(400).json({ message: "Photo file and member name are required" });
      }

      // Convert photo to base64 for storage
      const photoBuffer = req.file.buffer;
      const photoUrl = `data:${req.file.mimetype};base64,${photoBuffer.toString('base64')}`;

      const photo = await storage.createFaceRecognitionPhoto({
        eventId,
        memberId: memberId ? parseInt(memberId) : undefined,
        photoUrl,
        memberName,
        auxiliaryBody,
        chandaNumber,
        uploadedBy: req.user!.id,
        isActive: true
      });

      res.status(201).json(photo);
    } catch (error) {
      res.status(400).json({ message: "Failed to upload face recognition photo" });
    }
  });

  app.delete("/api/face-recognition/:id", authenticateToken, requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteFaceRecognitionPhoto(id);
      
      if (!success) {
        return res.status(404).json({ message: "Photo not found" });
      }
      
      res.json({ message: "Photo deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // Enhanced validation with CSV check
  app.post("/api/validate-enhanced", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { uniqueId, eventId, validationType } = req.body;
      
      if (!uniqueId || !eventId) {
        return res.status(400).json({ message: "Unique ID and Event ID are required" });
      }

      // Find registration by unique ID
      const registration = await storage.getEventRegistrationByUniqueId(uniqueId);
      if (!registration) {
        return res.status(404).json({ 
          message: "Registration not found",
          validationStatus: "invalid" 
        });
      }

      // Check if event is closed
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.endDate && new Date() > event.endDate) {
        return res.status(400).json({ 
          message: "Event has ended",
          validationStatus: "event_closed" 
        });
      }

      // Check if already validated
      if (registration.status === "online" || registration.status === "attended") {
        return res.status(400).json({ 
          message: "This registration has already been validated",
          validationStatus: "duplicate" 
        });
      }

      // Additional CSV validation if CSV data exists
      const csvData = await storage.getMemberValidationCsv(eventId);
      console.log(`CSV Data found: ${csvData.length} files`);
      let csvValidationPassed = true;
      
      if (csvData.length > 0) {
        console.log(`Starting CSV validation for registration:`, {
          name: registration.guestName,
          email: registration.guestEmail,
          chanda: registration.guestChandaNumber
        });
        // Check if user exists in any of the CSV files
        csvValidationPassed = csvData.some(csv => 
          csv.memberData.some((member: any) => {
            // Support multiple possible field names for CSV data
            const csvName = member.name || member.Fullname || member.fullName || member.fullname;
            const csvEmail = member.email || member.Email || member.emailAddress;
            const csvChanda = member.chandaNumber || member.ChandaNO || member.chandaNo || member.chanda_number;
            
            // Compare name (case insensitive)
            const nameMatch = csvName && registration.guestName && 
              csvName.toLowerCase().trim() === registration.guestName.toLowerCase().trim();
            
            // Compare email (case insensitive)
            const emailMatch = csvEmail && registration.guestEmail && 
              csvEmail.toLowerCase().trim() === registration.guestEmail.toLowerCase().trim();
            
            // Compare chanda number
            const chandaMatch = csvChanda && registration.guestChandaNumber && 
              csvChanda.toString().trim() === registration.guestChandaNumber.toString().trim();
            
            console.log(`CSV Validation Check:
              CSV Member: ${csvName} | ${csvEmail} | ${csvChanda}
              Registration: ${registration.guestName} | ${registration.guestEmail} | ${registration.guestChandaNumber}
              Matches: name=${nameMatch}, email=${emailMatch}, chanda=${chandaMatch}`);
            
            return nameMatch || emailMatch || chandaMatch;
          })
        );
        
        if (!csvValidationPassed) {
          return res.status(403).json({ 
            message: "Member not found in validation list. Please ensure your name, email, or chanda number matches our records.",
            validationStatus: "csv_validation_failed" 
          });
        }
      }

      // Update registration status to "online"
      await storage.updateEventRegistration(registration.id, { 
        status: "online",
        validationMethod: validationType || "manual_id"
      });

      // Update member status to "online" if member exists
      if (registration.memberId) {
        const member = await storage.getMember(registration.memberId);
        if (member) {
          await storage.updateMember(registration.memberId, { status: "online" });
        }
      }

      // Create attendance record
      await storage.createAttendance({
        eventId,
        registrationId: registration.id,
        scannedBy: req.user!.id,
        validationStatus: "valid",
        notes: `Validated via ${validationType || 'manual_id'}`
      });

      res.json({
        message: "Validation successful",
        validationStatus: "valid",
        registration,
        event,
        csvValidationPassed
      });

    } catch (error) {
      res.status(500).json({ message: "Validation failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
