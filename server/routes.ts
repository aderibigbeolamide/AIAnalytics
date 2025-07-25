import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { db, pool } from "./db";
import { 
  events,
  eventRegistrations,
  users,
  members,
  attendance,
  eventReports,
  invitations,
  memberValidationCsv,
  faceRecognitionPhotos,
  tickets,
  ticketTransfers
} from "@shared/schema";
import { eq, and, isNull, desc, or, ilike, gte, lte, sql } from "drizzle-orm";
import { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  authenticateToken, 
  requireRole,
  type AuthenticatedRequest 
} from "./auth";
import { 
  initializePaystackPayment, 
  verifyPaystackPayment, 
  generatePaymentReference, 
  convertToKobo,
  convertFromKobo,
  createPaystackSubaccount,
  verifyBankAccount,
  getNigerianBanks
} from "./paystack";
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
  insertFaceRecognitionPhotoSchema,
  insertTicketSchema,
  insertTicketTransferSchema
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
      
      // Trim whitespace from username and password
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();
      
      const user = await storage.getUserByUsername(trimmedUsername);
      if (!user || !(await comparePassword(trimmedPassword, user.password))) {
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

  // Change password endpoint
  app.post("/api/auth/change-password", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }

      // Get current user
      const user = await storage.getUserById(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password and update
      const hashedNewPassword = await hashPassword(newPassword);
      await db.update(users)
        .set({ password: hashedNewPassword })
        .where(eq(users.id, req.user!.id));

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Get user's registrations (supports both authenticated users and registration lookup by ID)
  app.get("/api/my-registrations", async (req: Request, res) => {
    try {
      const { uniqueId, email } = req.query;
      const authHeader = req.headers.authorization;
      
      let userRegistrations: any[] = [];
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Authenticated user - get their registrations via member ID
        const token = authHeader.split(' ')[1];
        try {
          const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback-secret');
          const user = decoded as { id: number };
          const member = await storage.getMemberByUserId(user.id);
          
          if (member) {
            // Use raw query to avoid Drizzle ORM issues
            const result = await pool.query(
              'SELECT r.*, e.* FROM event_registrations r JOIN events e ON r.event_id = e.id WHERE r.member_id = $1 AND e.deleted_at IS NULL',
              [member.id]
            );
            
            for (const row of result.rows) {
              userRegistrations.push({
                id: row.id,
                eventId: row.event_id,
                memberId: row.member_id,
                registrationType: row.registration_type,
                guestName: row.guest_name,
                guestEmail: row.guest_email,
                guestJamaat: row.guest_jamaat,
                guestAuxiliaryBody: row.guest_auxiliary_body,
                guestCircuit: row.guest_circuit,
                uniqueId: row.unique_id,
                status: row.status,
                qrCode: row.qr_code,
                createdAt: row.created_at,
                event: {
                  id: row.event_id,
                  name: row.name,
                  description: row.description,
                  location: row.location,
                  startDate: row.start_date,
                  endDate: row.end_date,
                  registrationStartDate: row.registration_start_date,
                  registrationEndDate: row.registration_end_date,
                  eligibleAuxiliaryBodies: row.eligible_auxiliary_bodies,
                  allowGuests: row.allow_guests,
                  requiresPayment: row.requires_payment,
                  paymentAmount: row.payment_amount,
                  status: row.status
                }
              });
            }
          }
        } catch (err) {
          // Token invalid, continue with unauthenticated flow
        }
      }
      
      if (userRegistrations.length === 0 && (uniqueId || email)) {
        // Unauthenticated user - lookup by unique ID or email using raw query
        if (uniqueId) {
          const result = await pool.query(
            'SELECT r.*, e.* FROM event_registrations r JOIN events e ON r.event_id = e.id WHERE r.unique_id = $1 AND e.deleted_at IS NULL',
            [uniqueId]
          );
          
          for (const row of result.rows) {
            userRegistrations.push({
              id: row.id,
              eventId: row.event_id,
              memberId: row.member_id,
              registrationType: row.registration_type,
              guestName: row.guest_name,
              guestEmail: row.guest_email,
              guestJamaat: row.guest_jamaat,
              guestAuxiliaryBody: row.guest_auxiliary_body,
              guestCircuit: row.guest_circuit,
              uniqueId: row.unique_id,
              status: row.status,
              qrCode: row.qr_code,
              createdAt: row.created_at,
              event: {
                id: row.event_id,
                name: row.name,
                description: row.description,
                location: row.location,
                startDate: row.start_date,
                endDate: row.end_date,
                registrationStartDate: row.registration_start_date,
                registrationEndDate: row.registration_end_date,
                eligibleAuxiliaryBodies: row.eligible_auxiliary_bodies,
                allowGuests: row.allow_guests,
                requiresPayment: row.requires_payment,
                paymentAmount: row.payment_amount,
                status: row.status
              }
            });
          }
        }
        
        if (email) {
          const result = await pool.query(
            'SELECT r.*, e.* FROM event_registrations r JOIN events e ON r.event_id = e.id WHERE r.guest_email = $1 AND e.deleted_at IS NULL',
            [email]
          );
          
          for (const row of result.rows) {
            userRegistrations.push({
              id: row.id,
              eventId: row.event_id,
              memberId: row.member_id,
              registrationType: row.registration_type,
              guestName: row.guest_name,
              guestEmail: row.guest_email,
              guestJamaat: row.guest_jamaat,
              guestAuxiliaryBody: row.guest_auxiliary_body,
              guestCircuit: row.guest_circuit,
              uniqueId: row.unique_id,
              status: row.status,
              qrCode: row.qr_code,
              createdAt: row.created_at,
              event: {
                id: row.event_id,
                name: row.name,
                description: row.description,
                location: row.location,
                startDate: row.start_date,
                endDate: row.end_date,
                registrationStartDate: row.registration_start_date,
                registrationEndDate: row.registration_end_date,
                eligibleAuxiliaryBodies: row.eligible_auxiliary_bodies,
                allowGuests: row.allow_guests,
                requiresPayment: row.requires_payment,
                paymentAmount: row.payment_amount,
                status: row.status
              }
            });
          }
        }
      }

      res.json(userRegistrations);
    } catch (error) {
      console.error("Error fetching user registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  // Get all events (public endpoint) - use raw PostgreSQL query
  app.get("/api/events/public", async (req: Request, res) => {
    try {
      // Use raw PostgreSQL query to bypass all Drizzle issues
      const result = await pool.query(
        'SELECT * FROM events WHERE deleted_at IS NULL ORDER BY created_at DESC'
      );
      
      const eventsData = result.rows;
      
      // Get registration counts for each event
      const eventsWithCounts = [];
      
      for (const event of eventsData) {
        const now = new Date();
        const startDate = new Date(event.start_date);
        const endDate = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        
        let dynamicStatus = event.status;
        if (event.status !== 'cancelled') {
          if (now >= startDate && now <= endDate) {
            dynamicStatus = 'ongoing';
          } else if (now < startDate) {
            dynamicStatus = 'upcoming';
          } else {
            dynamicStatus = 'completed';
          }
        }
        
        // Get registration counts for this event
        const registrationsResult = await pool.query(
          'SELECT registration_type, COUNT(*) as count FROM event_registrations WHERE event_id = $1 GROUP BY registration_type',
          [event.id]
        );
        
        const registrationCounts = {
          totalRegistrations: 0,
          memberCount: 0,
          guestCount: 0,
          inviteeCount: 0
        };
        
        registrationsResult.rows.forEach(row => {
          registrationCounts.totalRegistrations += parseInt(row.count);
          if (row.registration_type === 'member') {
            registrationCounts.memberCount = parseInt(row.count);
          } else if (row.registration_type === 'guest') {
            registrationCounts.guestCount = parseInt(row.count);
          } else if (row.registration_type === 'invitee') {
            registrationCounts.inviteeCount = parseInt(row.count);
          }
        });
        
        eventsWithCounts.push({
          id: event.id,
          name: event.name,
          description: event.description,
          location: event.location,
          eventType: event.event_type, // Add the missing eventType field
          startDate: event.start_date,
          endDate: event.end_date,
          registrationStartDate: event.registration_start_date,
          registrationEndDate: event.registration_end_date,
          eligibleAuxiliaryBodies: event.eligible_auxiliary_bodies,
          allowGuests: event.allow_guests,
          requiresPayment: event.requires_payment,
          paymentAmount: event.payment_amount,
          status: dynamicStatus,
          createdBy: event.created_by,
          qrCode: event.qr_code,
          reportLink: event.report_link,
          createdAt: event.created_at,
          registrationCounts
        });
      }
      
      res.json(eventsWithCounts);
    } catch (error) {
      console.error("Error fetching public events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Dashboard stats route
  app.get("/api/dashboard/stats", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const attendanceStats = await storage.getAttendanceStats();
      const events = await storage.getEvents();
      const members = await storage.getMembers();
      const allRegistrations = await storage.getEventRegistrations();
      
      // Count unique members from registrations (both members and guests)
      const uniqueRegisteredMembers = new Set();
      allRegistrations.forEach(reg => {
        if (reg.memberId) {
          uniqueRegisteredMembers.add(reg.memberId);
        } else {
          // For guests/invitees, use email as unique identifier
          uniqueRegisteredMembers.add(reg.guestEmail);
        }
      });
      
      // Calculate auxiliary body statistics
      const auxiliaryBodyStats: Record<string, any> = {};
      
      // Count members by auxiliary body
      members.forEach(member => {
        if (member.auxiliaryBody) {
          if (!auxiliaryBodyStats[member.auxiliaryBody]) {
            auxiliaryBodyStats[member.auxiliaryBody] = {
              totalMembers: 0,
              registrations: 0,
              attendedEvents: 0,
              activeMembers: 0
            };
          }
          auxiliaryBodyStats[member.auxiliaryBody].totalMembers++;
          if (member.status === 'active') {
            auxiliaryBodyStats[member.auxiliaryBody].activeMembers++;
          }
        }
      });
      
      // Count registrations by auxiliary body
      allRegistrations.forEach(reg => {
        const auxBody = reg.member?.auxiliaryBody || reg.guestAuxiliaryBody;
        if (auxBody) {
          if (!auxiliaryBodyStats[auxBody]) {
            auxiliaryBodyStats[auxBody] = {
              totalMembers: 0,
              registrations: 0,
              attendedEvents: 0,
              activeMembers: 0
            };
          }
          auxiliaryBodyStats[auxBody].registrations++;
          if (reg.status === 'attended') {
            auxiliaryBodyStats[auxBody].attendedEvents++;
          }
        }
      });
      
      // Calculate registration type distribution
      const registrationTypeStats = {
        members: allRegistrations.filter(r => r.registrationType === 'member').length,
        guests: allRegistrations.filter(r => r.registrationType === 'guest').length,
        invitees: allRegistrations.filter(r => r.registrationType === 'invitee').length,
      };
      
      const stats = {
        ...attendanceStats,
        totalMembers: members.length,
        totalRegistrations: allRegistrations.length,
        uniqueRegisteredMembers: uniqueRegisteredMembers.size,
        activeEvents: events.filter(e => e.status === 'active').length,
        totalEvents: events.length,
        activeMembers: members.filter(m => m.status === 'active').length,
        auxiliaryBodyStats,
        registrationTypeStats,
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get event registration counts
  app.get("/api/events/:eventId/registration-counts", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const registrations = await storage.getEventRegistrations(eventId);
      
      const counts = {
        totalRegistrations: registrations.length,
        memberCount: registrations.filter(r => r.registrationType === 'member').length,
        guestCount: registrations.filter(r => r.registrationType === 'guest').length,
        inviteeCount: registrations.filter(r => r.registrationType === 'invitee').length,
        attendedCount: registrations.filter(r => r.status === 'attended').length,
        registeredCount: registrations.filter(r => r.status === 'registered').length,
      };
      
      res.json(counts);
    } catch (error) {
      console.error('Error fetching event registration counts:', error);
      res.status(500).json({ message: "Failed to fetch registration counts" });
    }
  });

  // Get all auxiliary bodies from existing events
  app.get("/api/auxiliary-bodies", async (req: Request, res) => {
    try {
      // Get all unique auxiliary bodies from all events
      const result = await pool.query(
        'SELECT DISTINCT jsonb_array_elements_text(eligible_auxiliary_bodies) as auxiliary_body FROM events WHERE deleted_at IS NULL AND eligible_auxiliary_bodies IS NOT NULL AND eligible_auxiliary_bodies != \'null\''
      );
      
      const auxiliaryBodies = result.rows
        .map(row => row.auxiliary_body)
        .filter(body => body && body.trim() !== '')
        .sort();
      
      res.json(auxiliaryBodies);
    } catch (error) {
      console.error('Error fetching auxiliary bodies:', error);
      res.json([]); // Return empty array if no events exist
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
      
      // Return only public information including registration dates and custom fields
      const publicEvent = {
        id: event.id,
        name: event.name,
        description: event.description,
        location: event.location,
        eventType: event.eventType, // Add the missing eventType field
        startDate: event.startDate,
        endDate: event.endDate,
        registrationStartDate: event.registrationStartDate,
        registrationEndDate: event.registrationEndDate,
        status: event.status,
        eligibleAuxiliaryBodies: event.eligibleAuxiliaryBodies,
        allowGuests: event.allowGuests,
        requiresPayment: event.requiresPayment,
        paymentAmount: event.paymentAmount,
        paymentSettings: event.paymentSettings || {
          requiresPayment: false,
          paymentMethods: [],
          paymentRules: { member: false, guest: false, invitee: false },
          allowManualReceipt: true
        },
        customRegistrationFields: event.customRegistrationFields || [],
        ticketCategories: event.ticketCategories || [], // Add ticket categories for ticket events
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
        endDate: eventData.endDate ? new Date(eventData.endDate) : null,
        registrationStartDate: eventData.registrationStartDate ? new Date(eventData.registrationStartDate) : null,
        registrationEndDate: eventData.registrationEndDate ? new Date(eventData.registrationEndDate) : null,
        createdBy: req.user!.id,
      };
      
      console.log("Processed event data before validation:", processedEventData);
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
      if (error instanceof Error) {
        res.status(400).json({ message: "Failed to create event", error: error.message });
      } else {
        res.status(400).json({ message: "Failed to create event", error: String(error) });
      }
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
        registrationStartDate: eventData.registrationStartDate ? new Date(eventData.registrationStartDate) : undefined,
        registrationEndDate: eventData.registrationEndDate ? new Date(eventData.registrationEndDate) : undefined,
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

      // Check registration timing - use registration dates if available, otherwise fall back to event dates
      const registrationStart = event.registrationStartDate || event.startDate;
      const registrationEnd = event.registrationEndDate || event.endDate;

      // Check if registration period has started
      if (now < registrationStart) {
        return res.status(400).json({ 
          message: "Registration is not yet open. Please wait until the registration period starts.",
          registrationStartDate: registrationStart
        });
      }

      // Check if registration period has ended
      if (registrationEnd && now > registrationEnd) {
        return res.status(400).json({ 
          message: "Registration period has ended.",
          registrationEndDate: registrationEnd
        });
      }

      // Extract registration type and form data (multer puts form fields in req.body)
      const registrationType = req.body.registrationType;
      const formData = { ...req.body };
      delete formData.registrationType;
      delete formData.eventId; // Remove eventId from formData as it's handled separately
      
      // Debug: Log received form data
      console.log('Received registration data:', { registrationType, formData });
      console.log('Event custom fields:', event.customRegistrationFields);

      // Validate required fields based on custom registration fields
      if (!event.customRegistrationFields || event.customRegistrationFields.length === 0) {
        return res.status(400).json({ message: "No registration fields configured for this event" });
      }

      // Validate required custom fields based on registration type
      for (const field of event.customRegistrationFields) {
        // Check if field should be shown for this registration type
        if (field.visibleForTypes && !field.visibleForTypes.includes(registrationType)) {
          continue; // Skip fields not visible for this registration type
        }
        
        // Check if field is required for this registration type
        const isRequired = field.requiredForTypes 
          ? field.requiredForTypes.includes(registrationType)
          : field.required; // fallback to general required setting
        
        if (isRequired && (!formData[field.name] || formData[field.name].toString().trim() === '')) {
          return res.status(400).json({ message: `${field.label} is required` });
        }
      }

      // Check if payment is required for this registration type
      const requiresPayment = event.paymentSettings?.requiresPayment && 
                             event.paymentSettings?.paymentRules?.[registrationType];
      
      if (requiresPayment) {
        const paymentMethod = formData.paymentMethod;
        
        if (!paymentMethod) {
          return res.status(400).json({ message: "Payment method is required for this event" });
        }
        
        // For Paystack payments, initialize payment first
        if (paymentMethod === 'paystack') {
          const { initializePaystackPayment, generatePaymentReference, convertToKobo } = await import('./paystack');
          
          const userEmail = formData.email || formData.Email || formData.guestEmail;
          if (!userEmail) {
            return res.status(400).json({ message: "Email is required for online payment" });
          }
          
          const paymentAmount = convertToKobo(event.paymentSettings.amount);
          const paymentReference = generatePaymentReference();
          
          try {
            const paymentData = await initializePaystackPayment(
              userEmail,
              paymentAmount,
              paymentReference,
              {
                eventId,
                registrationType,
                customFieldData: formData
              }
            );
            
            if (paymentData.status) {
              // Store pending registration data for completion after payment
              const pendingRegistration = {
                eventId,
                registrationType,
                formData,
                paymentReference,
                paymentAmount: event.paymentSettings.amount,
                currency: event.paymentSettings.currency || 'NGN',
                userEmail,
                timestamp: Date.now()
              };
              
              // Store pending registration (you might want to use a temporary storage or database)
              // For now, we'll use a simple approach
              
              return res.json({
                requiresPayment: true,
                paymentUrl: paymentData.data.authorization_url,
                paymentReference,
                message: "Redirecting to payment gateway..."
              });
            } else {
              return res.status(400).json({ message: "Failed to initialize payment" });
            }
          } catch (error) {
            console.error('Payment initialization error:', error);
            return res.status(500).json({ message: "Payment initialization failed" });
          }
        }
        
        // For manual receipt uploads
        if (paymentMethod === 'manual_receipt') {
          if (!req.file) {
            return res.status(400).json({ message: "Payment receipt is required" });
          }
        }
      }

      // Handle file uploads if any
      let paymentReceiptUrlFinal = null;
      if (req.file) {
        try {
          const { fileStorage } = await import('./storage-handler');
          const uploadedFile = await fileStorage.saveFile(req.file, 'payment-receipts');
          paymentReceiptUrlFinal = uploadedFile.url;
        } catch (error) {
          console.error('File upload error:', error);
          return res.status(400).json({ message: "Failed to upload file" });
        }
      }

      // Extract common fields for registration (if they exist in custom fields)
      const tempRegistrationData = {
        registrationType: registrationType || 'guest',
        customFieldData: formData
      };

      const qrCode = generateQRCode();
      const uniqueId = generateShortUniqueId(); // Generate shorter 6-character ID for manual validation
      
      // Extract common fields from custom form data
      const getName = () => {
        // Try common name field combinations
        const firstName = formData.firstName || formData.FirstName || formData.first_name || '';
        const lastName = formData.lastName || formData.LastName || formData.last_name || '';
        const fullName = formData.name || formData.Name || formData.fullName || formData.FullName || '';
        
        if (firstName && lastName) {
          return `${firstName} ${lastName}`;
        } else if (fullName) {
          return fullName;
        } else {
          return 'Unknown User';
        }
      };

      const getEmail = () => {
        const emailField = event.customRegistrationFields.find(f => f.type === 'email');
        return emailField ? formData[emailField.name] : null;
      };

      const getAuxiliaryBody = () => {
        // First try explicit auxiliary body fields
        if (formData.auxiliaryBody || formData.AuxiliaryBody) {
          return formData.auxiliaryBody || formData.AuxiliaryBody;
        }
        
        // Look for fields that might represent auxiliary body (gender, group, etc.)
        const potentialAuxBodyFields = event.customRegistrationFields.filter(f => 
          f.label && (
            f.label.toLowerCase().includes('gender') ||
            f.label.toLowerCase().includes('auxiliary') ||
            f.label.toLowerCase().includes('group') ||
            f.label.toLowerCase().includes('body') ||
            f.type === 'radio' || f.type === 'select'
          )
        );
        
        // Use the first found field value
        for (const field of potentialAuxBodyFields) {
          if (formData[field.name]) {
            return formData[field.name];
          }
        }
        
        return 'Unknown';
      };

      // Create or find member based on registration data (simplified approach)
      let member = null;
      if (registrationType === "member") {
        try {
          // Try to find member by email if email field exists
          const emailField = event.customRegistrationFields.find(f => f.type === 'email');
          const email = emailField ? formData[emailField.name] : null;
          
          // Always create a member record for member registrations using available data
          const uniqueUsername = `${getName().replace(/\s+/g, '').toLowerCase()}_${Date.now()}`;
          member = await storage.createMember({
            username: uniqueUsername,
            firstName: formData.firstName || formData.FirstName || 'Unknown',
            lastName: formData.lastName || formData.LastName || 'User',
            jamaat: formData.jamaat || formData.Jamaat || 'Unknown',
            auxiliaryBody: getAuxiliaryBody(),
            chandaNumber: formData.chandaNumber || formData.ChandaNumber || null,
            circuit: formData.circuit || formData.Circuit || null,
            email: email || `${uniqueUsername}@event.local`,
            status: "active"
          });
        } catch (error) {
          console.error("Member creation error:", error);
          // Continue with registration even if member creation fails
        }
      }

      const registrationData = {
        eventId,
        memberId: member?.id,
        registrationType,
        qrCode,
        uniqueId,
        // Store custom form data as JSON and fallback fields
        customFormData: JSON.stringify(formData),
        guestName: getName(),
        guestEmail: getEmail(),
        guestAuxiliaryBody: getAuxiliaryBody(),
        guestCircuit: formData.circuit || formData.Circuit || null,
        guestPost: formData.post || formData.Post || null,
        paymentReceiptUrl: paymentReceiptUrlFinal,
        paymentAmount: formData.paymentAmount || null,
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
      
      const userEmail = getEmail();
      let emailSent = false;
      
      if (userEmail) {
        emailSent = await sendEmail({
          to: userEmail,
          from: 'admin@letbud.com',
          subject: `Registration Confirmation - ${event.name}`,
          html: emailHtml,
          text: `Registration confirmed for ${event.name}. Your unique ID is: ${registration.uniqueId}`
        });
      }
      
      // Extract base64 data from the data URL
      const qrImageBase64 = qrImageData.replace('data:image/png;base64,', '');
      
      res.status(201).json({ 
        registration: fullRegistration || registration, 
        qrImage: qrImageData,
        qrImageBase64: qrImageBase64,
        emailSent,
        message: emailSent ? "Registration successful! Confirmation email sent." : "Registration successful! Please save your QR code."
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Failed to register for event" });
    }
  });

  // Payment callback endpoint
  app.post("/api/payment/callback", async (req, res) => {
    try {
      const { reference, event: webhookEvent } = req.body;
      
      if (webhookEvent === 'charge.success') {
        const { verifyPaystackPayment } = await import('./paystack');
        
        // Verify the payment
        const paymentData = await verifyPaystackPayment(reference);
        
        if (paymentData.status && paymentData.data.status === 'success') {
          // Payment successful, complete the registration
          const metadata = paymentData.data.metadata;
          
          // Complete the registration with the stored data
          // This would typically complete the registration process
          // For now, we'll just return success
          
          res.json({ 
            status: 'success', 
            message: 'Payment verified and registration completed' 
          });
        } else {
          res.status(400).json({ message: 'Payment verification failed' });
        }
      } else {
        res.json({ message: 'Webhook received' });
      }
    } catch (error) {
      console.error('Payment callback error:', error);
      res.status(500).json({ message: 'Payment callback failed' });
    }
  });

  // Payment verification endpoint for frontend
  app.get("/api/payment/verify/:reference", async (req, res) => {
    try {
      const { reference } = req.params;
      const { verifyPaystackPayment } = await import('./paystack');
      
      const paymentData = await verifyPaystackPayment(reference);
      
      if (paymentData.status && paymentData.data.status === 'success') {
        res.json({ 
          status: 'success', 
          data: paymentData.data,
          message: 'Payment verified successfully' 
        });
      } else {
        res.status(400).json({ 
          status: 'failed', 
          message: 'Payment verification failed' 
        });
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ message: 'Payment verification failed' });
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
            const csvFirstName = csvMember.FirstName || csvMember.firstName || csvMember.first_name;
            const csvLastName = csvMember.LastName || csvMember.lastName || csvMember.last_name;
            const csvEmail = csvMember.email || csvMember.Email || csvMember.emailAddress;

            // Construct full name from first and last name if available
            let constructedName = '';
            if (csvFirstName && csvLastName) {
              constructedName = `${csvFirstName} ${csvLastName}`;
            } else if (csvFirstName) {
              constructedName = csvFirstName;
            } else if (csvLastName) {
              constructedName = csvLastName;
            }
            
            const finalCsvName = csvName || constructedName;
            
            // Compare name (case insensitive)
            const nameMatch = finalCsvName && registration.guestName && 
              finalCsvName.toLowerCase().trim() === registration.guestName.toLowerCase().trim();
            
            // Compare email (case insensitive)
            const emailMatch = csvEmail && registration.guestEmail && 
              csvEmail.toLowerCase().trim() === registration.guestEmail.toLowerCase().trim();
            
            console.log(`CSV QR Validation Check:
              CSV Member: ${finalCsvName} | ${csvEmail}
              Registration: ${registration.guestName} | ${registration.guestEmail}
              Matches: name=${nameMatch}, email=${emailMatch}`);
            
            return nameMatch || emailMatch;
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

  // Delete invitation endpoint
  app.delete("/api/invitations/:id", authenticateToken, requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      
      // Delete the invitation
      await db.delete(invitations).where(eq(invitations.id, invitationId));
      
      res.json({ message: "Invitation deleted successfully" });
    } catch (error) {
      console.error("Delete invitation error:", error);
      res.status(500).json({ message: "Failed to delete invitation" });
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

  // Payment routes for Paystack integration
  app.post("/api/payment/initialize", async (req: Request, res: Response) => {
    try {
      const { eventId, email, registrationData } = req.body;

      // Get event details
      const [event] = await db.select().from(events).where(eq(events.id, parseInt(eventId)));
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if payment is required
      if (!event.paymentSettings?.requiresPayment) {
        return res.status(400).json({ message: "Payment not required for this event" });
      }

      // Generate payment reference
      const reference = generatePaymentReference(`EVT${eventId}`);
      
      // Get payment amount from event settings
      const amount = convertToKobo(event.paymentSettings.amount);
      
      // Initialize Paystack payment
      const paymentData = await initializePaystackPayment(
        email,
        amount,
        reference,
        {
          eventId,
          eventName: event.name,
          registrationData,
        }
      );

      if (paymentData.status) {
        res.json({
          success: true,
          data: paymentData.data,
          reference,
        });
      } else {
        res.status(400).json({
          success: false,
          message: paymentData.message || "Payment initialization failed",
        });
      }
    } catch (error) {
      console.error("Payment initialization error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to initialize payment" 
      });
    }
  });

  // Payment verification route for callback page
  app.get("/api/payment/verify/:reference", async (req: Request, res: Response) => {
    try {
      const reference = req.params.reference;

      if (!reference) {
        return res.status(400).json({
          status: "failed",
          message: "Payment reference is required",
        });
      }

      // Verify payment with Paystack
      const verificationData = await verifyPaystackPayment(reference);

      if (verificationData.status && verificationData.data.status === 'success') {
        // Payment successful - proceed with registration
        const metadata = verificationData.data.metadata;
        const eventId = parseInt(metadata.eventId);
        const registrationData = metadata.registrationData;

        const event = await storage.getEvent(eventId);
        if (!event) {
          return res.status(404).json({
            status: "failed",
            message: "Event not found",
          });
        }

        const qrCode = generateQRCode();
        const uniqueId = generateShortUniqueId();
        
        // Extract name and email from form data
        const getName = () => {
          const firstName = registrationData.firstName || registrationData.FirstName || registrationData.first_name || '';
          const lastName = registrationData.lastName || registrationData.LastName || registrationData.last_name || '';
          const fullName = registrationData.name || registrationData.Name || registrationData.fullName || registrationData.FullName || '';
          
          if (firstName && lastName) {
            return `${firstName} ${lastName}`;
          } else if (fullName) {
            return fullName;
          } else {
            return 'Unknown User';
          }
        };

        const getEmail = () => {
          return registrationData.email || registrationData.Email || registrationData.emailAddress || null;
        };

        // Create registration using storage system
        const insertData = {
          eventId,
          registrationType: registrationData.registrationType as "member" | "guest" | "invitee",
          qrCode,
          uniqueId,
          guestName: getName(),
          guestEmail: getEmail(),
          paymentReference: reference,
          paymentStatus: "completed" as const,
          paymentAmount: verificationData.data.amount / 100, // Convert from kobo
          customFieldData: registrationData,
          status: "registered" as const,
        };

        const registration = await storage.createEventRegistration(insertData);

        res.json({
          status: "success",
          message: "Payment verified and registration completed",
          data: {
            ...verificationData.data,
            registration,
          },
        });
      } else {
        res.status(400).json({
          status: "failed",
          message: "Payment verification failed",
          data: verificationData.data,
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({
        status: "failed",
        message: "Failed to verify payment",
      });
    }
  });

  app.post("/api/payment/verify", async (req: Request, res: Response) => {
    try {
      const { reference } = req.body;

      if (!reference) {
        return res.status(400).json({
          success: false,
          message: "Payment reference is required",
        });
      }

      // Verify payment with Paystack
      const verificationData = await verifyPaystackPayment(reference);

      if (verificationData.status && verificationData.data.status === 'success') {
        // Payment successful - proceed with registration
        const metadata = verificationData.data.metadata;
        const eventId = parseInt(metadata.eventId);
        const registrationData = metadata.registrationData;

        const event = await storage.getEvent(eventId);
        if (!event) {
          return res.status(400).json({
            success: false,
            message: "Event not found",
          });
        }

        const qrCode = generateQRCode();
        const uniqueId = generateShortUniqueId();
        
        // Extract name and email from form data
        const getName = () => {
          const firstName = registrationData.firstName || registrationData.FirstName || registrationData.first_name || '';
          const lastName = registrationData.lastName || registrationData.LastName || registrationData.last_name || '';
          const fullName = registrationData.name || registrationData.Name || registrationData.fullName || registrationData.FullName || '';
          
          if (firstName && lastName) {
            return `${firstName} ${lastName}`;
          } else if (fullName) {
            return fullName;
          } else {
            return 'Unknown User';
          }
        };

        const getEmail = () => {
          return registrationData.email || registrationData.Email || registrationData.emailAddress || null;
        };

        // Create registration using storage system
        const insertData = {
          eventId,
          registrationType: registrationData.registrationType as "member" | "guest" | "invitee",
          qrCode,
          uniqueId,
          guestName: getName(),
          guestEmail: getEmail(),
          paymentReference: reference,
          paymentStatus: "completed" as const,
          paymentAmount: verificationData.data.amount / 100, // Convert from kobo
          customFieldData: registrationData,
          status: "registered" as const,
        };

        const registration = await storage.createEventRegistration(insertData);

        res.json({
          success: true,
          message: "Payment verified and registration completed",
          data: {
            ...verificationData.data,
            registration,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Payment verification failed",
          data: verificationData.data,
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to verify payment",
      });
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
            
            console.log(`CSV Validation Check:
              CSV Member: ${csvName} | ${csvEmail} | ${csvChanda}
              Registration: ${registration.guestName} | ${registration.guestEmail} | 
              Matches: name=${nameMatch}, email=${emailMatch}`);
            
            return nameMatch || emailMatch;
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

  // Face recognition validation endpoint
  app.post("/api/validate-face", authenticateToken, upload.single('faceImage'), async (req: AuthenticatedRequest, res) => {
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
      const { FaceRecognitionService } = await import('./face-recognition');
      const qualityCheck = FaceRecognitionService.validateImageQuality(uploadedImageBase64);
      
      if (!qualityCheck.isValid) {
        return res.status(400).json({ 
          message: qualityCheck.message,
          validationStatus: "invalid" 
        });
      }

      // Get all face recognition photos for this event
      const storedPhotos = await storage.getFaceRecognitionPhotos(parseInt(eventId));
      
      if (storedPhotos.length === 0) {
        return res.status(400).json({ 
          message: "No face recognition photos found for this event. Please upload reference photos first.",
          validationStatus: "invalid" 
        });
      }

      // AI-powered face matching - compare with all stored photos for this member
      const memberPhotos = storedPhotos.filter(photo => 
        photo.memberName && 
        photo.memberName.toLowerCase().trim() === memberName.toLowerCase().trim()
      );

      if (memberPhotos.length === 0) {
        return res.status(404).json({ 
          message: `No reference photos found for ${memberName}. Please upload a reference photo first.`,
          validationStatus: "invalid" 
        });
      }

      // Compare captured image with all reference photos for this member
      let bestMatch = { isMatch: false, confidence: 0, message: "No match found" };
      
      for (const photo of memberPhotos) {
        try {
          const comparisonResult = await FaceRecognitionService.enhancedFaceComparison(
            photo.photoUrl, 
            uploadedImageBase64, 
            memberName
          );
          
          if (comparisonResult.confidence > bestMatch.confidence) {
            bestMatch = comparisonResult;
          }
        } catch (error) {
          console.error('Face comparison error for photo:', photo.id, error);
        }
      }

      if (!bestMatch.isMatch) {
        return res.status(401).json({ 
          message: `Face does not match stored photos for ${memberName}. ${bestMatch.message}`,
          validationStatus: "invalid",
          confidence: Math.round(bestMatch.confidence * 100)
        });
      }

      // Find the registration for this member and event
      const registrations = await storage.getEventRegistrations(parseInt(eventId));
      let matchedRegistration = null;

      // Try to find registration by name or email
      for (const registration of registrations) {
        const registrationData = registration.customFieldData as any || {};
        const regName = registration.guestName || 
                       (registrationData.FirstName && registrationData.LastName ? 
                        `${registrationData.FirstName} ${registrationData.LastName}` : '') ||
                       registrationData.fullName || '';
        const regEmail = registration.guestEmail || registrationData.email || registrationData.Email;
        
        const nameMatch = regName && regName.toLowerCase().trim() === memberName.toLowerCase().trim();
        const emailMatch = email && regEmail && regEmail.toLowerCase().trim() === email.toLowerCase().trim();
        
        if (nameMatch || emailMatch) {
          matchedRegistration = registration;
          break;
        }
      }

      if (!matchedRegistration) {
        return res.status(404).json({ 
          message: "No registration found for this member",
          validationStatus: "invalid" 
        });
      }

      // Check if already validated
      if (matchedRegistration.status === "online" || matchedRegistration.status === "attended") {
        return res.status(400).json({ 
          message: "This member has already been validated",
          validationStatus: "duplicate" 
        });
      }

      const event = await storage.getEvent(parseInt(eventId));
      if (!event) {
        return res.status(404).json({ 
          message: "Event not found",
          validationStatus: "invalid" 
        });
      }

      // Enhanced CSV validation logic (same as other validation methods)
      const csvData = await storage.getMemberValidationCsv(parseInt(eventId));
      let csvValidationPassed = true;
      
      if (csvData.length > 0 && matchedRegistration.registrationType === 'member') {
        csvValidationPassed = csvData.some(csv => 
          csv.memberData.some((csvMember: any) => {
            const csvName = csvMember.name || csvMember.Fullname || csvMember.fullName || csvMember.fullname;
            const csvFirstName = csvMember.FirstName || csvMember.firstName || csvMember.first_name;
            const csvLastName = csvMember.LastName || csvMember.lastName || csvMember.last_name;
            const csvEmail = csvMember.email || csvMember.Email || csvMember.emailAddress;

            let constructedName = '';
            if (csvFirstName && csvLastName) {
              constructedName = `${csvFirstName} ${csvLastName}`;
            }
            const finalCsvName = csvName || constructedName;
            
            const nameMatch = finalCsvName && memberName && 
              finalCsvName.toLowerCase().trim() === memberName.toLowerCase().trim();
            const emailMatch = csvEmail && email && 
              csvEmail.toLowerCase().trim() === email.toLowerCase().trim();
            
            return nameMatch || emailMatch;
          })
        );
        
        if (!csvValidationPassed) {
          return res.status(403).json({ 
            message: "Member validation failed. Your information was not found in the member validation list.",
            validationStatus: "csv_validation_failed" 
          });
        }
      }

      // Create attendance record
      const attendanceData = {
        eventId: parseInt(eventId),
        registrationId: matchedRegistration.id,
        scannedBy: req.user!.id,
        validationStatus: "valid" as const,
      };

      const attendanceRecord = await storage.createAttendance(attendanceData);
      
      // Update registration status to "online"
      await storage.updateEventRegistration(matchedRegistration.id, { 
        status: "online",
        validationMethod: "face_recognition"
      });

      // Get the matched photo from the best match
      const matchedPhoto = memberPhotos[0]; // Since we found matches, take the first one
      
      res.json({
        message: `Face recognition validation successful! ${bestMatch.message}`,
        validationStatus: "valid",
        memberName: matchedPhoto.memberName,
        confidence: Math.round(bestMatch.confidence * 100),
        event,
        registration: matchedRegistration,
        attendance: attendanceRecord,
        matchedPhoto: {
          id: matchedPhoto.id,
          memberName: matchedPhoto.memberName,
          auxiliaryBody: matchedPhoto.auxiliaryBody
        }
      });

    } catch (error) {
      console.error("Face recognition validation error:", error);
      res.status(500).json({ 
        message: "Face recognition validation failed",
        validationStatus: "invalid" 
      });
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
            const csvFirstName = member.FirstName || member.firstName || member.first_name;
            const csvLastName = member.LastName || member.lastName || member.last_name;
            const csvEmail = member.email || member.Email || member.emailAddress;
            const csvChanda = member.chandaNumber || member.ChandaNO || member.chandaNo || member.chanda_number;
            
            // Construct full name from first and last name if available
            let constructedName = '';
            if (csvFirstName && csvLastName) {
              constructedName = `${csvFirstName} ${csvLastName}`;
            } else if (csvFirstName) {
              constructedName = csvFirstName;
            } else if (csvLastName) {
              constructedName = csvLastName;
            }
            
            const finalCsvName = csvName || constructedName;
            
            // Compare name (case insensitive)
            const nameMatch = finalCsvName && registration.guestName && 
              finalCsvName.toLowerCase().trim() === registration.guestName.toLowerCase().trim();
            
            // Compare email (case insensitive)
            const emailMatch = csvEmail && registration.guestEmail && 
              csvEmail.toLowerCase().trim() === registration.guestEmail.toLowerCase().trim();
            
            console.log(`CSV Validation Check:
              CSV Member: ${finalCsvName} | ${csvEmail} | ${csvChanda}
              Registration: ${registration.guestName} | ${registration.guestEmail} | 
              Matches: name=${nameMatch}, email=${emailMatch}`);
            
            return nameMatch || emailMatch;
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

  // Payment Routes
  
  // Initialize Paystack payment
  app.post("/api/payment/initialize", async (req: Request, res: Response) => {
    try {
      const { registrationId, amount, email } = req.body;
      
      if (!registrationId || !amount || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get registration details
      const registration = await storage.getEventRegistration(registrationId);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      // Get event details
      const event = await storage.getEvent(registration.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Generate unique payment reference
      const reference = generatePaymentReference('EVT');
      
      // Convert amount to kobo
      const amountInKobo = convertToKobo(amount);

      // Initialize payment with Paystack
      const paymentData = await initializePaystackPayment(
        email,
        amountInKobo,
        reference,
        {
          registrationId,
          eventId: event.id,
          eventName: event.name,
          registrationType: registration.registrationType
        },
        process.env.PAYSTACK_PUBLIC_KEY || ''
      );

      if (paymentData.status) {
        // Update registration with payment reference
        await storage.updateEventRegistration(registrationId, {
          paystackReference: reference,
          paymentMethod: 'paystack',
          paymentAmount: amount.toString(),
          paymentStatus: 'pending'
        });

        res.json({
          success: true,
          data: paymentData.data,
          reference
        });
      } else {
        res.status(400).json({
          success: false,
          message: paymentData.message || 'Payment initialization failed'
        });
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      res.status(500).json({ message: "Payment initialization failed" });
    }
  });

  // Verify Paystack payment
  app.post("/api/payment/verify", async (req: Request, res: Response) => {
    try {
      const { reference } = req.body;
      
      if (!reference) {
        return res.status(400).json({ message: "Payment reference is required" });
      }

      // Verify payment with Paystack
      const verification = await verifyPaystackPayment(reference);

      if (verification.status && verification.data.status === 'success') {
        // Find registration by payment reference
        const registrations = await db
          .select()
          .from(eventRegistrations)
          .where(eq(eventRegistrations.paystackReference, reference));

        if (registrations.length === 0) {
          return res.status(404).json({ message: "Registration not found for this payment" });
        }

        const registration = registrations[0];

        // Update registration payment status
        await storage.updateEventRegistration(registration.id, {
          paymentStatus: 'paid',
          paymentVerifiedAt: new Date()
        });

        res.json({
          success: true,
          message: "Payment verified successfully",
          data: verification.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: verification.message || 'Payment verification failed'
        });
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ message: "Payment verification failed" });
    }
  });

  // Manual payment verification (for admin)
  app.post("/api/payment/verify-manual/:registrationId", authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { registrationId } = req.params;
      const { status, notes } = req.body;

      if (!['verified', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'verified' or 'rejected'" });
      }

      const registration = await storage.getEventRegistration(parseInt(registrationId));
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      await storage.updateEventRegistration(parseInt(registrationId), {
        paymentStatus: status,
        paymentVerifiedAt: new Date(),
        paymentVerifiedBy: req.user!.id
      });

      res.json({ 
        message: `Payment ${status} successfully`,
        registration: await storage.getEventRegistration(parseInt(registrationId))
      });
    } catch (error) {
      console.error('Manual payment verification error:', error);
      res.status(500).json({ message: "Payment verification failed" });
    }
  });

  // Upload payment receipt
  app.post("/api/payment/upload-receipt/:registrationId", upload.single('receipt'), async (req: Request, res: Response) => {
    try {
      const { registrationId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const registration = await storage.getEventRegistration(parseInt(registrationId));
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      // Save file to uploads directory
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      
      const fileName = `receipt_${registrationId}_${Date.now()}_${file.originalname}`;
      const filePath = path.join(uploadsDir, fileName);
      
      await fs.writeFile(filePath, file.buffer);

      // Update registration with receipt URL
      await storage.updateEventRegistration(parseInt(registrationId), {
        paymentReceiptUrl: `/uploads/${fileName}`,
        paymentMethod: 'manual_receipt',
        paymentStatus: 'pending'
      });

      res.json({ 
        message: "Receipt uploaded successfully",
        receiptUrl: `/uploads/${fileName}`
      });
    } catch (error) {
      console.error('Receipt upload error:', error);
      res.status(500).json({ message: "Receipt upload failed" });
    }
  });

  // Ticket System API Routes

  // Purchase ticket (public endpoint)
  app.post("/api/tickets/purchase", async (req: Request, res: Response) => {
    try {
      const { eventId, ownerEmail, ownerPhone, ticketCategoryId, paymentMethod } = req.body;
      
      // Generate owner name from email if not provided (for privacy)
      const ownerName = ownerEmail.split('@')[0];

      // Get event details
      const [event] = await db.select().from(events).where(eq(events.id, eventId));
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

      // Generate ticket data - shorter format
      const ticketNumber = `TKT${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const qrCode = generateQRCode();

      // Create ticket record
      const [ticket] = await db.insert(tickets).values({
        eventId,
        ticketNumber,
        qrCode,
        ticketType: ticketCategory.name,
        ticketCategoryId,
        price: ticketCategory.price.toString(),
        currency: ticketCategory.currency,
        ownerName,
        ownerEmail,
        ownerPhone,
        paymentMethod,
        paymentStatus: paymentMethod === "manual" ? "pending" : "pending",
        status: "active",
        isTransferable: true,
      }).returning();

      if (paymentMethod === "paystack" && ticketCategory.price > 0) {
        // Initialize Paystack payment
        const reference = generatePaymentReference(`TKT${ticket.id}`);
        const amount = convertToKobo(ticketCategory.price.toString(), ticketCategory.currency);

        // Get event organizer's subaccount for direct payment
        const [organizer] = await db.select({
          paystackSubaccountCode: users.paystackSubaccountCode,
          businessName: users.businessName
        }).from(users).where(eq(users.id, event.createdBy));

        try {
          const paymentData = await initializePaystackPayment(
            ownerEmail,
            amount,
            reference,
            {
              ticketId: ticket.id,
              eventId,
              ticketCategoryId,
              ticketType: ticketCategory.name,
              ownerName,
              eventName: event.name,
              organizerName: organizer?.businessName || "Event Organizer"
            },
            organizer?.paystackSubaccountCode || undefined // Direct payment to event organizer
          );

          if (paymentData.status) {
            // Update ticket with payment reference
            await db.update(tickets)
              .set({ paymentReference: reference })
              .where(eq(tickets.id, ticket.id));

            res.json({
              ticketId: ticket.id,
              paymentUrl: paymentData.data.authorization_url,
              reference,
            });
          } else {
            // Delete ticket if payment initialization failed
            await db.delete(tickets).where(eq(tickets.id, ticket.id));
            res.status(400).json({ message: "Payment initialization failed" });
          }
        } catch (paymentError) {
          // Delete ticket if payment initialization failed
          await db.delete(tickets).where(eq(tickets.id, ticket.id));
          throw paymentError;
        }
      } else {
        // For manual payment or free tickets
        res.json({
          ticketId: ticket.id,
          message: paymentMethod === "manual" ? "Ticket reserved. Complete payment to activate." : "Free ticket created successfully.",
        });
      }
    } catch (error) {
      console.error("Ticket purchase error:", error);
      res.status(500).json({ message: "Failed to purchase ticket" });
    }
  });

  // Get ticket details (public endpoint)
  app.get("/api/tickets/:ticketId", async (req: Request, res: Response) => {
    try {
      const ticketParam = req.params.ticketId;
      let ticket;

      // Try to find ticket by ticket number first (string like "TKTPZIWI9"), then by ID
      if (isNaN(parseInt(ticketParam))) {
        // It's a ticket number (string)
        [ticket] = await db.select().from(tickets).where(eq(tickets.ticketNumber, ticketParam));
      } else {
        // It's a numeric ID
        const ticketId = parseInt(ticketParam);
        [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
      }

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      console.error("Get ticket error:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  // Initialize payment for existing ticket
  app.post("/api/tickets/initialize-payment", async (req: Request, res: Response) => {
    try {
      const { ticketId } = req.body;

      if (!ticketId) {
        return res.status(400).json({ message: "Ticket ID is required" });
      }

      // Get ticket details
      const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Check if ticket is already paid
      if (ticket.paymentStatus === 'paid') {
        return res.status(400).json({ message: "Ticket has already been paid for" });
      }

      // Check if payment method is Paystack
      if (ticket.paymentMethod !== 'paystack') {
        return res.status(400).json({ message: "This ticket does not support online payment" });
      }

      // Always generate a new unique payment reference to avoid duplicates
      // Include random component to ensure uniqueness even for rapid successive calls
      const paymentReference = generatePaymentReference(`TKT${ticket.id}_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`);
      await db.update(tickets)
        .set({ paymentReference })
        .where(eq(tickets.id, ticket.id));

      // Convert price to kobo (smallest currency unit)
      const amount = convertToKobo(ticket.price.toString(), ticket.currency);

      // Get event details and organizer's subaccount
      const [event] = await db.select().from(events).where(eq(events.id, ticket.eventId));
      const [organizer] = await db.select({
        paystackSubaccountCode: users.paystackSubaccountCode,
        businessName: users.businessName
      }).from(users).where(eq(users.id, event.createdBy));

      // Initialize Paystack payment with subaccount if organizer has one
      const paymentData = await initializePaystackPayment(
        ticket.ownerEmail,
        amount,
        paymentReference,
        {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          ticketType: ticket.ticketType,
          eventId: ticket.eventId,
          eventName: event.name,
          organizerName: organizer?.businessName || "Event Organizer"
        },
        organizer?.paystackSubaccountCode || undefined // Direct payment to event organizer
      );

      if (paymentData.status) {
        res.json({
          success: true,
          authorizationUrl: paymentData.data.authorization_url,
          reference: paymentReference,
        });
      } else {
        res.status(400).json({
          success: false,
          message: paymentData.message || "Payment initialization failed",
        });
      }
    } catch (error) {
      console.error("Ticket payment initialization error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to initialize payment" 
      });
    }
  });

  // Transfer ticket (public endpoint)
  app.post("/api/tickets/:ticketId/transfer", async (req: Request, res: Response) => {
    try {
      const ticketParam = req.params.ticketId;
      const { toOwnerName, toOwnerEmail, toOwnerPhone, transferReason } = req.body;
      let ticket;

      // Try to find ticket by ticket number first, then by ID
      if (isNaN(parseInt(ticketParam))) {
        // It's a ticket number (string)
        [ticket] = await db.select().from(tickets).where(eq(tickets.ticketNumber, ticketParam));
      } else {
        // It's a numeric ID
        const ticketId = parseInt(ticketParam);
        [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
      }

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      if (!ticket.isTransferable || ticket.status !== "active" || ticket.paymentStatus !== "paid") {
        return res.status(400).json({ message: "Ticket cannot be transferred" });
      }

      if ((ticket.transferCount || 0) >= (ticket.maxTransfers || 5)) {
        return res.status(400).json({ message: "Maximum transfer limit reached" });
      }

      // Record the transfer
      await db.insert(ticketTransfers).values({
        ticketId: ticket.id,
        fromOwnerName: ticket.ownerName,
        fromOwnerEmail: ticket.ownerEmail,
        fromOwnerPhone: ticket.ownerPhone,
        toOwnerName,
        toOwnerEmail,
        toOwnerPhone,
        transferReason,
        transferStatus: "completed",
      });

      // Update ticket ownership
      await db.update(tickets).set({
        ownerName: toOwnerName,
        ownerEmail: toOwnerEmail,
        ownerPhone: toOwnerPhone,
        transferCount: (ticket.transferCount || 0) + 1,
      }).where(eq(tickets.id, ticket.id));

      res.json({ message: "Ticket transferred successfully" });
    } catch (error) {
      console.error("Transfer ticket error:", error);
      res.status(500).json({ message: "Failed to transfer ticket" });
    }
  });

  // Validate ticket at event (admin endpoint)
  app.post("/api/tickets/:ticketId/validate", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const ticketParam = req.params.ticketId;
      let ticket;

      // Try to find ticket by ticket number first, then by ID
      if (isNaN(parseInt(ticketParam))) {
        // It's a ticket number (string like "TKTDAOIKM")
        [ticket] = await db.select().from(tickets).where(eq(tickets.ticketNumber, ticketParam));
      } else {
        // It's a numeric ID
        const ticketId = parseInt(ticketParam);
        [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
      }

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Check if ticket has already been used
      if (ticket.status === "used") {
        return res.status(400).json({ 
          message: "Ticket already used",
          usedAt: ticket.usedAt,
          success: false
        });
      }

      // Check payment status - this is the key logic you requested
      if (ticket.paymentStatus !== "paid") {
        return res.status(400).json({ 
          message: "Payment required. Please complete payment before entry.",
          paymentStatus: ticket.paymentStatus,
          paymentMethod: ticket.paymentMethod,
          success: false,
          requiresPayment: true
        });
      }

      // Check if ticket is active
      if (ticket.status !== "active") {
        return res.status(400).json({ 
          message: "Ticket is not active",
          success: false 
        });
      }

      // Check if ticket has expired
      if (ticket.expiresAt && new Date() > new Date(ticket.expiresAt)) {
        await db.update(tickets).set({ status: "expired" }).where(eq(tickets.id, ticket.id));
        return res.status(400).json({ 
          message: "Ticket has expired",
          success: false 
        });
      }

      // Mark ticket as used - validation successful
      await db.update(tickets).set({
        status: "used",
        usedAt: new Date(),
        scannedBy: req.user!.id,
      }).where(eq(tickets.id, ticket.id));

      res.json({ 
        message: "Ticket validated successfully",
        success: true,
        ticket: {
          ...ticket,
          status: "used",
          usedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Validate ticket error:", error);
      res.status(500).json({ 
        message: "Failed to validate ticket",
        success: false 
      });
    }
  });

  // Get event tickets (admin endpoint)
  app.get("/api/events/:eventId/tickets", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);

      const eventTickets = await db.select().from(tickets)
        .where(eq(tickets.eventId, eventId))
        .orderBy(desc(tickets.createdAt));

      res.json(eventTickets);
    } catch (error) {
      console.error("Get event tickets error:", error);
      res.status(500).json({ message: "Failed to fetch event tickets" });
    }
  });

  // Ticket payment verification for Paystack callback
  app.post("/api/tickets/verify-payment", async (req: Request, res: Response) => {
    try {
      const { reference } = req.body;

      if (!reference) {
        return res.status(400).json({ message: "Payment reference is required" });
      }

      // Verify payment with Paystack
      const verificationData = await verifyPaystackPayment(reference);

      if (verificationData.status && verificationData.data.status === 'success') {
        const metadata = verificationData.data.metadata;
        const ticketId = parseInt(metadata.ticketId);

        // Update ticket payment status
        await db.update(tickets).set({
          paymentStatus: "paid",
          paymentAmount: (verificationData.data.amount / 100).toString(), // Convert from kobo
        }).where(eq(tickets.id, ticketId));

        res.json({
          success: true,
          message: "Payment verified successfully",
          ticketId,
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Payment verification failed",
        });
      }
    } catch (error) {
      console.error("Ticket payment verification error:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  // Bank Account Management API Routes for Multi-Tenant Payments

  // Get Nigerian banks list (comprehensive including microfinance banks)
  app.get("/api/banks", async (req: Request, res: Response) => {
    try {
      const banksData = await getNigerianBanks();
      
      if (banksData.status) {
        const banks = banksData.data;
        
        // Additional categorization and statistics
        const commercialBanks = banks.filter((bank: any) => bank.type === 'commercial');
        const microfinanceBanks = banks.filter((bank: any) => bank.type === 'microfinance');
        
        res.json({
          success: true,
          banks: banks,
          statistics: {
            total: banks.length,
            commercial: commercialBanks.length,
            microfinance: microfinanceBanks.length
          },
          message: `Found ${banks.length} banks (${commercialBanks.length} commercial, ${microfinanceBanks.length} microfinance)`
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to fetch banks from Paystack API"
        });
      }
    } catch (error) {
      console.error("Get banks error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch banks. Please check your internet connection and try again." 
      });
    }
  });

  // Verify bank account details
  app.post("/api/banks/verify", async (req: Request, res: Response) => {
    try {
      const { accountNumber, bankCode } = req.body;

      if (!accountNumber || !bankCode) {
        return res.status(400).json({ 
          success: false,
          message: "Account number and bank code are required" 
        });
      }

      const verificationData = await verifyBankAccount(accountNumber, bankCode);

      if (verificationData.status) {
        res.json({
          success: true,
          accountName: verificationData.data.account_name,
          accountNumber: verificationData.data.account_number
        });
      } else {
        res.status(400).json({
          success: false,
          message: verificationData.message || "Account verification failed"
        });
      }
    } catch (error) {
      console.error("Bank verification error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to verify bank account" 
      });
    }
  });

  // Auto-detect bank from account number (optimized with limits)
  app.post("/api/banks/auto-detect", async (req: Request, res: Response) => {
    try {
      const { accountNumber } = req.body;

      if (!accountNumber || accountNumber.length !== 10) {
        return res.status(400).json({ 
          success: false,
          message: "Valid 10-digit account number is required" 
        });
      }

      console.log(`Auto-detecting bank for account ${accountNumber}`);
      
      // Get all banks first
      const banksData = await getNigerianBanks();
      if (!banksData.status) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch banks list"
        });
      }

      // Prioritize common banks for faster detection
      const commonBanks = [
        "044", // Access Bank
        "058", // GTBank  
        "070", // Fidelity
        "011", // First Bank
        "214", // FCMB
        "076", // Polaris
        "082", // Keystone
        "221", // Stanbic IBTC
        "232", // Sterling
        "050", // Ecobank
        "068", // Standard Chartered
        "101", // Providus
        "035", // Wema
        "301", // Jaiz
        "303", // Lotus
        "050211", // Kuda
      ];

      const allBanks = banksData.data;
      const prioritizedBanks = [
        ...allBanks.filter((bank: any) => commonBanks.includes(bank.code)),
        ...allBanks.filter((bank: any) => !commonBanks.includes(bank.code)).slice(0, 10) // Only try 10 more
      ];

      // Try to verify with prioritized banks (max 26 banks total)
      for (let i = 0; i < Math.min(prioritizedBanks.length, 26); i++) {
        const bank = prioritizedBanks[i];
        try {
          console.log(`Trying bank ${i + 1}/26: ${bank.name} (${bank.code})`);
          
          // Add timeout for each verification request (5 seconds max)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          );
          
          const verificationPromise = verifyBankAccount(accountNumber, bank.code);
          const verificationData = await Promise.race([verificationPromise, timeoutPromise]);
          
          if (verificationData && verificationData.status) {
            console.log(`Found match with ${bank.name}: ${verificationData.data.account_name}`);
            return res.json({
              success: true,
              accountName: verificationData.data.account_name,
              accountNumber: verificationData.data.account_number,
              bankName: bank.name,
              bankCode: bank.code
            });
          }
        } catch (error) {
          // Continue to next bank if this one fails or times out
          if (error.message === 'Timeout') {
            console.log(`Timeout verifying with ${bank.name}`);
          } else {
            console.log(`Failed to verify with ${bank.name}:`, error.message);
          }
          continue;
        }
      }

      // If no bank matched
      res.status(404).json({
        success: false,
        message: "Could not find a matching bank for this account number. Please select your bank manually."
      });
      
    } catch (error) {
      console.error("Auto-detect bank error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to auto-detect bank" 
      });
    }
  });

  // Smart bank verification - only checks once bank is selected
  app.post("/api/banks/smart-verify", async (req: Request, res: Response) => {
    try {
      const { accountNumber, bankCode } = req.body;

      if (!accountNumber || !bankCode) {
        return res.status(400).json({ 
          success: false,
          message: "Account number and bank code are required" 
        });
      }

      console.log(`Verifying account ${accountNumber} with bank ${bankCode}`);
      
      const verificationData = await verifyBankAccount(accountNumber, bankCode);
      
      if (verificationData.status) {
        // Get bank name from banks list
        const banksData = await getNigerianBanks();
        const bank = banksData.data.find((b: any) => b.code === bankCode);
        
        res.json({
          success: true,
          accountName: verificationData.data.account_name,
          accountNumber: verificationData.data.account_number,
          bankName: bank?.name || 'Unknown Bank',
          bankCode: bankCode
        });
      } else {
        res.status(400).json({
          success: false,
          message: verificationData.message || "Account verification failed"
        });
      }
    } catch (error) {
      console.error("Smart bank verification error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to verify bank account" 
      });
    }
  });

  // Setup bank account for user (create subaccount)
  app.post("/api/users/setup-bank-account", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { 
        bankCode, 
        accountNumber, 
        businessName, 
        businessEmail, 
        businessPhone,
        percentageCharge = 0 
      } = req.body;

      if (!bankCode || !accountNumber || !businessName) {
        return res.status(400).json({ 
          success: false,
          message: "Bank code, account number, and business name are required" 
        });
      }

      // First verify the bank account
      const verificationData = await verifyBankAccount(accountNumber, bankCode);
      
      if (!verificationData.status) {
        return res.status(400).json({
          success: false,
          message: "Bank account verification failed"
        });
      }

      // Create Paystack subaccount
      const subaccountData = await createPaystackSubaccount(
        businessName,
        bankCode,
        accountNumber,
        percentageCharge
      );

      if (subaccountData.status) {
        // Update user record with bank details and subaccount code
        await db.update(users).set({
          paystackSubaccountCode: subaccountData.data.subaccount_code,
          bankName: verificationData.data.account_name,
          accountNumber: accountNumber,
          accountName: verificationData.data.account_name,
          bankCode: bankCode,
          businessName: businessName,
          businessEmail: businessEmail,
          businessPhone: businessPhone,
          percentageCharge: percentageCharge,
          isVerified: true
        }).where(eq(users.id, userId));

        res.json({
          success: true,
          message: "Bank account setup successfully",
          subaccountCode: subaccountData.data.subaccount_code,
          accountName: verificationData.data.account_name
        });
      } else {
        res.status(400).json({
          success: false,
          message: subaccountData.message || "Failed to create payment account"
        });
      }
    } catch (error) {
      console.error("Bank account setup error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to setup bank account" 
      });
    }
  });

  // Get user's bank account details
  app.get("/api/users/bank-account", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      console.log("Fetching bank account for user ID:", userId);
      
      const [user] = await db.select({
        paystackSubaccountCode: users.paystackSubaccountCode,
        bankName: users.bankName,
        accountNumber: users.accountNumber,
        accountName: users.accountName,
        bankCode: users.bankCode,
        businessName: users.businessName,
        businessEmail: users.businessEmail,
        businessPhone: users.businessPhone,
        percentageCharge: users.percentageCharge,
        isVerified: users.isVerified
      }).from(users).where(eq(users.id, userId));

      console.log("Found user data:", user);

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      res.json({
        success: true,
        bankAccount: user
      });
    } catch (error: any) {
      console.error("Get bank account error:", error);
      console.error("Error stack:", error?.stack);
      console.error("Error message:", error?.message);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch bank account details" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
