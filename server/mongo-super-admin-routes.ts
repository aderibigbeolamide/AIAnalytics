import type { Express, Request, Response } from "express";
import { mongoStorage } from "./mongodb-storage";
import { authenticateToken, type AuthenticatedRequest } from "./mongo-auth-routes";
import { User, Notification } from "../shared/mongoose-schema.js";
import mongoose from "mongoose";

function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin access required" });
  }

  next();
}

export function registerMongoSuperAdminRoutes(app: Express) {
  // Emergency approval email endpoint (no auth required)
  app.post("/api/emergency/send-approval-emails", async (req: Request, res: Response) => {
    try {
      console.log('🚨 Emergency approval email endpoint called');
      
      // Send emails to the two recently approved organizations
      const emergencyOrgIds = ["68beee402f37190d09fceccd", "68bef1cc8b7f3259cae88cdd"];
      console.log('📧 Sending approval emails to:', emergencyOrgIds);
      
      const results = [];
      
      for (const orgId of emergencyOrgIds) {
        try {
          console.log(`\n📧 Processing organization: ${orgId}`);
          
          // Get organization details
          const organization = await mongoStorage.getOrganization(orgId);
          if (!organization) {
            results.push({ orgId, status: 'error', message: 'Organization not found' });
            continue;
          }
          
          console.log(`Found organization: ${organization.name} (status: ${organization.status})`);
          
          // Find admin user for this organization
          const allUsers = await mongoStorage.getAllUsers();
          const orgUsers = allUsers.filter(user => {
            if (!user.organizationId) return false;
            
            let userOrgId;
            if (typeof user.organizationId === 'object') {
              userOrgId = user.organizationId._id ? user.organizationId._id.toString() : user.organizationId.toString();
            } else {
              userOrgId = user.organizationId.toString();
            }
            
            return userOrgId === orgId;
          });
          
          console.log(`Found ${orgUsers.length} users for organization:`, orgUsers.map(u => ({ email: u.email, role: u.role })));
          
          const adminUser = orgUsers.find(user => user.role === 'admin');
          if (!adminUser) {
            results.push({ orgId, status: 'error', message: 'No admin user found' });
            continue;
          }
          
          console.log(`👤 Found admin user: ${adminUser.email}`);
          
          // Send approval email
          const { emailService } = await import('./services/email-service');
          await emailService.sendOrganizationApprovalEmail(adminUser.email, {
            organizationName: organization.name,
            contactPerson: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || adminUser.username,
            status: 'approved',
            loginUrl: `${process.env.APP_DOMAIN || 'http://localhost:5000'}/login`,
            adminEmail: 'admin@eventifyai.com'
          });
          
          console.log(`✅ Approval email sent to ${adminUser.email} for ${organization.name}`);
          results.push({ 
            orgId, 
            status: 'success', 
            message: `Email sent to ${adminUser.email}`,
            organizationName: organization.name,
            adminEmail: adminUser.email
          });
          
        } catch (orgError) {
          console.error(`❌ Error processing organization ${orgId}:`, orgError);
          results.push({ orgId, status: 'error', message: orgError.message });
        }
      }
      
      res.json({ 
        message: "Emergency approval emails sent",
        results 
      });
      
    } catch (error) {
      console.error("Error sending emergency approval emails:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });

  // Get platform fee settings
  app.get("/api/super-admin/platform-fee", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get current platform fee from settings or default
      const settings = await mongoStorage.getPlatformSettings();
      res.json({
        success: true,
        platformFee: settings?.platformFee || 2
      });
    } catch (error: any) {
      console.error("Get platform fee error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch platform fee" 
      });
    }
  });

  // Update platform fee (Super admin only)
  app.put("/api/super-admin/platform-fee", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { platformFee } = req.body;
      
      if (typeof platformFee !== 'number' || platformFee < 0 || platformFee > 20) {
        return res.status(400).json({
          success: false,
          message: "Platform fee must be a number between 0 and 20"
        });
      }

      // Update platform fee in settings
      await mongoStorage.updatePlatformSettings({ platformFee });
      
      res.json({
        success: true,
        message: "Platform fee updated successfully",
        platformFee
      });
    } catch (error: any) {
      console.error("Update platform fee error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to update platform fee" 
      });
    }
  });

  // PATCH endpoint for platform settings (matches frontend API call)
  app.patch("/api/super-admin/platform-settings", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { platformFeeRate } = req.body;
      
      if (typeof platformFeeRate !== 'number' || platformFeeRate < 0 || platformFeeRate > 20) {
        return res.status(400).json({
          success: false,
          message: "Platform fee rate must be a number between 0 and 20"
        });
      }

      // Update platform fee in settings
      await mongoStorage.updatePlatformSettings({ platformFee: platformFeeRate });
      
      res.json({
        success: true,
        message: "Platform fee rate updated successfully",
        platformFeeRate: platformFeeRate
      });
    } catch (error: any) {
      console.error("Update platform settings error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to update platform settings" 
      });
    }
  });

  // Get comprehensive platform statistics for growth analysis
  app.get("/api/super-admin/statistics", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      const yesterdayStart = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      yesterdayStart.setHours(0, 0, 0, 0);
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      // Get all data
      const allUsers = await mongoStorage.getAllUsers();
      const allOrganizations = await mongoStorage.getOrganizations();
      const allEvents = await mongoStorage.getEvents();
      const allMembers = await mongoStorage.getMembers();
      
      // Calculate total payments and revenue
      let totalRevenue = 0;
      let totalTransactions = 0;
      let totalRegistrations = 0;
      let paidRegistrations = 0;
      let ticketsSold = 0;
      let totalTicketRevenue = 0;
      
      for (const event of allEvents) {
        try {
          const eventId = (event._id as any).toString();
          
          // Get registrations for registration-based events
          const registrations = await mongoStorage.getEventRegistrations(eventId);
          totalRegistrations += registrations.length;
          
          // Count paid registrations
          const eventPaidRegs = registrations.filter(r => r.paymentStatus === 'paid').length;
          paidRegistrations += eventPaidRegs;
          
          // Get tickets for ticket-based events
          if (event.eventType === 'ticket') {
            const tickets = await mongoStorage.getTickets({ eventId });
            ticketsSold += tickets.filter(t => t.paymentStatus === 'paid').length;
            
            // Calculate ticket revenue
            const ticketRevenue = tickets
              .filter(t => t.paymentStatus === 'paid')
              .reduce((sum, ticket) => sum + (ticket.price || 0), 0);
            totalTicketRevenue += ticketRevenue;
          }
          
          // Get payment history - try both array and single ID
          const payments = await mongoStorage.getPaymentHistory([eventId]);
          const eventRevenue = payments
            .filter(p => p.status === 'success')
            .reduce((sum, payment) => sum + (payment.amount || 0), 0);
          
          totalRevenue += eventRevenue;
          totalTransactions += payments.filter(p => p.status === 'success').length;
        } catch (error) {
          console.error(`Error calculating stats for event ${event.name}:`, error);
        }
      }

      // Calculate platform fees earned (assuming 2% default)
      const platformSettings = await mongoStorage.getPlatformSettings();
      const platformFeeRate = (platformSettings?.platformFee || 2) / 100;
      const platformFeesEarned = Math.round(totalRevenue * platformFeeRate);

      // Time-based statistics
      const newUsersLast7Days = allUsers.filter(u => u.createdAt >= sevenDaysAgo).length;
      const newUsersLast30Days = allUsers.filter(u => u.createdAt >= thirtyDaysAgo).length;
      const newEventsLast7Days = allEvents.filter(e => e.createdAt >= sevenDaysAgo).length;
      const newEventsLast30Days = allEvents.filter(e => e.createdAt >= thirtyDaysAgo).length;
      const newOrgsLast7Days = allOrganizations.filter(o => o.createdAt >= sevenDaysAgo).length;
      const newOrgsLast30Days = allOrganizations.filter(o => o.createdAt >= thirtyDaysAgo).length;

      // Event status analysis
      const upcomingEvents = allEvents.filter(e => {
        const eventDate = new Date(e.startDate);
        return eventDate > now && e.status !== 'cancelled';
      }).length;
      
      const pastEvents = allEvents.filter(e => {
        const eventDate = new Date(e.startDate);
        return eventDate <= now;
      }).length;
      
      const cancelledEvents = allEvents.filter(e => e.status === 'cancelled').length;

      // User engagement metrics
      const activeUsers = allUsers.filter(u => u.status === 'active').length;
      const pendingUsers = allUsers.filter(u => u.status === 'pending').length;
      const suspendedUsers = allUsers.filter(u => u.status === 'suspended').length;
      
      // Organization metrics
      const approvedOrgs = allOrganizations.filter(o => o.status === 'approved').length;
      const pendingOrgs = allOrganizations.filter(o => o.status === 'pending').length;
      const suspendedOrgs = allOrganizations.filter(o => o.status === 'suspended').length;

      // Growth metrics (comparing last 7 days vs previous 7 days)
      const previous7Days = new Date(sevenDaysAgo.getTime() - (7 * 24 * 60 * 60 * 1000));
      const userGrowthRate = ((newUsersLast7Days / Math.max(allUsers.filter(u => u.createdAt >= previous7Days && u.createdAt < sevenDaysAgo).length, 1)) - 1) * 100;
      const eventGrowthRate = ((newEventsLast7Days / Math.max(allEvents.filter(e => e.createdAt >= previous7Days && e.createdAt < sevenDaysAgo).length, 1)) - 1) * 100;

      const statistics = {
        overview: {
          totalUsers: allUsers.length,
          totalOrganizations: allOrganizations.length,
          totalEvents: allEvents.length,
          totalMembers: allMembers.length,
          totalAdmins: allUsers.filter(u => u.role === 'admin').length,
          totalSuperAdmins: allUsers.filter(u => u.role === 'super_admin').length,
          totalRegistrations: totalRegistrations,
          activeUsers,
          approvedOrganizations: approvedOrgs,
          upcomingEvents,
          activeMembers: allMembers.filter(m => m.status === 'active').length
        },
        financial: {
          totalRevenue: Math.round((totalRevenue + totalTicketRevenue) / 100), // Convert from kobo to naira
          totalTransactions,
          platformFeesEarned: Math.round(((totalRevenue + totalTicketRevenue) * platformFeeRate) / 100),
          ticketsSold,
          totalTicketRevenue: Math.round(totalTicketRevenue / 100),
          paidRegistrations,
          averageTransactionValue: totalTransactions > 0 ? Math.round(((totalRevenue + totalTicketRevenue) / totalTransactions) / 100) : 0
        },
        growth: {
          newUsersLast7Days,
          newUsersLast30Days,
          newEventsLast7Days,
          newEventsLast30Days,
          newOrgsLast7Days,
          newOrgsLast30Days,
          userGrowthRate: Math.round(userGrowthRate * 100) / 100,
          eventGrowthRate: Math.round(eventGrowthRate * 100) / 100
        },
        events: {
          upcoming: upcomingEvents,
          past: pastEvents,
          cancelled: cancelledEvents,
          total: allEvents.length,
          registrationBased: allEvents.filter(e => e.eventType === 'registration').length,
          ticketBased: allEvents.filter(e => e.eventType === 'ticket').length
        },
        users: {
          active: activeUsers,
          pending: pendingUsers,
          suspended: suspendedUsers,
          admins: allUsers.filter(u => u.role === 'admin').length,
          superAdmins: allUsers.filter(u => u.role === 'super_admin').length,
          members: allUsers.filter(u => u.role === 'member').length
        },
        organizations: {
          approved: approvedOrgs,
          pending: pendingOrgs,
          suspended: suspendedOrgs,
          total: allOrganizations.length
        },
        engagement: {
          totalRegistrations,
          paidRegistrations,
          freeRegistrations: totalRegistrations - paidRegistrations,
          conversionRate: totalRegistrations > 0 ? Math.round((paidRegistrations / totalRegistrations) * 100) : 0,
          averageRegistrationsPerEvent: allEvents.length > 0 ? Math.round(totalRegistrations / allEvents.length) : 0
        }
      };

      res.json({ success: true, statistics });
    } catch (error: any) {
      console.error("Get statistics error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch platform statistics" 
      });
    }
  });

  // Get organization-specific analytics
  app.get("/api/super-admin/organizations/:orgId/analytics", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orgId } = req.params;
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

      // Get organization data
      const organization = await mongoStorage.getOrganizations({ _id: orgId });
      if (!organization || organization.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Organization not found" 
        });
      }

      const org = organization[0];

      // Get users for this organization
      const orgUsers = await mongoStorage.getAllUsers({ organizationId: orgId });
      
      // Get events for this organization  
      const orgEvents = await mongoStorage.getEvents({ organizationId: orgId });
      
      // Calculate organization-specific metrics
      let totalRevenue = 0;
      let totalTransactions = 0;
      let totalRegistrations = 0;
      let paidRegistrations = 0;
      let ticketsSold = 0;
      let totalTicketRevenue = 0;
      
      for (const event of orgEvents) {
        try {
          const eventId = (event._id as any).toString();
          
          // Get registrations for registration-based events
          const registrations = await mongoStorage.getEventRegistrations(eventId);
          totalRegistrations += registrations.length;
          
          // Count paid registrations
          const eventPaidRegs = registrations.filter(r => r.paymentStatus === 'paid').length;
          paidRegistrations += eventPaidRegs;
          
          // Get tickets for ticket-based events
          if (event.eventType === 'ticket') {
            const tickets = await mongoStorage.getTickets({ eventId });
            ticketsSold += tickets.filter(t => t.paymentStatus === 'paid').length;
            
            // Calculate ticket revenue
            const ticketRevenue = tickets
              .filter(t => t.paymentStatus === 'paid')
              .reduce((sum, ticket) => sum + (ticket.price || 0), 0);
            totalTicketRevenue += ticketRevenue;
          }
          
          // Get payment history
          const payments = await mongoStorage.getPaymentHistory([eventId]);
          const eventRevenue = payments
            .filter(p => p.status === 'success')
            .reduce((sum, payment) => sum + (payment.amount || 0), 0);
          
          totalRevenue += eventRevenue;
          totalTransactions += payments.filter(p => p.status === 'success').length;
        } catch (error) {
          console.error(`Error calculating org stats for event ${event.name}:`, error);
        }
      }

      // Time-based statistics
      const newUsersLast7Days = orgUsers.filter(u => u.createdAt >= sevenDaysAgo).length;
      const newUsersLast30Days = orgUsers.filter(u => u.createdAt >= thirtyDaysAgo).length;
      const newEventsLast7Days = orgEvents.filter(e => e.createdAt >= sevenDaysAgo).length;
      const newEventsLast30Days = orgEvents.filter(e => e.createdAt >= thirtyDaysAgo).length;

      // Event status analysis
      const upcomingEvents = orgEvents.filter(e => {
        const eventDate = new Date(e.startDate);
        return eventDate > now && e.status !== 'cancelled';
      }).length;
      
      const pastEvents = orgEvents.filter(e => {
        const eventDate = new Date(e.startDate);
        return eventDate <= now;
      }).length;
      
      const cancelledEvents = orgEvents.filter(e => e.status === 'cancelled').length;

      // User engagement metrics
      const activeUsers = orgUsers.filter(u => u.status === 'active').length;
      const pendingUsers = orgUsers.filter(u => u.status === 'pending').length;
      const suspendedUsers = orgUsers.filter(u => u.status === 'suspended').length;

      const orgAnalytics = {
        organization: {
          id: (org._id as any).toString(),
          name: org.name,
          status: org.status,
          createdAt: org.createdAt
        },
        overview: {
          totalUsers: orgUsers.length,
          totalEvents: orgEvents.length,
          totalRegistrations: totalRegistrations,
          activeUsers,
          upcomingEvents
        },
        financial: {
          totalRevenue: Math.round((totalRevenue + totalTicketRevenue) / 100), // Convert from kobo to naira
          totalTransactions,
          ticketsSold,
          totalTicketRevenue: Math.round(totalTicketRevenue / 100),
          paidRegistrations,
          averageTransactionValue: totalTransactions > 0 ? Math.round(((totalRevenue + totalTicketRevenue) / totalTransactions) / 100) : 0
        },
        growth: {
          newUsersLast7Days,
          newUsersLast30Days,
          newEventsLast7Days,
          newEventsLast30Days
        },
        events: {
          upcoming: upcomingEvents,
          past: pastEvents,
          cancelled: cancelledEvents,
          total: orgEvents.length,
          registrationBased: orgEvents.filter(e => e.eventType === 'registration').length,
          ticketBased: orgEvents.filter(e => e.eventType === 'ticket').length
        },
        users: {
          active: activeUsers,
          pending: pendingUsers,
          suspended: suspendedUsers,
          admins: orgUsers.filter(u => u.role === 'admin').length,
          members: orgUsers.filter(u => u.role === 'member').length
        },
        engagement: {
          totalRegistrations,
          paidRegistrations,
          freeRegistrations: totalRegistrations - paidRegistrations,
          conversionRate: totalRegistrations > 0 ? Math.round((paidRegistrations / totalRegistrations) * 100) : 0,
          averageRegistrationsPerEvent: orgEvents.length > 0 ? Math.round(totalRegistrations / orgEvents.length) : 0
        }
      };

      res.json({ success: true, analytics: orgAnalytics });
    } catch (error: any) {
      console.error("Get organization analytics error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch organization analytics" 
      });
    }
  });

  // Platform fee management routes
  app.get("/api/super-admin/platform-fee", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = await mongoStorage.getPlatformSettings();
      res.json({ platformFee: settings.platformFee || 2 });
    } catch (error: any) {
      console.error("Get platform fee error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch platform fee" 
      });
    }
  });

  app.put("/api/super-admin/platform-fee", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { platformFee } = req.body;
      
      if (typeof platformFee !== 'number' || platformFee < 0 || platformFee > 20) {
        return res.status(400).json({
          success: false,
          message: "Platform fee must be a number between 0 and 20"
        });
      }

      await mongoStorage.updatePlatformSettings({ platformFee });
      
      res.json({ 
        success: true,
        message: "Platform fee updated successfully" 
      });
    } catch (error: any) {
      console.error("Update platform fee error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to update platform fee" 
      });
    }
  });

  // Get all users
  app.get("/api/super-admin/users", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const allUsers = await mongoStorage.getAllUsers();
      
      const users = allUsers.map(user => ({
        id: (user._id as any).toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId?.toString(),
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }));

      res.json({ users });
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all organizations
  app.get("/api/super-admin/organizations", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const allOrganizations = await mongoStorage.getOrganizations();
      
      const organizations = allOrganizations.map(org => ({
        id: (org._id as any).toString(),
        name: org.name,
        contactEmail: org.contactEmail,
        status: org.status,
        subscriptionPlan: org.subscriptionPlan,
        subscriptionStatus: org.subscriptionStatus,
        maxEvents: org.maxEvents,
        maxMembers: org.maxMembers,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        description: org.description,
        contactPhone: org.contactPhone,
        address: org.address,
        website: org.website,
        approvedAt: org.approvedAt
      }));

      res.json({ organizations });
    } catch (error) {
      console.error("Error getting organizations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get pending organizations
  app.get("/api/super-admin/pending-organizations", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pendingOrganizations = await mongoStorage.getOrganizations({ status: 'pending_approval' });
      
      const organizations = pendingOrganizations.map(org => ({
        id: (org._id as any).toString(),
        name: org.name,
        contactEmail: org.contactEmail,
        status: org.status,
        description: org.description,
        website: org.website,
        contactPhone: org.contactPhone,
        address: org.address,
        createdAt: org.createdAt
      }));

      res.json({ organizations });
    } catch (error) {
      console.error("Error getting pending organizations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all events with comprehensive oversight data
  app.get("/api/super-admin/events", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const allEvents = await mongoStorage.getEvents();
      const allOrganizations = await mongoStorage.getOrganizations();
      const allUsers = await mongoStorage.getAllUsers();
      
      // Build comprehensive events data with organizer and stats
      const eventsWithData = await Promise.all(allEvents.map(async event => {
        // Find organization for this event
        const organization = allOrganizations.find(org => 
          (org._id as any).toString() === (event.organizationId as any).toString()
        );
        
        // Find creator user
        const creator = allUsers.find(user => 
          (user._id as any).toString() === (event.createdBy as any).toString()
        );
        
        // Get registration statistics
        let registrationCount = 0;
        let attendanceCount = 0;
        
        try {
          // Get registrations for this event
          const registrations = await mongoStorage.getEventRegistrations((event._id as any).toString());
          registrationCount = registrations.length;
          attendanceCount = registrations.filter(reg => reg.status === 'attended').length;
          
          // For ticket-based events, also count tickets
          if (event.eventType === 'ticket') {
            const tickets = await mongoStorage.getTickets({ eventId: (event._id as any).toString() });
            const paidTickets = tickets.filter(ticket => ticket.paymentStatus === 'paid');
            registrationCount += paidTickets.length;
            // Assume paid tickets are attended for now (could be enhanced with actual attendance tracking)
            attendanceCount += paidTickets.length;
          }
        } catch (error) {
          console.error(`Error getting registrations for event ${event.name}:`, error);
        }
        
        // Calculate dynamic status based on current date
        const now = new Date();
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);
        let dynamicStatus = 'upcoming';
        
        if (now > endDate) {
          dynamicStatus = 'completed';
        } else if (now >= startDate && now <= endDate) {
          dynamicStatus = 'active';
        } else if (event.status === 'cancelled') {
          dynamicStatus = 'cancelled';
        }

        return {
          id: (event._id as any).toString(),
          name: event.name,
          description: event.description,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
          status: dynamicStatus,
          organizationId: event.organizationId.toString(),
          organizationName: organization?.name || 'Unknown Organization',
          createdBy: event.createdBy.toString(),
          creatorName: creator ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || creator.username : 'Unknown User',
          maxAttendees: event.maxAttendees,
          registrationCount,
          attendanceCount,
          isTicketBased: event.eventType === 'ticket',
          eligibleAuxiliaryBodies: event.eligibleAuxiliaryBodies,
          allowGuests: event.allowGuests,
          allowInvitees: event.allowInvitees,
          createdAt: event.createdAt
        };
      }));

      // Simple pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedEvents = eventsWithData.slice(startIndex, endIndex);

      res.json({
        events: paginatedEvents,
        pagination: {
          page,
          limit,
          total: eventsWithData.length,
          totalPages: Math.ceil(eventsWithData.length / limit)
        }
      });
    } catch (error) {
      console.error("Error getting events with oversight data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Approve organization
  app.post("/api/super-admin/organizations/:id/approve", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.params.id;
      
      console.log(`Approving organization: ${organizationId} by ${req.user?.username}`);
      
      // Update organization status
      const updatedOrg = await mongoStorage.updateOrganization(organizationId, {
        status: 'approved'
      });

      if (!updatedOrg) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Also update all users belonging to this organization to have 'active' status
      const allUsers = await mongoStorage.getAllUsers();
      const orgUsers = allUsers.filter(user => {
        const userOrgId = user.organizationId ? (user.organizationId as any).toString() : null;
        return userOrgId === organizationId;
      });
      const updatedUsers = [];
      
      for (const user of orgUsers) {
        console.log(`Updating user ${user.username} status from ${user.status} to active`);
        const updatedUser = await mongoStorage.updateUser((user._id as any).toString(), { status: 'active' });
        if (updatedUser) {
          updatedUsers.push(updatedUser);
        }
      }

      console.log(`Organization ${updatedOrg.name} approved. Updated ${updatedUsers.length} user(s) to active status.`);

      res.json({ 
        message: "Organization approved successfully",
        organization: {
          id: (updatedOrg._id as any).toString(),
          name: updatedOrg.name,
          status: updatedOrg.status
        },
        usersUpdated: updatedUsers.length
      });
    } catch (error) {
      console.error("Error approving organization:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reject organization
  app.post("/api/super-admin/organizations/:id/reject", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.params.id;
      const { reason } = req.body;
      
      // Update organization status
      const updatedOrg = await mongoStorage.updateOrganization(organizationId, {
        status: 'rejected'
      });

      if (!updatedOrg) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Also update all users belonging to this organization to have 'suspended' status
      const allUsers = await mongoStorage.getAllUsers();
      const orgUsers = allUsers.filter(user => {
        const userOrgId = user.organizationId ? (user.organizationId as any).toString() : null;
        return userOrgId === organizationId;
      });
      const updatedUsers = [];
      
      for (const user of orgUsers) {
        const updatedUser = await mongoStorage.updateUser((user._id as any).toString(), { status: 'suspended' });
        if (updatedUser) {
          updatedUsers.push(updatedUser);
        }
      }

      console.log(`Organization ${updatedOrg.name} rejected. Updated ${updatedUsers.length} user(s) to suspended status.`);

      res.json({ 
        message: "Organization rejected successfully",
        organization: {
          id: (updatedOrg._id as any).toString(),
          name: updatedOrg.name,
          status: updatedOrg.status,
          rejectionReason: updatedOrg.rejectionReason
        },
        usersUpdated: updatedUsers.length
      });
    } catch (error) {
      console.error("Error rejecting organization:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user status
  app.patch("/api/super-admin/users/:id/status", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.id;
      const { status } = req.body;
      
      console.log(`User status update request - UserID: ${userId}, New Status: ${status}, Requester: ${req.user?.username}`);
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      // Validate that status is one of the allowed values
      const allowedStatuses = ['active', 'suspended', 'pending_approval'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      const updatedUser = await mongoStorage.updateUser(userId, { status });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`User status updated successfully - User: ${updatedUser.username}, New Status: ${updatedUser.status}`);
      
      res.json({ 
        message: "User status updated successfully",
        user: {
          id: (updatedUser._id as any).toString(),
          username: updatedUser.username,
          status: updatedUser.status
        }
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Sync user statuses with organization statuses
  app.post("/api/super-admin/sync-user-statuses", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const allUsers = await mongoStorage.getAllUsers();
      const allOrganizations = await mongoStorage.getOrganizations();
      
      let updatedCount = 0;
      const updateResults = [];
      
      for (const user of allUsers) {
        if (user.organizationId && user.status === 'pending_approval') {
          const orgId = (user.organizationId as any).toString();
          const organization = allOrganizations.find(org => (org._id as any).toString() === orgId);
          
          if (organization) {
            let newStatus = user.status;
            
            if (organization.status === 'approved') {
              newStatus = 'active';
            } else if (organization.status === 'rejected') {
              newStatus = 'suspended';
            }
            
            if (newStatus !== user.status) {
              const updatedUser = await mongoStorage.updateUser((user._id as any).toString(), { status: newStatus });
              if (updatedUser) {
                updatedCount++;
                updateResults.push({
                  username: user.username,
                  oldStatus: user.status,
                  newStatus: newStatus,
                  organizationName: organization.name,
                  organizationStatus: organization.status
                });
                console.log(`Synced user ${user.username} from ${user.status} to ${newStatus} based on org ${organization.name} status: ${organization.status}`);
              }
            }
          }
        }
      }
      
      res.json({ 
        message: `Successfully synchronized ${updatedCount} user statuses`,
        updatedCount,
        updates: updateResults
      });
    } catch (error) {
      console.error("Error syncing user statuses:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Organization status update (suspend/activate)
  app.patch("/api/super-admin/organizations/:id/status", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.params.id;
      const { status } = req.body;
      
      console.log(`Organization status update request - OrgID: ${organizationId}, New Status: ${status}, Requester: ${req.user?.username}`);
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      // Validate that status is one of the allowed values
      const allowedStatuses = ['active', 'suspended', 'approved', 'rejected', 'pending_approval'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      const updatedOrg = await mongoStorage.updateOrganization(organizationId, { status });
      
      if (!updatedOrg) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Update all users belonging to this organization based on new status
      const allUsers = await mongoStorage.getAllUsers();
      console.log(`All users in system:`, allUsers.map(u => ({ email: u.email, orgId: u.organizationId })));
      console.log(`Found ${allUsers.length} total users to check for organization ${organizationId}`);
      
      const orgUsers = allUsers.filter(user => {
        if (!user.organizationId) {
          console.log(`User ${user.email} has no organizationId`);
          return false;
        }
        
        // Handle MongoDB populated/unpopulated organizationId field
        let userOrgId;
        if (typeof user.organizationId === 'object') {
          // If populated, get the _id field
          if (user.organizationId._id) {
            userOrgId = user.organizationId._id.toString();
          } else {
            // If it's an ObjectId directly
            userOrgId = user.organizationId.toString();
          }
        } else {
          // If it's already a string
          userOrgId = user.organizationId.toString();
        }
        
        console.log(`Checking user ${user.email}: userOrgId=${userOrgId}, targetOrgId=${organizationId}, match=${userOrgId === organizationId}`);
        return userOrgId === organizationId;
      });
      const updatedUsers = [];
      
      let userStatus = 'active';
      if (status === 'suspended' || status === 'rejected') {
        userStatus = 'suspended';
      } else if (status === 'pending_approval') {
        userStatus = 'pending_approval';
      }
      
      for (const user of orgUsers) {
        const updatedUser = await mongoStorage.updateUser((user._id as any).toString(), { status: userStatus });
        if (updatedUser) {
          updatedUsers.push(updatedUser);
        }
      }
      
      console.log(`Organization ${updatedOrg.name} status updated to ${status}. Updated ${updatedUsers.length} user(s) to ${userStatus} status.`);
      
      // Send email notification for status changes that affect users
      if (['approved', 'suspended', 'rejected'].includes(status)) {
        try {
          console.log(`🔍 Looking for admin user among ${orgUsers.length} users:`, orgUsers.map(u => ({ email: u.email, role: u.role })));
          
          // Get the admin user for this organization to send email
          const adminUser = orgUsers.find(user => user.role === 'admin');
          if (adminUser) {
            console.log(`👤 Found admin user: ${adminUser.email}, sending ${status} email...`);
            const { emailService } = await import('./services/email-service.js');
            await emailService.sendOrganizationApprovalEmail(adminUser.email, {
              organizationName: updatedOrg.name,
              contactPerson: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || adminUser.username,
              status: status as 'approved' | 'rejected' | 'suspended',
              reason: status === 'rejected' ? 'Your organization application has been reviewed.' : 
                     status === 'suspended' ? 'Your organization account has been suspended due to policy violations or administrative reasons.' : undefined,
              loginUrl: status === 'approved' ? `${process.env.APP_DOMAIN || 'http://localhost:5000'}/login` : undefined,
              adminEmail: 'admin@eventifyai.com'
            });
            console.log(`📧 ${status} email sent to:`, adminUser.email);
          } else {
            console.warn('⚠️ No admin user found for organization, skipping email notification');
            console.warn('Available user roles:', orgUsers.map(u => ({ email: u.email, role: u.role })));
          }
        } catch (emailError) {
          console.error(`❌ Failed to send ${status} email:`, emailError);
          // Don't fail the approval process if email fails
        }
      }
      
      res.json({ 
        message: "Organization status updated successfully",
        organization: {
          id: (updatedOrg._id as any).toString(),
          name: updatedOrg.name,
          status: updatedOrg.status
        },
        usersUpdated: updatedUsers.length
      });
    } catch (error) {
      console.error("Error updating organization status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Send approval emails to recently approved organizations (emergency endpoint)
  app.post("/api/super-admin/send-approval-emails", async (req: Request, res: Response) => {
    try {
      const { organizationIds } = req.body;
      
      console.log('🚨 Emergency approval email endpoint called');
      
      // Emergency endpoint - send emails to specific organizations
      const emergencyOrgIds = organizationIds || ["68beee402f37190d09fceccd", "68bef1cc8b7f3259cae88cdd"];
      
      console.log('📧 Sending approval emails to:', emergencyOrgIds);
      
      const results = [];
      
      for (const orgId of emergencyOrgIds) {
        try {
          console.log(`\n📧 Processing organization: ${orgId}`);
          
          // Get organization details
          const organization = await mongoStorage.getOrganization(orgId);
          if (!organization) {
            results.push({ orgId, status: 'error', message: 'Organization not found' });
            continue;
          }
          
          console.log(`Found organization: ${organization.name} (status: ${organization.status})`);
          
          if (organization.status !== 'approved') {
            results.push({ orgId, status: 'skipped', message: `Not approved (status: ${organization.status})` });
            continue;
          }
          
          // Find admin user for this organization
          const allUsers = await mongoStorage.getAllUsers();
          const orgUsers = allUsers.filter(user => {
            if (!user.organizationId) return false;
            
            let userOrgId;
            if (typeof user.organizationId === 'object') {
              userOrgId = user.organizationId._id ? user.organizationId._id.toString() : user.organizationId.toString();
            } else {
              userOrgId = user.organizationId.toString();
            }
            
            return userOrgId === orgId;
          });
          
          console.log(`Found ${orgUsers.length} users for organization:`, orgUsers.map(u => ({ email: u.email, role: u.role })));
          
          const adminUser = orgUsers.find(user => user.role === 'admin');
          if (!adminUser) {
            results.push({ orgId, status: 'error', message: 'No admin user found' });
            continue;
          }
          
          console.log(`👤 Found admin user: ${adminUser.email}`);
          
          // Send approval email
          const { emailService } = await import('./services/email-service');
          await emailService.sendOrganizationApprovalEmail(adminUser.email, {
            organizationName: organization.name,
            contactPerson: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || adminUser.username,
            status: 'approved',
            loginUrl: `${process.env.APP_DOMAIN || 'http://localhost:5000'}/login`,
            adminEmail: 'admin@eventifyai.com'
          });
          
          console.log(`✅ Approval email sent to ${adminUser.email} for ${organization.name}`);
          results.push({ 
            orgId, 
            status: 'success', 
            message: `Email sent to ${adminUser.email}`,
            organizationName: organization.name,
            adminEmail: adminUser.email
          });
          
        } catch (orgError) {
          console.error(`❌ Error processing organization ${orgId}:`, orgError);
          results.push({ orgId, status: 'error', message: orgError.message });
        }
      }
      
      res.json({ 
        message: "Approval emails processing completed",
        results 
      });
      
    } catch (error) {
      console.error("Error sending approval emails:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Handle chatbot message forwarding
  app.post("/api/super-admin/chatbot-message", async (req: Request, res: Response) => {
    try {
      const { message, type, metadata } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get all super admin users to send the notification
      const superAdmins = await mongoStorage.getUsersByRole('super_admin');
      
      if (superAdmins.length === 0) {
        return res.status(404).json({ message: "No super admin users found" });
      }

      // Create notification for each super admin
      const notifications = [];
      for (const admin of superAdmins) {
        const notification = await mongoStorage.createNotification({
          recipientId: (admin._id as any).toString(),
          title: "Chatbot Inquiry",
          message: message,
          type: type || 'chatbot_inquiry',
          priority: 'medium',
          metadata: metadata || {}
        });
        notifications.push(notification);
      }

      console.log(`Chatbot message forwarded to ${superAdmins.length} super admin(s)`);

      res.json({ 
        message: "Message forwarded to super admin successfully",
        notificationsSent: notifications.length
      });
    } catch (error) {
      console.error("Error forwarding chatbot message:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Organization-specific analytics endpoint that frontend expects
  app.get("/api/super-admin/organization-analytics", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orgId } = req.query;
      
      if (!orgId) {
        return res.status(400).json({ 
          success: false, 
          message: "Organization ID is required" 
        });
      }

      // Get organization data
      const organizations = await mongoStorage.getOrganizations({ _id: orgId });
      if (!organizations || organizations.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Organization not found" 
        });
      }

      const organization = organizations[0];
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

      // Get users for this organization
      const orgUsers = await mongoStorage.getAllUsers({ organizationId: orgId });
      
      // Get events for this organization  
      const orgEvents = await mongoStorage.getEvents({ organizationId: orgId });
      
      // Calculate organization-specific metrics
      let totalRevenue = 0;
      let totalTransactions = 0;
      let totalRegistrations = 0;
      let paidRegistrations = 0;
      let validatedRegistrations = 0;
      let ticketsSold = 0;
      let totalTicketRevenue = 0;
      
      for (const event of orgEvents) {
        try {
          const eventId = (event._id as any).toString();
          
          // Get registrations for registration-based events
          const registrations = await mongoStorage.getEventRegistrations(eventId);
          totalRegistrations += registrations.length;
          
          // Count paid and validated registrations
          const eventPaidRegs = registrations.filter(r => r.paymentStatus === 'paid').length;
          const eventValidatedRegs = registrations.filter(r => r.isValidated === true).length;
          paidRegistrations += eventPaidRegs;
          validatedRegistrations += eventValidatedRegs;
          
          // Get tickets for ticket-based events
          if (event.eventType === 'ticket') {
            const tickets = await mongoStorage.getTickets({ eventId });
            ticketsSold += tickets.filter(t => t.paymentStatus === 'paid').length;
            
            // Calculate ticket revenue
            const ticketRevenue = tickets
              .filter(t => t.paymentStatus === 'paid')
              .reduce((sum, ticket) => sum + (ticket.price || 0), 0);
            totalTicketRevenue += ticketRevenue;
          }
          
          // Get payment history
          const payments = await mongoStorage.getPaymentHistory([eventId]);
          const eventRevenue = payments
            .filter(p => p.status === 'success')
            .reduce((sum, payment) => sum + (payment.amount || 0), 0);
          
          totalRevenue += eventRevenue;
          totalTransactions += payments.filter(p => p.status === 'success').length;
        } catch (error) {
          console.error(`Error calculating org stats for event ${event.name}:`, error);
        }
      }

      // Time-based statistics
      const newUsersLast7Days = orgUsers.filter(u => u.createdAt >= sevenDaysAgo).length;
      const newUsersLast30Days = orgUsers.filter(u => u.createdAt >= thirtyDaysAgo).length;
      const newEventsLast7Days = orgEvents.filter(e => e.createdAt >= sevenDaysAgo).length;
      const newEventsLast30Days = orgEvents.filter(e => e.createdAt >= thirtyDaysAgo).length;

      // Event status analysis
      const upcomingEvents = orgEvents.filter(e => {
        const eventDate = new Date(e.startDate);
        return eventDate > now && e.status !== 'cancelled';
      }).length;
      
      const pastEvents = orgEvents.filter(e => {
        const eventDate = new Date(e.startDate);
        return eventDate <= now;
      }).length;
      
      const cancelledEvents = orgEvents.filter(e => e.status === 'cancelled').length;

      // User engagement metrics
      const activeUsers = orgUsers.filter(u => u.status === 'active').length;
      const pendingUsers = orgUsers.filter(u => u.status === 'pending').length;
      const suspendedUsers = orgUsers.filter(u => u.status === 'suspended').length;

      const orgAnalytics = {
        organization: {
          id: (organization._id as any).toString(),
          name: organization.name,
          status: organization.status,
          createdAt: organization.createdAt
        },
        overview: {
          totalUsers: orgUsers.length,
          totalEvents: orgEvents.length,
          totalRegistrations: totalRegistrations,
          activeUsers,
          upcomingEvents
        },
        financial: {
          totalRevenue: Math.round((totalRevenue + totalTicketRevenue) / 100), // Convert from kobo to naira
          totalTransactions,
          ticketsSold,
          totalTicketRevenue: Math.round(totalTicketRevenue / 100),
          paidRegistrations,
          averageEventRevenue: orgEvents.length > 0 ? Math.round(((totalRevenue + totalTicketRevenue) / orgEvents.length) / 100) : 0,
          averageTransactionValue: totalTransactions > 0 ? Math.round(((totalRevenue + totalTicketRevenue) / totalTransactions) / 100) : 0
        },
        growth: {
          newUsersLast7Days,
          newUsersLast30Days,
          newEventsLast7Days,
          newEventsLast30Days
        },
        events: {
          upcoming: upcomingEvents,
          past: pastEvents,
          cancelled: cancelledEvents,
          total: orgEvents.length,
          registrationBased: orgEvents.filter(e => e.eventType === 'registration').length,
          ticketBased: orgEvents.filter(e => e.eventType === 'ticket').length
        },
        users: {
          active: activeUsers,
          pending: pendingUsers,
          suspended: suspendedUsers,
          admins: orgUsers.filter(u => u.role === 'admin').length,
          members: orgUsers.filter(u => u.role === 'member').length
        },
        registrations: {
          total: totalRegistrations,
          paid: paidRegistrations,
          validated: validatedRegistrations,
          free: totalRegistrations - paidRegistrations
        },
        engagement: {
          totalRegistrations,
          paidRegistrations,
          freeRegistrations: totalRegistrations - paidRegistrations,
          conversionRate: totalRegistrations > 0 ? Math.round((paidRegistrations / totalRegistrations) * 100) : 0,
          validationRate: totalRegistrations > 0 ? Math.round((validatedRegistrations / totalRegistrations) * 100) : 0,
          averageRegistrationsPerEvent: orgEvents.length > 0 ? Math.round(totalRegistrations / orgEvents.length) : 0
        }
      };

      res.json(orgAnalytics);
    } catch (error: any) {
      console.error("Get organization analytics error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch organization analytics" 
      });
    }
  });

  // Organization status management
  app.patch("/api/super-admin/organizations/:orgId/status", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orgId } = req.params;
      const { status } = req.body;

      if (!['approved', 'suspended', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be one of: approved, suspended, rejected, pending"
        });
      }

      const result = await mongoStorage.updateOrganizationStatus(orgId, status);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Organization not found"
        });
      }

      // Update users associated with this organization
      const allUsers = await mongoStorage.getAllUsers();
      const orgUsers = allUsers.filter(user => {
        const userOrgId = user.organizationId ? (user.organizationId as any).toString() : null;
        return userOrgId === orgId;
      });
      const updatedUsers = [];
      
      for (const user of orgUsers) {
        console.log(`Updating user ${user.username} status from ${user.status} to ${status === 'approved' ? 'active' : status === 'suspended' ? 'suspended' : user.status}`);
        const newUserStatus = status === 'approved' ? 'active' : status === 'suspended' ? 'suspended' : user.status;
        const updatedUser = await mongoStorage.updateUser((user._id as any).toString(), { status: newUserStatus });
        if (updatedUser) {
          updatedUsers.push(updatedUser);
        }
      }

      console.log(`Organization ${result.name} status updated to ${status}. Updated ${updatedUsers.length} user(s).`);

      // Send email notification for status changes that affect users
      if (['approved', 'suspended', 'rejected'].includes(status)) {
        try {
          console.log(`🔍 Looking for admin user among ${orgUsers.length} users:`, orgUsers.map(u => ({ email: u.email, role: u.role })));
          
          // Get the admin user for this organization to send email
          const adminUser = orgUsers.find(user => user.role === 'admin');
          if (adminUser) {
            console.log(`👤 Found admin user: ${adminUser.email}, sending ${status} email...`);
            const { emailService } = await import('./services/email-service.js');
            await emailService.sendOrganizationApprovalEmail(adminUser.email, {
              organizationName: result.name,
              contactPerson: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || adminUser.username,
              status: status as 'approved' | 'rejected' | 'suspended',
              reason: status === 'rejected' ? 'Your organization application has been reviewed.' : 
                     status === 'suspended' ? 'Your organization account has been suspended due to policy violations or administrative reasons.' : undefined,
              loginUrl: status === 'approved' ? `${process.env.APP_DOMAIN || 'http://localhost:5000'}/login` : undefined,
              adminEmail: 'admin@eventifyai.com'
            });
            console.log(`📧 ${status} email sent to:`, adminUser.email);
          } else {
            console.warn('⚠️ No admin user found for organization, skipping email notification');
            console.warn('Available user roles:', orgUsers.map(u => ({ email: u.email, role: u.role })));
          }
        } catch (emailError) {
          console.error(`❌ Failed to send ${status} email:`, emailError);
          // Don't fail the status update if email fails
        }
      }

      res.json({
        success: true,
        message: `Organization status updated to ${status}`,
        organizationId: orgId,
        newStatus: status,
        usersUpdated: updatedUsers.length
      });
    } catch (error: any) {
      console.error("Update organization status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update organization status"
      });
    }
  });

  // Platform settings management
  app.patch("/api/super-admin/platform-settings", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { platformFeeRate } = req.body;

      if (typeof platformFeeRate !== 'number' || platformFeeRate < 0 || platformFeeRate > 20) {
        return res.status(400).json({
          success: false,
          message: "Platform fee rate must be a number between 0 and 20"
        });
      }

      await mongoStorage.updatePlatformSettings({ platformFeeRate });

      res.json({
        success: true,
        message: "Platform settings updated successfully",
        platformFeeRate
      });
    } catch (error: any) {
      console.error("Update platform settings error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update platform settings"
      });
    }
  });

  // Notification broadcast
  app.post("/api/super-admin/notifications/broadcast", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Message is required and must be a non-empty string"
        });
      }

      // Get all users for broadcasting
      const users = await User.find({ role: { $in: ['admin', 'user'] }, status: 'active' });
      console.log(`Broadcasting notification to ${users.length} users: ${message}`);
      
      const notifications = [];
      for (const user of users) {
        const notification = new Notification({
          organizationId: user.organizationId,
          recipientId: user._id,
          type: 'broadcast',
          title: 'Platform Announcement',
          message: message.trim(),
          category: 'system',
          isRead: false
        });
        
        await notification.save();
        notifications.push(notification);
      }

      res.json({
        success: true,
        message: "Notification broadcasted successfully",
        sentCount: notifications.length,
        broadcastMessage: message.trim()
      });
    } catch (error: any) {
      console.error("Broadcast notification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to broadcast notification"
      });
    }
  });

  // Selective notification to specific organizations
  app.post("/api/super-admin/notifications/selective", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { message, organizationIds } = req.body;
      
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Message is required and must be a non-empty string" 
        });
      }
      
      if (!organizationIds || !Array.isArray(organizationIds) || organizationIds.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "At least one organization must be selected" 
        });
      }

      console.log(`Sending selective notification to ${organizationIds.length} organizations: ${message}`);

      // Get users from selected organizations
      const users = await User.find({ 
        organizationId: { $in: organizationIds.map(id => new mongoose.Types.ObjectId(id)) },
        role: { $in: ['admin', 'user'] }
      });

      console.log(`Found ${users.length} users in selected organizations`);

      const notifications = [];
      for (const user of users) {
        const notification = new Notification({
          organizationId: user.organizationId,
          recipientId: user._id,
          type: 'selective',
          title: 'Organization Notification',
          message: message.trim(),
          category: 'system',
          isRead: false
        });
        
        await notification.save();
        notifications.push(notification);
      }

      res.json({ 
        success: true, 
        message: 'Notification sent to selected organizations successfully',
        sentCount: notifications.length,
        organizationCount: organizationIds.length
      });
    } catch (error: any) {
      console.error('Error sending selective notification:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to send notification' 
      });
    }
  });

  // Get notification history
  app.get("/api/super-admin/notifications/history", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Get notifications created by super admin actions (broadcast and selective)
      const notifications = await Notification.find({ 
        type: { $in: ['broadcast', 'selective'] }
      })
        .populate('organizationId', 'name status')
        .sort({ createdAt: -1 })
        .limit(limit);

      // Group notifications by message and type to show history properly
      const groupedNotifications = new Map();
      
      for (const notification of notifications) {
        const key = `${notification.message}_${notification.type}_${notification.createdAt.toISOString().split('T')[0]}`;
        
        if (!groupedNotifications.has(key)) {
          groupedNotifications.set(key, {
            _id: notification._id,
            message: notification.message,
            type: notification.type,
            title: notification.title,
            createdAt: notification.createdAt,
            delivered: true,
            targetOrganizations: [],
            recipientCount: 0
          });
        }
        
        const entry = groupedNotifications.get(key);
        entry.recipientCount++;
        
        if (notification.type === 'selective' && notification.organizationId) {
          const orgExists = entry.targetOrganizations.find((org: any) => org._id?.toString() === notification.organizationId._id?.toString());
          if (!orgExists) {
            entry.targetOrganizations.push({
              _id: notification.organizationId._id,
              name: notification.organizationId.name || 'Unknown Organization'
            });
          }
        }
      }

      const history = Array.from(groupedNotifications.values());

      res.json({
        success: true,
        notifications: history
      });
    } catch (error: any) {
      console.error('Error getting notification history:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get notification history' 
      });
    }
  });

  // Upgrade organization to Pro subscription
  app.post("/api/super-admin/organizations/:id/upgrade-to-pro", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.params.id;
      
      // Get organization details
      const organization = await mongoStorage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Update organization to Pro plan
      const updatedOrg = await mongoStorage.updateOrganization(organizationId, {
        subscriptionPlan: 'pro',
        maxEvents: 100,
        maxMembers: -1, // Unlimited members for pro plan
      });

      if (!updatedOrg) {
        return res.status(404).json({ message: "Failed to update organization" });
      }

      // Send email notification to organization admin
      try {
        const { EmailService } = await import('../services/email-service.js');
        const emailService = new EmailService();
        
        await emailService.sendEmail({
          to: organization.contactEmail,
          subject: "🎉 Your Organization has been Upgraded to Pro Plan!",
          html: `
            <h2>Congratulations!</h2>
            <p>Dear ${organization.name} team,</p>
            <p>Great news! Your organization has been successfully upgraded to the <strong>Pro Plan</strong>.</p>
            
            <h3>Your New Pro Plan Benefits:</h3>
            <ul>
              <li>✅ Up to 100 events</li>
              <li>✅ Unlimited members/registrations</li>
              <li>✅ Priority support</li>
              <li>✅ Advanced analytics</li>
            </ul>
            
            <p>You can now create more events and support unlimited registrations for your organization.</p>
            <p>Login to your dashboard to explore all the new features: <a href="${process.env.APP_DOMAIN}/login">Dashboard</a></p>
            
            <p>Best regards,<br>
            Eventify AI Team</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send upgrade email:', emailError);
      }

      // Send in-app notification
      try {
        await mongoStorage.createNotification({
          organizationId: new (await import('mongoose')).Types.ObjectId(organizationId),
          recipientId: new (await import('mongoose')).Types.ObjectId(organizationId), // Will be handled by admin
          senderId: req.user?._id,
          type: 'subscription_upgrade',
          title: 'Upgraded to Pro Plan!',
          message: 'Your organization has been upgraded to Pro Plan with 100 events and unlimited members.',
          data: {
            subscriptionPlan: 'pro',
            maxEvents: 100,
            maxMembers: 'unlimited'
          },
          priority: 'high',
          category: 'system',
          isRead: false
        });
      } catch (notificationError) {
        console.error('Failed to create upgrade notification:', notificationError);
      }

      res.json({ 
        message: "Organization upgraded to Pro plan successfully",
        organization: {
          id: (updatedOrg._id as any).toString(),
          name: updatedOrg.name,
          subscriptionPlan: updatedOrg.subscriptionPlan,
          maxEvents: updatedOrg.maxEvents,
          maxMembers: updatedOrg.maxMembers
        }
      });
    } catch (error) {
      console.error("Error upgrading organization:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Downgrade organization to Basic subscription
  app.post("/api/super-admin/organizations/:id/downgrade-to-basic", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.params.id;
      
      // Get organization details
      const organization = await mongoStorage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Update organization to Basic plan
      const updatedOrg = await mongoStorage.updateOrganization(organizationId, {
        subscriptionPlan: 'basic',
        maxEvents: 10,
        maxMembers: 5000,
      });

      if (!updatedOrg) {
        return res.status(404).json({ message: "Failed to update organization" });
      }

      // Send email notification to organization admin
      try {
        const { EmailService } = await import('../services/email-service.js');
        const emailService = new EmailService();
        
        await emailService.sendEmail({
          to: organization.contactEmail,
          subject: "Organization Plan Changed to Basic",
          html: `
            <h2>Plan Change Notification</h2>
            <p>Dear ${organization.name} team,</p>
            <p>Your organization subscription has been changed to the <strong>Basic Plan</strong>.</p>
            
            <h3>Your Basic Plan Limits:</h3>
            <ul>
              <li>📅 Up to 10 events</li>
              <li>👥 Up to 5,000 members/registrations</li>
              <li>📧 Email support</li>
            </ul>
            
            <p>If you need more capacity, please contact us to upgrade to Pro Plan.</p>
            <p>Login to your dashboard: <a href="${process.env.APP_DOMAIN}/login">Dashboard</a></p>
            
            <p>Best regards,<br>
            Eventify AI Team</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send downgrade email:', emailError);
      }

      // Send in-app notification
      try {
        await mongoStorage.createNotification({
          organizationId: new (await import('mongoose')).Types.ObjectId(organizationId),
          recipientId: new (await import('mongoose')).Types.ObjectId(organizationId), // Will be handled by admin
          senderId: req.user?._id,
          type: 'subscription_downgrade',
          title: 'Plan Changed to Basic',
          message: 'Your organization plan has been changed to Basic Plan with 10 events and 5,000 members limit.',
          data: {
            subscriptionPlan: 'basic',
            maxEvents: 10,
            maxMembers: 5000
          },
          priority: 'medium',
          category: 'system',
          isRead: false
        });
      } catch (notificationError) {
        console.error('Failed to create downgrade notification:', notificationError);
      }

      res.json({ 
        message: "Organization downgraded to Basic plan successfully",
        organization: {
          id: (updatedOrg._id as any).toString(),
          name: updatedOrg.name,
          subscriptionPlan: updatedOrg.subscriptionPlan,
          maxEvents: updatedOrg.maxEvents,
          maxMembers: updatedOrg.maxMembers
        }
      });
    } catch (error) {
      console.error("Error downgrading organization:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}