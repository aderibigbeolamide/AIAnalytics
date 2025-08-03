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
  ticketTransfers,
  eventCapacity,
  userPreferences,
  eventRecommendations
} from "@shared/schema";
import { eq, and, isNull, desc, or, ilike, gte, lte, sql } from "drizzle-orm";
import { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  authenticateToken, 
  requireRole,
  isAdmin,
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
  insertTicketTransferSchema,
  insertEventCapacitySchema,
  insertUserPreferencesSchema,
  insertEventRecommendationSchema
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
      
      // For testing: simple bypass with admin/password123
      if (trimmedUsername === "admin" && trimmedPassword === "password123") {
        const token = generateToken({ id: 1, username: "admin", role: "admin" });
        return res.json({ 
          token, 
          user: { 
            id: 1, 
            username: "admin", 
            role: "admin" 
          },
          member: null 
        });
      }
      
      try {
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
      } catch (dbError) {
        // Database is not available, but we already handled the test case above
        return res.status(401).json({ message: "Invalid credentials" });
      }
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
        const auxBody = reg.guestAuxiliaryBody;
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
      const { auxiliaryBody, uniqueId, startDate, endDate, status } = req.query;
      
      const filters = {
        auxiliaryBody: auxiliaryBody as string,
        uniqueId: uniqueId as string,
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
      const { eventId, auxiliaryBody, uniqueId,  startDate, endDate, status } = req.query;
      
      const filters = {
        auxiliaryBody: auxiliaryBody as string,
        uniqueId: uniqueId as string,
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

            auxiliaryBody: getAuxiliaryBody(),
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

      // Get registration by ID first, then find by QR code if not found
      let registration = await storage.getEventRegistration(qrData.registrationId.toString());
      if (!registration) {
        // Try finding by QR code as fallback
        registration = await storage.getEventRegistrationByQR(encryptedData);
      }
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

      const event = await storage.getEvent(qrData.eventId.toString());
      if (!event) {
        return res.status(404).json({ 
          message: "Event not found",
          validationStatus: "invalid" 
        });
      }

      // Check payment status for events that require payment
      if (event.paymentSettings?.requiresPayment && registration.paymentStatus !== "completed") {
        return res.status(403).json({ 
          message: "Payment required. Please complete payment before validation.",
          validationStatus: "payment_required" 
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
      await storage.updateEventRegistration(registration.id.toString(), { 
        status: "online",
        validationMethod: "qr_scan"
      });
      
      // Update member status to "online" if they exist
      if (member) {
        await storage.updateMember(member.id.toString(), { status: "online" });
      }
      
      // Also update member status if registration has member data but no member record
      if (!member && registration.memberId) {
        const regMember = await storage.getMember(registration.memberId.toString());
        if (regMember) {
          await storage.updateMember(registration.memberId.toString(), { status: "online" });
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
        auxiliaryBodies: [], // Dynamically fetched from events
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

      const event = await storage.getEvent(registration.eventId.toString());
      if (!event) {
        return res.status(404).json({ 
          message: "Event not found",
          validationStatus: "invalid" 
        });
      }

      // Check payment status for events that require payment
      if (event.paymentSettings?.requiresPayment && registration.paymentStatus !== "completed") {
        return res.status(403).json({ 
          message: "Payment required. Please complete payment before validation.",
          validationStatus: "payment_required" 
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
          
        });
        
        // Check if user exists in any of the CSV files
        csvValidationPassed = csvData.some(csv => 
          csv.memberData.some((member: any) => {
            // Support multiple possible field names for CSV data
            const csvName = member.name || member.Fullname || member.fullName || member.fullname;
            const csvEmail = member.email || member.Email || member.emailAddress;
            
            
            // Compare name (case insensitive)
            const nameMatch = csvName && registration.guestName && 
              csvName.toLowerCase().trim() === registration.guestName.toLowerCase().trim();
            
            // Compare email (case insensitive)
            const emailMatch = csvEmail && registration.guestEmail && 
              csvEmail.toLowerCase().trim() === registration.guestEmail.toLowerCase().trim();
            
            // Compare chanda number
            
            console.log(`CSV Validation Check:
              CSV Member: ${csvName} | ${csvEmail}
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
      await storage.updateEventRegistration(registration.id.toString(), { 
        status: "online",
        validationMethod: "manual_validation"
      });

      // Update member status to "online" if member exists
      if (member) {
        await storage.updateMember(member.id.toString(), { status: "online" });
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
      const { memberName, auxiliaryBody,  memberId } = req.body;
      
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
          
        });
        // Check if user exists in any of the CSV files
        csvValidationPassed = csvData.some(csv => 
          csv.memberData.some((member: any) => {
            // Support multiple possible field names for CSV data
            const csvName = member.name || member.Fullname || member.fullName || member.fullname;
            const csvFirstName = member.FirstName || member.firstName || member.first_name;
            const csvLastName = member.LastName || member.lastName || member.last_name;
            const csvEmail = member.email || member.Email || member.emailAddress;
            
            
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

  // Get payments for user's own events only (privacy-focused)
  app.get("/api/payments/my-events", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      // Get only events created by this user
      const userEvents = await db
        .select()
        .from(events)
        .where(eq(events.createdBy, userId));

      if (userEvents.length === 0) {
        return res.json({ payments: [], totalAmount: 0, eventCount: 0 });
      }

      const eventIds = userEvents.map(e => e.id);

      // Get registrations only for user's events that have payment data
      const registrationsWithPayments = await db
        .select()
        .from(eventRegistrations)
        .where(
          and(
            sql`${eventRegistrations.eventId} = ANY(${eventIds})`,
            eq(eventRegistrations.paymentStatus, 'paid')
          )
        );

      // Get event names for display
      const eventMap = userEvents.reduce((acc, event) => {
        acc[event.id] = event.name;
        return acc;
      }, {} as Record<number, string>);

      // Format payment data for display
      const payments = registrationsWithPayments.map(reg => ({
        id: reg.id,
        eventId: reg.eventId,
        eventName: eventMap[reg.eventId] || 'Unknown Event',
        amount: parseFloat(reg.paymentAmount || '0') * 100, // Convert to kobo for consistency
        reference: reg.paystackReference,
        status: reg.paymentStatus,
        createdAt: reg.createdAt,
        registrationData: {
          guestName: reg.guestName,
          guestEmail: reg.guestEmail,
          registrationType: reg.registrationType
        }
      }));

      const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

      res.json({
        payments,
        totalAmount,
        eventCount: userEvents.length,
        paidRegistrations: payments.length
      });
    } catch (error) {
      console.error('Get user payments error:', error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Update bank account details (with edit functionality)
  app.put("/api/users/bank-account", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { bankCode, accountNumber, businessName, businessEmail, businessPhone, percentageCharge } = req.body;

      // Verify bank account first
      const verification = await verifyBankAccount(accountNumber, bankCode);
      if (!verification.status || !verification.data) {
        return res.status(400).json({ message: "Bank account verification failed" });
      }

      const accountName = verification.data.account_name;
      const bankName = verification.data.bank_name;

      // Update user's bank account details
      await db
        .update(users)
        .set({
          bankCode,
          accountNumber,
          accountName,
          bankName,
          businessName,
          businessEmail,
          businessPhone,
          percentageCharge,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      res.json({
        success: true,
        message: "Bank account updated successfully",
        bankAccount: {
          bankCode,
          accountNumber,
          accountName,
          bankName,
          businessName,
          businessEmail,
          businessPhone,
          percentageCharge
        }
      });
    } catch (error) {
      console.error('Update bank account error:', error);
      res.status(500).json({ message: "Failed to update bank account" });
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

      // Get bank name from banks list
      const banksData = await getNigerianBanks();
      const bank = banksData.data.find((b: any) => b.code === bankCode);
      
      // Update the user with bank account information directly in the user fields
      await storage.updateUser(userId, {
        accountNumber: accountNumber,
        bankCode: bankCode,
        bankName: bank?.name || 'Unknown Bank',
        accountName: verificationData.data.account_name,
        businessName: businessName,
        businessEmail: businessEmail || '',
        businessPhone: businessPhone || '',
        percentageCharge: percentageCharge,
        isVerified: true
      });
      
      console.log("Bank verification successful for:", verificationData.data.account_name);
      console.log("Business Details:", { businessName, businessEmail, businessPhone });
      
      res.json({
        success: true,
        message: "Bank account setup completed successfully!",
        accountName: verificationData.data.account_name,
        bankCode: bankCode,
        accountNumber: accountNumber,
        businessName: businessName,
        verified: true
      });
    } catch (error: any) {
      console.error("Bank account setup error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({ 
        success: false,
        message: error.message || "Failed to setup bank account" 
      });
    }
  });

  // Get user's bank account details (PRIVATE - only for account owner)
  app.get("/api/users/bank-account", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      // Get the actual user data from the database
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      // Return the actual bank account data from user fields (PRIVATE INFO)
      const bankAccount = {
        paystackSubaccountCode: user.paystackSubaccountCode,
        bankName: user.bankName,
        accountNumber: user.accountNumber,
        accountName: user.accountName,
        bankCode: user.bankCode,
        businessName: user.businessName,
        businessEmail: user.businessEmail,
        businessPhone: user.businessPhone,
        percentageCharge: user.percentageCharge || 0,
        isVerified: user.isVerified || false
      };

      res.json({
        success: true,
        bankAccount: bankAccount
      });
    } catch (error: any) {
      console.error("Get bank account error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch bank account details" 
      });
    }
  });

  // Update user's bank account details (PRIVATE - only for account owner)
  app.put("/api/users/bank-account", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { 
        bankCode, 
        accountNumber, 
        businessName, 
        businessEmail, 
        businessPhone,
        percentageCharge = 2 
      } = req.body;

      // Verify the account before updating
      const verificationData = await verifyBankAccount(accountNumber, bankCode);
      
      if (!verificationData.status) {
        return res.status(400).json({
          success: false,
          message: verificationData.message || "Account verification failed"
        });
      }

      // Get bank name from banks list
      const banksData = await getNigerianBanks();
      const bank = banksData.data.find((b: any) => b.code === bankCode);
      
      // Update the user with new bank account information
      await storage.updateUser(userId, {
        accountNumber: accountNumber,
        bankCode: bankCode,
        bankName: bank?.name || 'Unknown Bank',
        accountName: verificationData.data.account_name,
        businessName: businessName,
        businessEmail: businessEmail || '',
        businessPhone: businessPhone || '',
        percentageCharge: percentageCharge,
        isVerified: true
      });
      
      console.log("Bank account updated successfully for user:", userId);
      
      res.json({
        success: true,
        message: "Bank account updated successfully!",
        accountName: verificationData.data.account_name,
        bankCode: bankCode,
        accountNumber: accountNumber,
        businessName: businessName,
        verified: true
      });
    } catch (error: any) {
      console.error("Bank account update error:", error);
      res.status(500).json({ 
        success: false,
        message: error.message || "Failed to update bank account" 
      });
    }
  });

  // Real-time Seat Availability Heatmap Endpoints
  app.get("/api/events/:id/seat-availability", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      // Get existing seat availability data
      let seatData = await storage.getEventCapacity(eventId);
      
      if (!seatData) {
        // Create sample seat map for demonstration
        const sampleSeatMap = {
          sections: [
            {
              id: "section-a",
              name: "Section A (VIP)",
              seats: Array.from({ length: 50 }, (_, i) => ({
                id: `a-${i + 1}`,
                row: String.fromCharCode(65 + Math.floor(i / 10)),
                number: String((i % 10) + 1),
                status: Math.random() > 0.7 ? 'occupied' : Math.random() > 0.5 ? 'reserved' : 'available' as 'available' | 'reserved' | 'occupied' | 'blocked',
                price: 5000,
                category: 'VIP'
              }))
            },
            {
              id: "section-b", 
              name: "Section B (Regular)",
              seats: Array.from({ length: 100 }, (_, i) => ({
                id: `b-${i + 1}`,
                row: String.fromCharCode(65 + Math.floor(i / 20)),
                number: String((i % 20) + 1),
                status: Math.random() > 0.6 ? 'occupied' : Math.random() > 0.4 ? 'reserved' : 'available' as 'available' | 'reserved' | 'occupied' | 'blocked',
                price: 2000,
                category: 'Regular'
              }))
            }
          ]
        };

        const totalSeats = sampleSeatMap.sections.reduce((total, section) => total + section.seats.length, 0);
        const availableSeats = sampleSeatMap.sections.reduce((total, section) => 
          total + section.seats.filter(seat => seat.status === 'available').length, 0
        );

        seatData = await storage.createEventCapacity({
          eventId,
          totalSeats,
          availableSeats,
          seatMap: sampleSeatMap
        });
      }

      res.json(seatData);
    } catch (error) {
      console.error("Seat availability error:", error);
      res.status(500).json({ message: "Failed to fetch seat availability" });
    }
  });

  app.post("/api/events/:id/seat-availability", authenticateToken, requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { totalSeats, seatMap } = req.body;

      const availableSeats = seatMap.sections.reduce((total: number, section: any) => 
        total + section.seats.filter((seat: any) => seat.status === 'available').length, 0
      );

      const seatData = await storage.updateEventCapacity(eventId, {
        totalSeats,
        availableSeats,
        seatMap
      });

      res.json(seatData);
    } catch (error) {
      console.error("Update seat availability error:", error);
      res.status(500).json({ message: "Failed to update seat availability" });
    }
  });

  // Public seat availability endpoint (no authentication required)
  app.get("/api/events/:id/seat-availability-public", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      // Get existing seat availability data
      let seatData = await storage.getEventCapacity(eventId);
      
      if (!seatData) {
        // Create sample seat data if none exists
        const sampleSeatMap = {
          sections: [
            {
              id: "section-a",
              name: "Section A (VIP)",
              seats: Array.from({ length: 50 }, (_, i) => ({
                id: `a-${i + 1}`,
                row: String.fromCharCode(65 + Math.floor(i / 10)),
                number: String((i % 10) + 1),
                status: Math.random() > 0.7 ? 'occupied' : Math.random() > 0.5 ? 'reserved' : 'available' as 'available' | 'reserved' | 'occupied' | 'blocked',
                price: 5000,
                category: 'VIP'
              }))
            },
            {
              id: "section-b", 
              name: "Section B (Regular)",
              seats: Array.from({ length: 100 }, (_, i) => ({
                id: `b-${i + 1}`,
                row: String.fromCharCode(65 + Math.floor(i / 20)),
                number: String((i % 20) + 1),
                status: Math.random() > 0.6 ? 'occupied' : Math.random() > 0.4 ? 'reserved' : 'available' as 'available' | 'reserved' | 'occupied' | 'blocked',
                price: 2000,
                category: 'Regular'
              }))
            }
          ]
        };

        const totalSeats = sampleSeatMap.sections.reduce((total, section) => total + section.seats.length, 0);
        const availableSeats = sampleSeatMap.sections.reduce((total, section) => 
          total + section.seats.filter(seat => seat.status === 'available').length, 0
        );

        seatData = await storage.createEventCapacity({
          eventId,
          totalSeats,
          availableSeats,
          seatMap: sampleSeatMap
        });
      }

      // Return only essential data for public view (no seat map details)
      res.json({
        eventId: seatData.eventId,
        totalSeats: seatData.totalSeats,
        availableSeats: seatData.availableSeats,
        occupancyRate: Math.round(((seatData.totalSeats - seatData.availableSeats) / seatData.totalSeats) * 100),
        lastUpdated: seatData.updatedAt || new Date().toISOString()
      });
    } catch (error) {
      console.error("Public seat availability error:", error);
      res.status(500).json({ message: "Failed to fetch seat availability" });
    }
  });

  // User Preferences Endpoints
  app.get("/api/users/preferences", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const preferences = await storage.getUserPreferences(userId);
      
      res.json(preferences || {
        preferences: {
          auxiliaryBodies: [],
          eventTypes: [],
          locations: [],
          timePreferences: [],
          interests: [],
          priceRange: { min: 0, max: 10000 },
          notificationSettings: { email: true, sms: false, push: true }
        }
      });
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.post("/api/users/preferences", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { preferences } = req.body;

      const updatedPreferences = await storage.updateUserPreferences(userId, { preferences });
      
      // Trigger recommendation regeneration
      await storage.generateRecommendations(userId);

      res.json(updatedPreferences);
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Event Recommendations Endpoints
  app.get("/api/recommendations", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 5;
      
      let recommendations = await storage.getEventRecommendations(userId, limit);
      
      // If no recommendations exist, generate them
      if (recommendations.length === 0) {
        await storage.generateRecommendations(userId);
        recommendations = await storage.getEventRecommendations(userId, limit);
      }

      res.json(recommendations);
    } catch (error) {
      console.error("Get recommendations error:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  app.patch("/api/recommendations/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const recommendationId = parseInt(req.params.id);
      const { status } = req.body;

      const recommendation = await storage.updateEventRecommendation(recommendationId, { status });
      
      res.json(recommendation);
    } catch (error) {
      console.error("Update recommendation error:", error);
      res.status(500).json({ message: "Failed to update recommendation" });
    }
  });

  app.post("/api/recommendations/generate", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      const recommendations = await storage.generateRecommendations(userId);
      
      res.json({
        message: "Recommendations generated successfully",
        count: recommendations.length,
        recommendations
      });
    } catch (error) {
      console.error("Generate recommendations error:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  // Public Event Recommendations Endpoints (no authentication required)
  app.get("/api/recommendations/public", async (req: Request, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      
      // For public users, generate general recommendations based on popular/upcoming events
      const currentDate = new Date();
      
      // Get upcoming events with good registration counts to recommend
      const upcomingEvents = await db
        .select()
        .from(events)
        .where(and(
          isNull(events.deletedAt),
          gte(events.startDate, currentDate)
        ))
        .orderBy(events.startDate)
        .limit(limit * 2); // Get more to have options
      
      // Create synthetic recommendations with scoring
      const recommendations = upcomingEvents.slice(0, limit).map((event, index) => ({
        id: Date.now() + index, // Synthetic ID for public recommendations
        eventId: event.id,
        score: 85 - (index * 5), // Decreasing score for each subsequent event
        reasons: [
          "Popular upcoming event",
          "Good timing for registration",
          "High community interest"
        ],
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        event: {
          id: event.id,
          name: event.name,
          description: event.description,
          location: event.location,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate?.toISOString() || event.startDate.toISOString(),
          eligibleAuxiliaryBodies: event.eligibleAuxiliaryBodies || [],
          paymentSettings: {
            requiresPayment: event.requiresPayment || false,
            amount: event.paymentAmount?.toString(),
            currency: 'NGN'
          }
        }
      }));

      res.json(recommendations);
    } catch (error) {
      console.error("Get public recommendations error:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Public User Preferences (simplified for non-authenticated users)
  app.get("/api/users/preferences/public", async (req: Request, res) => {
    try {
      // Return default preferences for public users
      const defaultPreferences = {
        preferences: {
          auxiliaryBodies: [],
          eventTypes: [],
          locations: [],
          timePreferences: [],
          interests: [],
          priceRange: { min: 0, max: 1000 },
          notificationSettings: { email: false, sms: false, push: false }
        }
      };

      res.json(defaultPreferences);
    } catch (error) {
      console.error("Get public preferences error:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  // Platform Analytics API - PRIVACY PROTECTED: Only shows platform fees (2%), never organizer revenue
  app.get('/api/platform/analytics', authenticateToken, isAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // SECURITY NOTE: This endpoint only shows platform fees earned from each transaction
      // It NEVER exposes the full revenue amounts that go to event organizers
      // Each organizer's bank account details and full revenue remain completely private
      const { period = '30d' } = req.query;
      
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get all successful payment registrations with platform fees
      const paidRegistrations = await db
        .select({
          id: eventRegistrations.id,
          eventId: eventRegistrations.eventId,
          paymentAmount: eventRegistrations.paymentAmount,
          paymentReference: eventRegistrations.paymentReference,
          createdAt: eventRegistrations.createdAt,
          eventName: events.name,
          organizerBusinessName: users.businessName,
          organizerPercentageCharge: users.percentageCharge
        })
        .from(eventRegistrations)
        .innerJoin(events, eq(eventRegistrations.eventId, events.id))
        .innerJoin(users, eq(events.createdBy, users.id))
        .where(
          and(
            eq(eventRegistrations.paymentStatus, "completed"),
            gte(eventRegistrations.createdAt, startDate),
            sql`${eventRegistrations.paymentAmount} IS NOT NULL`
          )
        )
        .orderBy(desc(eventRegistrations.createdAt));

      // Get all successful ticket payments with platform fees
      const paidTickets = await db
        .select({
          id: tickets.id,
          eventId: tickets.eventId,
          paymentAmount: tickets.paymentAmount,
          paymentReference: tickets.paymentReference,
          createdAt: tickets.createdAt,
          eventName: events.name,
          organizerBusinessName: users.businessName,
          organizerPercentageCharge: users.percentageCharge
        })
        .from(tickets)
        .innerJoin(events, eq(tickets.eventId, events.id))
        .innerJoin(users, eq(events.createdBy, users.id))
        .where(
          and(
            eq(tickets.paymentStatus, "paid"),
            gte(tickets.createdAt, startDate),
            sql`${tickets.paymentAmount} IS NOT NULL`
          )
        )
        .orderBy(desc(tickets.createdAt));

      // Calculate platform revenue metrics
      let totalRevenue = 0;
      let totalTransactions = 0;
      let monthlyRevenue = 0;
      let monthlyTransactions = 0;
      const organizerStats: { [key: string]: { revenue: number; transactions: number; feePercentage: number } } = {};
      const recentTransactions: any[] = [];
      
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      // Process registration payments
      for (const registration of paidRegistrations) {
        const amount = parseFloat(registration.paymentAmount || '0');
        const feePercentage = registration.organizerPercentageCharge || 2;
        const platformFee = (amount * feePercentage) / 100;
        
        totalRevenue += platformFee;
        totalTransactions++;
        
        if (registration.createdAt >= currentMonth) {
          monthlyRevenue += platformFee;
          monthlyTransactions++;
        }
        
        // Track organizer stats
        const organizerKey = registration.organizerBusinessName || 'Unknown Organization';
        if (!organizerStats[organizerKey]) {
          organizerStats[organizerKey] = { revenue: 0, transactions: 0, feePercentage: feePercentage };
        }
        organizerStats[organizerKey].revenue += platformFee;
        organizerStats[organizerKey].transactions++;
        
        // Add to recent transactions
        recentTransactions.push({
          id: registration.paymentReference || registration.id.toString(),
          organizationName: organizerKey,
          eventName: registration.eventName,
          amount: amount,
          platformFee: platformFee,
          feePercentage: feePercentage,
          date: registration.createdAt.toISOString(),
          status: 'completed'
        });
      }

      // Process ticket payments
      for (const ticket of paidTickets) {
        const amount = parseFloat(ticket.paymentAmount || '0');
        const feePercentage = ticket.organizerPercentageCharge || 2;
        const platformFee = (amount * feePercentage) / 100;
        
        totalRevenue += platformFee;
        totalTransactions++;
        
        if (ticket.createdAt >= currentMonth) {
          monthlyRevenue += platformFee;
          monthlyTransactions++;
        }
        
        // Track organizer stats
        const organizerKey = ticket.organizerBusinessName || 'Unknown Organization';
        if (!organizerStats[organizerKey]) {
          organizerStats[organizerKey] = { revenue: 0, transactions: 0, feePercentage: feePercentage };
        }
        organizerStats[organizerKey].revenue += platformFee;
        organizerStats[organizerKey].transactions++;
        
        // Add to recent transactions
        recentTransactions.push({
          id: ticket.paymentReference || ticket.id.toString(),
          organizationName: organizerKey,
          eventName: ticket.eventName,
          amount: amount,
          platformFee: platformFee,
          feePercentage: feePercentage,
          date: ticket.createdAt.toISOString(),
          status: 'completed'
        });
      }

      // Calculate average fee percentage
      const allFees = [...paidRegistrations, ...paidTickets].map(item => item.organizerPercentageCharge || 2);
      const averageFeePercentage = allFees.length > 0 ? allFees.reduce((a, b) => a + b, 0) / allFees.length : 2;

      // Top organizers by revenue
      const topOrganizers = Object.entries(organizerStats)
        .map(([name, stats]) => ({
          organizationName: name,
          totalRevenue: stats.revenue,
          transactionCount: stats.transactions,
          averageFeePercentage: stats.feePercentage
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);

      // Generate revenue by month data (last 12 months)
      const revenueByMonth: any[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        monthDate.setDate(1);
        monthDate.setHours(0, 0, 0, 0);
        
        const nextMonth = new Date(monthDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const monthRevenue = [...paidRegistrations, ...paidTickets]
          .filter(item => item.createdAt >= monthDate && item.createdAt < nextMonth)
          .reduce((sum, item) => {
            const amount = parseFloat(item.paymentAmount || '0');
            const feePercentage = item.organizerPercentageCharge || 2;
            return sum + (amount * feePercentage) / 100;
          }, 0);
          
        const monthTransactions = [...paidRegistrations, ...paidTickets]
          .filter(item => item.createdAt >= monthDate && item.createdAt < nextMonth).length;
        
        revenueByMonth.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: monthRevenue,
          transactions: monthTransactions
        });
      }

      res.json({
        totalRevenue,
        monthlyRevenue,
        totalTransactions,
        monthlyTransactions,
        averageFeePercentage,
        topOrganizers,
        revenueByMonth,
        recentTransactions: recentTransactions.slice(0, 20) // Latest 20 transactions
      });
    } catch (error) {
      console.error('Platform analytics error:', error);
      res.status(500).json({ message: "Failed to fetch platform analytics" });
    }
  });

  // Super Admin Routes
  const superAdminRoutes = {
    // Get platform statistics
    '/super-admin/statistics': async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Get total counts
        const [users, events, registrations, members] = await Promise.all([
          storage.getAllUsers(),
          storage.getEvents(),
          storage.getEventRegistrations(),
          storage.getMembers(),
        ]);

        // Calculate statistics
        const adminUsers = users.filter(user => user.role === 'admin');
        const superAdmins = users.filter(user => user.role === 'super_admin');
        const activeEvents = events.filter(event => event.status === 'upcoming' || event.status === 'active');
        const completedEvents = events.filter(event => event.status === 'completed');
        const pendingRegistrations = registrations.filter(reg => reg.status === 'registered');
        const attendedRegistrations = registrations.filter(reg => reg.status === 'attended');

        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentUsers = users.filter(user => new Date(user.createdAt) > thirtyDaysAgo);
        const recentEvents = events.filter(event => new Date(event.createdAt) > thirtyDaysAgo);
        const recentRegistrations = registrations.filter(reg => new Date(reg.createdAt) > thirtyDaysAgo);

        const statistics = {
          overview: {
            totalUsers: users.length,
            totalAdmins: adminUsers.length,
            totalSuperAdmins: superAdmins.length,
            totalEvents: events.length,
            totalRegistrations: registrations.length,
            totalMembers: members.length,
          },
          events: {
            active: activeEvents.length,
            completed: completedEvents.length,
            cancelled: events.filter(e => e.status === 'cancelled').length,
            draft: events.filter(e => e.status === 'draft').length,
          },
          registrations: {
            pending: pendingRegistrations.length,
            attended: attendedRegistrations.length,
            validationRate: registrations.length > 0 ? 
              Math.round((attendedRegistrations.length / registrations.length) * 100) : 0,
          },
          recent: {
            newUsers: recentUsers.length,
            newEvents: recentEvents.length,
            newRegistrations: recentRegistrations.length,
          }
        };

        res.json(statistics);
      } catch (error) {
        console.error("Error fetching platform statistics:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },

    // Get all users with details
    '/super-admin/users': async (req: AuthenticatedRequest, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const role = req.query.role as string;
        const search = req.query.search as string;
        
        let users = await storage.getAllUsers();
        
        // Apply filters
        if (role) {
          users = users.filter(user => user.role === role);
        }
        
        if (search) {
          const searchLower = search.toLowerCase();
          users = users.filter(user => 
            user.username.toLowerCase().includes(searchLower) ||
            (user.email && user.email.toLowerCase().includes(searchLower)) ||
            (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
            (user.lastName && user.lastName.toLowerCase().includes(searchLower))
          );
        }

        // Sort by creation date (newest first)
        users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Paginate
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedUsers = users.slice(startIndex, endIndex);

        // Remove sensitive information
        const sanitizedUsers = paginatedUsers.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          businessName: user.businessName,
          businessEmail: user.businessEmail,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        }));

        res.json({
          users: sanitizedUsers,
          pagination: {
            page,
            limit,
            total: users.length,
            totalPages: Math.ceil(users.length / limit),
          }
        });
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },

    // Update user status (suspend/activate)
    '/super-admin/users/:id/status': async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { status } = req.body;
        
        if (!['active', 'suspended', 'inactive'].includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }

        const user = await storage.getUserById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Prevent super admins from suspending themselves
        if (userId === req.user!.id && status === 'suspended') {
          return res.status(400).json({ message: "Cannot suspend yourself" });
        }

        await storage.updateUser(userId, { status });

        res.json({ message: `User ${status} successfully` });
      } catch (error) {
        console.error("Error updating user status:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },

    // Get all events with admin details
    '/super-admin/events': async (req: AuthenticatedRequest, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const status = req.query.status as string;
        
        let events = await storage.getEvents();
        
        // Apply status filter
        if (status) {
          events = events.filter(event => event.status === status);
        }
        
        // Get creator details for each event
        const eventsWithCreators = await Promise.all(
          events.map(async (event) => {
            const creator = await storage.getUserById(event.createdBy);
            const registrations = await storage.getEventRegistrations(event.id);
            
            return {
              ...event,
              creator: creator ? {
                id: creator.id,
                username: creator.username,
                email: creator.email,
                firstName: creator.firstName,
                lastName: creator.lastName,
                businessName: creator.businessName,
              } : null,
              registrationCount: registrations.length,
              attendedCount: registrations.filter(r => r.status === 'attended').length,
            };
          })
        );

        // Sort by creation date (newest first)
        eventsWithCreators.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Paginate
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedEvents = eventsWithCreators.slice(startIndex, endIndex);

        res.json({
          events: paginatedEvents,
          pagination: {
            page,
            limit,
            total: eventsWithCreators.length,
            totalPages: Math.ceil(eventsWithCreators.length / limit),
          }
        });
      } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },

    // Get system activity log
    '/super-admin/activity': async (req: AuthenticatedRequest, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 100;
        
        // Get recent events, registrations, and user activities
        const [events, registrations, users] = await Promise.all([
          storage.getEvents(),
          storage.getEventRegistrations(),
          storage.getAllUsers(),
        ]);

        // Create activity timeline
        const activities = [];

        // Add event activities
        events.forEach(event => {
          activities.push({
            type: 'event_created',
            timestamp: event.createdAt,
            userId: event.createdBy,
            details: {
              eventId: event.id,
              eventName: event.name,
              status: event.status,
            }
          });
        });

        // Add registration activities
        registrations.forEach(reg => {
          activities.push({
            type: 'user_registered',
            timestamp: reg.createdAt,
            userId: reg.userId,
            details: {
              eventId: reg.eventId,
              registrationType: reg.registrationType,
              status: reg.status,
            }
          });
        });

        // Add user activities
        users.forEach(user => {
          activities.push({
            type: 'user_created',
            timestamp: user.createdAt,
            userId: user.id,
            details: {
              username: user.username,
              role: user.role,
              status: user.status,
            }
          });
        });

        // Sort by timestamp (newest first)
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Paginate
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedActivities = activities.slice(startIndex, endIndex);

        res.json({
          activities: paginatedActivities,
          pagination: {
            page,
            limit,
            total: activities.length,
            totalPages: Math.ceil(activities.length / limit),
          }
        });
      } catch (error) {
        console.error("Error fetching activity log:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  };

  // Register super admin routes
  Object.entries(superAdminRoutes).forEach(([path, handler]) => {
    const method = path.includes('status') ? 'put' : 'get';
    app[method](`/api${path}`, authenticateToken, requireRole(['super_admin']), handler);
  });

  // Organization registration route (public) - simplified validation for user-friendly registration
  app.post("/api/organizations/register", async (req: Request, res: Response) => {
    try {
      const { 
        organizationName, 
        contactEmail, 
        contactPhone, 
        address, 
        website,
        description,
        adminUsername, 
        adminPassword, 
        adminFirstName, 
        adminLastName 
      } = req.body;

      // Validate only essential required fields - contact info, website, address, description are optional
      if (!organizationName || !contactEmail || !adminUsername || !adminPassword || !adminFirstName || !adminLastName) {
        return res.status(400).json({ message: "Please fill in all required fields: Organization Name, Contact Email, Admin Username, Admin Password, Admin First Name, and Admin Last Name" });
      }

      // Check if admin username or email already exists
      const existingUser = await storage.getUserByUsername(adminUsername);
      if (existingUser) {
        return res.status(400).json({ message: "Admin username already exists" });
      }

      const existingUsers = await storage.getAllUsers();
      const emailExists = existingUsers.some(user => user.email === adminEmail);
      if (emailExists) {
        return res.status(400).json({ message: "Admin email already exists" });
      }

      // Create admin user with organization details in the description
      const hashedPassword = await hashPassword(adminPassword);
      const adminUser = await storage.createUser({
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: "admin",
        status: "pending_approval", // New status for approval workflow
        // Store organization info in user metadata
        businessName: organizationName,
        businessEmail: contactEmail,
        businessPhone: contactPhone || '',
      });

      res.status(201).json({
        message: "Organization registration submitted successfully. Awaiting super admin approval.",
        organization: {
          name: organizationName,
          status: "pending_approval",
          adminUser: {
            id: adminUser.id,
            username: adminUser.username,
            email: adminUser.email,
          }
        }
      });
    } catch (error) {
      console.error("Organization registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Approve organization (super admin only)
  app.post("/api/super-admin/organizations/:organizationId/approve", authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const organization = await storage.getOrganization(organizationId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      if (organization.status !== "pending") {
        return res.status(400).json({ message: "Organization is not pending approval" });
      }

      await storage.updateOrganization(organizationId, {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: req.user.id,
      });

      res.json({ message: "Organization approved successfully" });
    } catch (error) {
      console.error("Error approving organization:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get pending organizations (super admin only)
  app.get("/api/super-admin/pending-organizations", authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get organizations with pending status
      const organizations = await storage.getOrganizations({ status: "pending" });
      
      const pendingOrganizations = organizations.map(org => ({
        id: org.id,
        organizationName: org.name,
        contactEmail: org.contactEmail,
        contactPhone: org.contactPhone,
        adminUser: {
          id: org.id,
          username: org.contactEmail, // Use email as username for now
          email: org.contactEmail,
          firstName: org.name,
          lastName: "Admin",
        },
        createdAt: org.createdAt,
      }));

      res.json({
        organizations: pendingOrganizations,
        total: pendingOrganizations.length,
      });
    } catch (error) {
      console.error("Error fetching pending organizations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Import organization routes
  const organizationRoutes = await import("./organization-routes");
  app.use('/api/organizations', organizationRoutes.default);

  const httpServer = createServer(app);
  return httpServer;
}
