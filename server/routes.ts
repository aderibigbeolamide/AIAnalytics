import type { Express } from "express";
import { createServer, type Server } from "http";
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
  encryptQRData, 
  decryptQRData, 
  validateQRData,
  type QRData 
} from "./qr";
import { 
  insertUserSchema, 
  insertMemberSchema, 
  insertEventSchema,
  insertEventRegistrationSchema,
  insertAttendanceSchema
} from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
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

  // Member routes
  app.get("/api/members", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { auxiliaryBody, search } = req.query;
      const members = await storage.getMembers({
        auxiliaryBody: auxiliaryBody as string,
        search: search as string,
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
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
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

  app.post("/api/events", authenticateToken, requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      eventData.createdBy = req.user!.id;
      
      const event = await storage.createEvent(eventData);
      
      // Generate QR code for the event
      const qrCode = generateQRCode();
      await storage.updateEvent(event.id, { qrCode });
      
      const updatedEvent = await storage.getEvent(event.id);
      res.status(201).json(updatedEvent);
    } catch (error) {
      res.status(400).json({ message: "Failed to create event" });
    }
  });

  app.put("/api/events/:id", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertEventSchema.partial().parse(req.body);
      const event = await storage.updateEvent(id, updates);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(400).json({ message: "Failed to update event" });
    }
  });

  // Event registration routes
  app.get("/api/events/:id/registrations", authenticateToken, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const registrations = await storage.getEventRegistrations(eventId);
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  app.post("/api/events/:id/register", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const member = await storage.getMemberByUserId(req.user!.id);
      const qrCode = generateQRCode();
      
      const registrationData = {
        eventId,
        memberId: member?.id,
        userId: req.user!.id,
        registrationType: member ? "member" : "guest",
        qrCode,
      };

      const registration = await storage.createEventRegistration(registrationData);
      
      // Generate QR data
      const qrData: QRData = {
        registrationId: registration.id,
        eventId,
        memberId: member?.id,
        type: member ? "member" : "guest",
        timestamp: Date.now(),
      };
      
      const qrImageData = await generateQRImage(encryptQRData(qrData));
      
      res.status(201).json({ registration, qrImageData });
    } catch (error) {
      res.status(400).json({ message: "Failed to register for event" });
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

      // Create attendance record
      const attendanceData = {
        eventId: qrData.eventId,
        registrationId: qrData.registrationId,
        scannedBy: req.user!.id,
        validationStatus: "valid" as const,
      };

      const attendanceRecord = await storage.createAttendance(attendanceData);
      
      // Update registration status
      await storage.updateEventRegistration(registration.id, { status: "attended" });

      res.json({
        message: "Validation successful",
        validationStatus: "valid",
        member,
        event,
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

      res.json({
        totalMembers,
        activeEvents,
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

  const httpServer = createServer(app);
  return httpServer;
}
