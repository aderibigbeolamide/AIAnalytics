import type { Express, Request, Response } from "express";
import { mongoStorage } from "./mongodb-storage";
import { authenticateToken, type AuthenticatedRequest } from "./mongo-auth-routes";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { fileStorage } from "./storage-handler";

export function registerMongoDashboardRoutes(app: Express) {
  // Dashboard statistics
  app.get("/api/dashboard/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      
      // Get all data for the organization
      const events = await mongoStorage.getEvents(organizationId ? { organizationId } : {});
      const members = await mongoStorage.getMembers(organizationId ? { organizationId } : {});
      const registrations = await mongoStorage.getEventRegistrations();
      
      // Filter registrations by organization events
      const orgEventIds = events.map(e => e._id ? e._id.toString() : e.id?.toString() || '');
      const orgRegistrations = registrations.filter(r => {
        const eventId = r.eventId ? r.eventId.toString() : '';
        return orgEventIds.includes(eventId);
      });

      // Get all tickets for organization events
      let allTickets: any[] = [];
      for (const eventId of orgEventIds) {
        try {
          const eventTickets = await mongoStorage.getTickets({ eventId });
          allTickets.push(...eventTickets);
        } catch (error) {
          console.log(`No tickets found for event ${eventId}`);
        }
      }
      
      // Basic statistics (include both registrations and tickets)
      const totalEvents = events.length;
      const totalMembers = members.length;
      const totalRegistrations = orgRegistrations.length + allTickets.length; // Combined total
      
      // Event status breakdown
      const activeEvents = events.filter(e => e.status === 'active' || e.status === 'upcoming').length;
      const completedEvents = events.filter(e => e.status === 'completed').length;
      const upcomingEvents = events.filter(e => e.status === 'upcoming').length;
      
      // Validation and attendance statistics (include both registrations and tickets)
      const validatedRegistrations = orgRegistrations.filter(r => r.status === 'online' || r.status === 'attended').length;
      const validatedTickets = allTickets.filter(t => t.status === 'used').length;
      const totalValidated = validatedRegistrations + validatedTickets;
      
      const pendingRegistrations = orgRegistrations.filter(r => r.status === 'active' || r.status === 'pending').length;
      const pendingTickets = allTickets.filter(t => t.status === 'active' || t.status === 'paid').length;
      const pendingValidations = pendingRegistrations + pendingTickets;
      
      const validationRate = totalRegistrations > 0 ? (totalValidated / totalRegistrations) * 100 : 0;
      
      // Today's activity
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const registrationScansToday = orgRegistrations.filter(r => 
        r.validatedAt && r.validatedAt >= today && r.validatedAt < tomorrow
      ).length;
      
      const ticketScansToday = allTickets.filter(t => 
        t.validatedAt && t.validatedAt >= today && t.validatedAt < tomorrow
      ).length;
      
      const scansToday = registrationScansToday + ticketScansToday;
      
      // Auxiliary body statistics
      const auxiliaryBodyStats: { [key: string]: any } = {};
      
      // Get auxiliary bodies from members and registrations
      const allAuxiliaryBodies = new Set<string>();
      members.forEach(m => m.auxiliaryBody && allAuxiliaryBodies.add(m.auxiliaryBody));
      orgRegistrations.forEach(r => r.auxiliaryBody && allAuxiliaryBodies.add(r.auxiliaryBody));
      
      allAuxiliaryBodies.forEach(auxBody => {
        const auxMembers = members.filter(m => m.auxiliaryBody === auxBody);
        const auxRegistrations = orgRegistrations.filter(r => r.auxiliaryBody === auxBody);
        const auxValidated = auxRegistrations.filter(r => r.status === 'online');
        
        auxiliaryBodyStats[auxBody] = {
          totalMembers: auxMembers.length,
          activeMembers: auxMembers.filter(m => m.status === 'active').length,
          totalRegistrations: auxRegistrations.length,
          validatedRegistrations: auxValidated.length,
          validationRate: auxRegistrations.length > 0 ? (auxValidated.length / auxRegistrations.length) * 100 : 0
        };
      });
      
      // Recent activity trends (last 7 days vs previous 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const recentEvents = events.filter(e => e.createdAt && e.createdAt >= oneWeekAgo).length;
      const previousEvents = events.filter(e => e.createdAt && e.createdAt >= twoWeeksAgo && e.createdAt < oneWeekAgo).length;
      const eventTrend = previousEvents > 0 ? ((recentEvents - previousEvents) / previousEvents) * 100 : 0;
      
      const recentRegistrations = orgRegistrations.filter(r => r.createdAt && r.createdAt >= oneWeekAgo).length;
      const previousRegistrations = orgRegistrations.filter(r => r.createdAt && r.createdAt >= twoWeeksAgo && r.createdAt < oneWeekAgo).length;
      const registrationTrend = previousRegistrations > 0 ? ((recentRegistrations - previousRegistrations) / previousRegistrations) * 100 : 0;
      
      const recentRegistrationValidations = orgRegistrations.filter(r => r.validatedAt && r.validatedAt >= oneWeekAgo).length;
      const recentTicketValidations = allTickets.filter(t => t.validatedAt && t.validatedAt >= oneWeekAgo).length;
      const recentValidations = recentRegistrationValidations + recentTicketValidations;
      
      const previousRegistrationValidations = orgRegistrations.filter(r => r.validatedAt && r.validatedAt >= twoWeeksAgo && r.validatedAt < oneWeekAgo).length;
      const previousTicketValidations = allTickets.filter(t => t.validatedAt && t.validatedAt >= twoWeeksAgo && t.validatedAt < oneWeekAgo).length;
      const previousValidations = previousRegistrationValidations + previousTicketValidations;
      const validationTrend = previousValidations > 0 ? ((recentValidations - previousValidations) / previousValidations) * 100 : 0;
      
      // Event type breakdown
      const eventTypeStats: { [key: string]: number } = {};
      events.forEach(e => {
        eventTypeStats[e.eventType || 'other'] = (eventTypeStats[e.eventType || 'other'] || 0) + 1;
      });
      
      const stats = {
        // Core metrics
        totalEvents: totalEvents.toString(),
        totalMembers: totalMembers.toString(),
        totalRegistrations: totalRegistrations.toString(),
        
        // Event metrics
        activeEvents: activeEvents.toString(),
        upcomingEvents: upcomingEvents.toString(),
        completedEvents: completedEvents.toString(),
        
        // Validation metrics (combined registrations and tickets)
        validatedRegistrations: totalValidated.toString(),
        pendingValidations: pendingValidations.toString(),
        validationRate: Math.round(validationRate * 10) / 10, // Round to 1 decimal
        scansToday: scansToday.toString(),
        
        // Trends
        validationTrend: Math.round(validationTrend * 10) / 10,
        eventTrend: Math.round(eventTrend * 10) / 10,
        registrationTrend: Math.round(registrationTrend * 10) / 10,
        
        // Breakdown statistics
        auxiliaryBodyStats,
        eventTypeStats,
        
        // Recent activity summary
        recentActivity: {
          newEvents: recentEvents,
          newRegistrations: recentRegistrations,
          newValidations: recentValidations
        }
      };

      res.json(stats);
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get events for dashboard
  app.get("/api/events", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    console.log('*** DASHBOARD ROUTE: GET /api/events with COMPREHENSIVE STATS ***', new Date().toISOString());
    
    // Force no caching for this endpoint
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Last-Modified', new Date().toUTCString());
    
    try {
      const organizationId = req.user?.organizationId;
      console.log('Dashboard GET /api/events - Organization ID:', organizationId);
      
      const events = await mongoStorage.getEvents(organizationId ? { organizationId } : {});
      console.log('Total events found:', events.length);
      console.log('*** EXECUTING COMPREHENSIVE STATS CALCULATION FOR', events.length, 'EVENTS ***');
      
      // Calculate registration statistics for each event
      const eventsWithStats = [];
      
      for (const event of events) {
        try {
          const eventId = event._id?.toString();
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
          
          // Create event with comprehensive statistics
          const eventData = {
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
            requirePayment: event.requirePayment,
            paymentAmount: event.paymentAmount,
            paymentCurrency: event.paymentCurrency,
            eventType: event.eventType,
            eventImage: event.eventImage,
            createdAt: event.createdAt,
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
            requirePayment: event.requirePayment,
            paymentAmount: event.paymentAmount,
            paymentCurrency: event.paymentCurrency,
            eventType: event.eventType,
            eventImage: event.eventImage,
            createdAt: event.createdAt,
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
      
      console.log('*** FINAL EVENTS WITH COMPREHENSIVE STATS COUNT:', eventsWithStats.length);
      console.log('*** SAMPLE EVENT WITH STATS:', eventsWithStats[0] ? {
        name: eventsWithStats[0].name,
        totalRegistrations: eventsWithStats[0].totalRegistrations,
        memberRegistrations: eventsWithStats[0].memberRegistrations
      } : 'No events');
      
      res.json(eventsWithStats);
    } catch (error) {
      console.error("Error getting events:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get members for dashboard
  app.get("/api/members", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      
      const members = await mongoStorage.getMembers(organizationId ? { organizationId } : {});
      
      const formattedMembers = members.map(member => ({
        id: member._id.toString(),
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        auxiliaryBody: member.auxiliaryBody,
        membershipId: member.membershipId,
        status: member.status,
        createdAt: member.createdAt,
        organizationId: member.organizationId?.toString()
      }));

      res.json(formattedMembers);
    } catch (error) {
      console.error("Error getting members:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get auxiliary bodies dynamically from events and existing data
  app.get("/api/auxiliary-bodies", async (req: Request, res: Response) => {
    try {
      // Get all events from organization (or all events if no user context)
      const organizationId = req.user?.organizationId;
      const events = organizationId ? 
        await mongoStorage.getEventsByOrganization(organizationId) : 
        await mongoStorage.getEvents();
      
      const auxiliaryBodiesSet = new Set<string>();

      for (const event of events) {
        // Add eligibility criteria
        if (event.eligibility) {
          Object.keys(event.eligibility).forEach(key => {
            if (key !== 'invitee' && key !== 'guest' && event.eligibility[key]) {
              auxiliaryBodiesSet.add(key);
            }
          });
        }

        // Add options from custom form fields (radio, select, checkbox)
        if (event.customRegistrationFields) {
          event.customRegistrationFields.forEach(field => {
            if (field.type === 'radio' || field.type === 'select' || field.type === 'checkbox') {
              if (field.options) {
                field.options.forEach(option => {
                  if (option.trim()) {
                    auxiliaryBodiesSet.add(option.trim());
                  }
                });
              }
            }
          });
        }
      }

      // Also get auxiliary bodies from existing members and registrations
      const members = organizationId ? 
        await mongoStorage.getMembers({ organizationId }) : 
        await mongoStorage.getMembers();
      
      members.forEach(member => {
        if (member.auxiliaryBody && member.auxiliaryBody.trim()) {
          auxiliaryBodiesSet.add(member.auxiliaryBody.trim());
        }
      });

      const auxiliaryBodies = Array.from(auxiliaryBodiesSet).sort();
      res.json(auxiliaryBodies);
    } catch (error) {
      console.error("Error getting auxiliary bodies:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user preferences  
  app.get("/api/users/preferences/public", async (req: Request, res: Response) => {
    try {
      // Return default preferences
      // Get dynamic auxiliary bodies from events instead of hardcoded
      const organizationId = req.user?.organizationId;
      const events = organizationId ? 
        await mongoStorage.getEventsByOrganization(organizationId) : 
        await mongoStorage.getEvents();
      
      const auxiliaryBodiesSet = new Set<string>();
      for (const event of events) {
        if (event.eligibility) {
          Object.keys(event.eligibility).forEach(key => {
            if (key !== 'invitee' && key !== 'guest' && event.eligibility[key]) {
              auxiliaryBodiesSet.add(key);
            }
          });
        }
      }

      const preferences = {
        auxiliaryBodies: Array.from(auxiliaryBodiesSet).sort(),
        jamaats: ["Central", "Regional", "Local"],
        circuits: ["A", "B", "C", "D"]
      };

      res.json({ preferences });
    } catch (error) {
      console.error("Error getting user preferences:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get recommendations
  app.get("/api/recommendations/public", async (req: Request, res: Response) => {
    try {
      // Return empty recommendations for now
      res.json([]);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Configure multer for profile image uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    },
  });

  // Get organization profile
  app.get("/api/organization/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await mongoStorage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return organization profile data
      const profile = {
        businessName: user.businessName || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        description: user.description || "",
        website: user.website || "",
        profileImage: user.profileImage || null,
      };

      res.json(profile);
    } catch (error) {
      console.error("Error getting organization profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update organization profile
  app.put("/api/organization/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { businessName, email, phone, address, description, website } = req.body;

      // Update user profile
      await mongoStorage.updateUser(userId, {
        businessName,
        email,
        phone,
        address,
        description,
        website,
      });

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating organization profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update organization password
  app.put("/api/organization/password", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;

      // Get current user
      const user = await mongoStorage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await mongoStorage.updateUser(userId, {
        password: hashedPassword,
      });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upload organization profile image
  app.post("/api/organization/profile-image", authenticateToken, upload.single('profileImage'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }



      // Save file using fileStorage
      const uploadedFile = await fileStorage.saveFile(req.file, 'profile-images');

      // Update user profile with image path
      await mongoStorage.updateUser(userId, {
        profileImage: uploadedFile.url,
      });

      res.json({ 
        message: "Profile image updated successfully",
        imageUrl: uploadedFile.url 
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Simple test endpoint to check routing
  app.get("/api/banks-test", async (req: Request, res: Response) => {
    console.log("Test banks endpoint hit");
    res.json({ message: "Banks test endpoint working", timestamp: new Date() });
  });

  // Get Nigerian banks list - Essential for bank account setup
  app.get("/api/banks", async (req: Request, res: Response) => {
    console.log("Banks API endpoint hit - starting bank fetch...");
    
    try {
      // Check if Paystack key is available
      if (!process.env.PAYSTACK_SECRET_KEY) {
        console.error("PAYSTACK_SECRET_KEY not configured");
        return res.json({
          success: false,
          message: "Bank service configuration missing"
        });
      }

      console.log("Paystack key available, making API call...");
      
      // Direct fetch to Paystack API
      const response = await fetch('https://api.paystack.co/bank?country=nigeria', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("Paystack API response status:", response.status);
      
      if (!response.ok) {
        console.error("Paystack API error:", response.status, response.statusText);
        return res.json({
          success: false,
          message: `Paystack API error: ${response.status}`
        });
      }

      const data = await response.json();
      console.log("Paystack data received:", data?.status ? "Success" : "Failed");
      
      if (data && data.status) {
        const banks = data.data || [];
        
        // Sort banks alphabetically
        const sortedBanks = banks.sort((a: any, b: any) => a.name.localeCompare(b.name));
        
        // Categorize banks
        const categorizedBanks = sortedBanks.map((bank: any) => ({
          ...bank,
          type: bank.name.toLowerCase().includes('microfinance') || 
                bank.name.toLowerCase().includes('micro finance') ? 'microfinance' : 'commercial'
        }));
        
        const commercialBanks = categorizedBanks.filter((bank: any) => bank.type === 'commercial');
        const microfinanceBanks = categorizedBanks.filter((bank: any) => bank.type === 'microfinance');
        
        console.log(`Returning ${categorizedBanks.length} banks (${commercialBanks.length} commercial, ${microfinanceBanks.length} microfinance)`);
        
        return res.json({
          success: true,
          banks: categorizedBanks,
          statistics: {
            total: categorizedBanks.length,
            commercial: commercialBanks.length,
            microfinance: microfinanceBanks.length
          },
          message: `Found ${categorizedBanks.length} banks including ${microfinanceBanks.length} microfinance banks`
        });
      } else {
        console.error("Paystack response not successful:", data?.message || "Unknown error");
        return res.json({
          success: false,
          message: data?.message || "Failed to fetch banks from Paystack API"
        });
      }
    } catch (error) {
      console.error("Banks API error:", error);
      return res.json({ 
        success: false,
        message: "Failed to fetch banks. Please check your internet connection and try again.",
        error: error instanceof Error ? error.message : String(error)
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

      const { verifyBankAccount } = await import("./paystack");
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

  // Get user's bank account details (PRIVATE - only for account owner)
  app.get("/api/users/bank-account", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Get the actual user data from MongoDB
      const user = await mongoStorage.getUserById(userId);
      
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
  app.put("/api/users/bank-account", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { 
        bankCode, 
        accountNumber, 
        businessName, 
        businessEmail, 
        businessPhone,
        percentageCharge = 2 
      } = req.body;

      // Only super admin can modify platform fee (percentageCharge)
      let finalPercentageCharge = 2; // Default value
      if (req.body.percentageCharge !== undefined) {
        if (req.user.role !== "super_admin") {
          return res.status(403).json({ 
            success: false,
            message: "Only super admin can modify platform fees" 
          });
        }
        finalPercentageCharge = percentageCharge;
      } else {
        // If not provided, keep existing value or use default
        const existingUser = await mongoStorage.getUserById(userId);
        finalPercentageCharge = existingUser?.percentageCharge || 2;
      }

      // Extract just the bank code from the combined value (format: "code|name|id")
      const cleanBankCode = bankCode.includes('|') ? bankCode.split('|')[0] : bankCode;
      console.log(`Bank account edit: Original bankCode: "${bankCode}", Cleaned: "${cleanBankCode}", Account: ${accountNumber}`);

      // Verify the account before updating
      const paystackModule = await import("./paystack");
      const verificationData = await paystackModule.verifyBankAccount(accountNumber, cleanBankCode);
      
      if (!verificationData.status) {
        return res.status(400).json({
          success: false,
          message: verificationData.message || "Account verification failed"
        });
      }

      // Get bank name from banks list
      const banksData = await paystackModule.getNigerianBanks();
      const selectedBank = banksData.data?.find((bank: any) => bank.code === cleanBankCode);
      const bankName = selectedBank ? selectedBank.name : `Bank Code ${cleanBankCode}`;

      // Update user with new bank account details
      await mongoStorage.updateUser(userId, {
        bankName: bankName,
        accountNumber: accountNumber,
        accountName: verificationData.data.account_name,
        bankCode: cleanBankCode,
        businessName: businessName,
        businessEmail: businessEmail,
        businessPhone: businessPhone,
        percentageCharge: finalPercentageCharge,
        isVerified: true
      });

      res.json({
        success: true,
        message: "Bank account updated successfully",
        accountName: verificationData.data.account_name
      });
    } catch (error: any) {
      console.error("Update bank account error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to update bank account" 
      });
    }
  });

  // Setup bank account for user (create Paystack subaccount)
  app.post("/api/users/setup-bank-account", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { 
        bankCode, 
        accountNumber, 
        businessName, 
        businessEmail, 
        businessPhone,
        percentageCharge = 2 
      } = req.body;

      // Only super admin can modify platform fee (percentageCharge)
      let finalPercentageCharge = 2; // Default value
      if (req.body.percentageCharge !== undefined) {
        if (req.user.role !== "super_admin") {
          return res.status(403).json({ 
            success: false,
            message: "Only super admin can modify platform fees" 
          });
        }
        finalPercentageCharge = percentageCharge;
      }

      // Verify the bank account first
      const paystackModule = await import("./paystack");
      const verificationData = await paystackModule.verifyBankAccount(accountNumber, bankCode);

      if (!verificationData.status) {
        return res.status(400).json({
          success: false,
          message: verificationData.message || "Account verification failed"
        });
      }

      // Get bank name from banks list
      const banksData = await paystackModule.getNigerianBanks();
      const selectedBank = banksData.data?.find((bank: any) => bank.code === bankCode);
      const bankName = selectedBank ? selectedBank.name : `Bank Code ${bankCode}`;

      // Create Paystack subaccount
      const subaccountData = await paystackModule.createSubaccount({
        business_name: businessName,
        bank_code: bankCode,
        account_number: accountNumber,
        percentage_charge: finalPercentageCharge,
        description: `Subaccount for ${businessName}`,
        primary_contact_email: businessEmail,
        primary_contact_name: businessName,
        primary_contact_phone: businessPhone,
        metadata: {
          user_id: userId
        }
      });

      if (!subaccountData.status) {
        return res.status(400).json({
          success: false,
          message: subaccountData.message || "Failed to create subaccount"
        });
      }

      // Update user with bank account details
      await mongoStorage.updateUser(userId, {
        paystackSubaccountCode: subaccountData.data.subaccount_code,
        bankName: bankName,
        accountNumber: accountNumber,
        accountName: verificationData.data.account_name,
        bankCode: bankCode,
        businessName: businessName,
        businessEmail: businessEmail,
        businessPhone: businessPhone,
        percentageCharge: finalPercentageCharge,
        isVerified: true
      });

      res.json({
        success: true,
        message: "Bank account setup successfully",
        subaccountCode: subaccountData.data.subaccount_code,
        accountName: verificationData.data.account_name
      });
    } catch (error: any) {
      console.error("Setup bank account error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to setup bank account" 
      });
    }
  });

  // Update bank account for user
  app.put("/api/users/bank-account", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { 
        bankCode, 
        accountNumber, 
        businessName, 
        businessEmail, 
        businessPhone,
        percentageCharge = 2 
      } = req.body;

      // Verify the bank account first
      const paystackModule = await import("./paystack");
      const verificationData = await paystackModule.verifyBankAccount(accountNumber, bankCode);

      if (!verificationData.status) {
        return res.status(400).json({
          success: false,
          message: verificationData.message || "Account verification failed"
        });
      }

      // Get bank name from banks list
      const banksData = await paystackModule.getNigerianBanks();
      const selectedBank = banksData.data?.find((bank: any) => bank.code === bankCode);
      const bankName = selectedBank ? selectedBank.name : `Bank Code ${bankCode}`;

      // Update user with new bank account details
      await mongoStorage.updateUser(userId, {
        bankName: bankName,
        accountNumber: accountNumber,
        accountName: verificationData.data.account_name,
        bankCode: bankCode,
        businessName: businessName,
        businessEmail: businessEmail,
        businessPhone: businessPhone,
        percentageCharge: percentageCharge,
        isVerified: true
      });

      res.json({
        success: true,
        message: "Bank account updated successfully",
        accountName: verificationData.data.account_name
      });
    } catch (error: any) {
      console.error("Update bank account error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to update bank account" 
      });
    }
  });

  // Get payment history for user's events (for bank account setup page)
  app.get("/api/payments/my-events", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await mongoStorage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Extract the actual organization ID string from the user object
      let organizationId: string;
      if (typeof user.organizationId === 'string') {
        organizationId = user.organizationId;
      } else if (user.organizationId && typeof user.organizationId === 'object') {
        organizationId = user.organizationId._id?.toString() || user.organizationId.toString();
      } else {
        return res.status(400).json({ message: "No organization associated with user" });
      }

      // Get all events for this organization
      const events = await mongoStorage.getEvents({ organizationId });
      const eventIds = events.map(e => e._id.toString());

      if (eventIds.length === 0) {
        return res.json({
          transactions: [],
          summary: {
            totalRevenue: 0,
            totalTransactions: 0,
            ticketSales: 0,
            registrationFees: 0
          }
        });
      }

      // Get all tickets for events in this organization
      const tickets = await mongoStorage.getTickets({ 
        paymentStatus: 'paid'
      });
      
      // Filter tickets by organization events
      const organizationTickets = tickets.filter(ticket => 
        eventIds.includes(ticket.eventId.toString())
      );
      
      const registrations = await mongoStorage.getEventRegistrations(undefined, { 
        eventIds,
        paymentStatus: 'paid'
      });

      // Format payment history
      const ticketPayments = organizationTickets.map(ticket => ({
        id: ticket._id.toString(),
        type: 'ticket',
        amount: ticket.price,
        currency: ticket.currency,
        paymentMethod: ticket.paymentMethod,
        paymentReference: ticket.paymentReference,
        status: ticket.paymentStatus,
        customerEmail: ticket.ownerEmail,
        customerName: ticket.ownerName,
        eventName: events.find(e => e._id.toString() === ticket.eventId.toString())?.name || 'Unknown Event',
        ticketCategory: ticket.category,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
      }));

      const registrationPayments = registrations
        .filter(reg => reg.paymentAmount && reg.paymentStatus === 'paid')
        .map(registration => ({
          id: registration._id.toString(),
          type: 'registration',
          amount: registration.paymentAmount,
          currency: registration.paymentCurrency || 'NGN',
          paymentMethod: registration.paymentMethod || 'paystack',
          paymentReference: registration.paymentReference,
          status: registration.paymentStatus,
          customerEmail: registration.email || registration.Email,
          customerName: registration.fullName || registration.FullName || 'Unknown',
          eventName: events.find(e => e._id.toString() === registration.eventId.toString())?.name || 'Unknown Event',
          registrationType: registration.registrationType,
          createdAt: registration.createdAt,
          updatedAt: registration.updatedAt
        }));

      // Combine and sort by date (newest first)
      const allPayments = [...ticketPayments, ...registrationPayments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Calculate summary stats
      const totalRevenue = allPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const totalTransactions = allPayments.length;

      res.json({
        transactions: allPayments,
        summary: {
          totalRevenue,
          totalTransactions,
          ticketSales: ticketPayments.length,
          registrationFees: registrationPayments.length
        }
      });
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

}