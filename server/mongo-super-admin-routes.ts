import type { Express, Request, Response } from "express";
import { mongoStorage } from "./mongodb-storage";
import { authenticateToken, type AuthenticatedRequest } from "./mongo-auth-routes";

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
  // Get super admin statistics
  app.get("/api/super-admin/statistics", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get basic counts from MongoDB
      const allUsers = await mongoStorage.getAllUsers();
      const allOrganizations = await mongoStorage.getOrganizations();
      const allEvents = await mongoStorage.getEvents();
      const allMembers = await mongoStorage.getMembers();

      // Calculate recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentUsers = allUsers.filter(u => u.createdAt >= thirtyDaysAgo).length;
      const recentOrganizations = allOrganizations.filter(o => o.createdAt >= thirtyDaysAgo).length;
      const recentEvents = allEvents.filter(e => e.createdAt >= thirtyDaysAgo).length;
      const recentMembers = allMembers.filter(m => m.createdAt >= thirtyDaysAgo).length;

      const statistics = {
        overview: {
          totalUsers: allUsers.length,
          totalOrganizations: allOrganizations.length,
          totalEvents: allEvents.length,
          totalMembers: allMembers.length,
          totalAdmins: allUsers.filter(u => u.role === 'admin').length,
          totalRegistrations: 0, // No registrations in current schema
          activeUsers: allUsers.filter(u => u.status === 'active').length,
          approvedOrganizations: allOrganizations.filter(o => o.status === 'approved').length,
          upcomingEvents: allEvents.filter(e => e.status === 'upcoming').length,
          activeMembers: allMembers.filter(m => m.status === 'active').length
        },
        recent: {
          newUsers: recentUsers,
          newOrganizations: recentOrganizations,
          newEvents: recentEvents,
          newMembers: recentMembers
        },
        events: {
          active: allEvents.filter(e => e.status === 'active').length,
          upcoming: allEvents.filter(e => e.status === 'upcoming').length,
          completed: allEvents.filter(e => e.status === 'completed').length,
          cancelled: allEvents.filter(e => e.status === 'cancelled').length,
          draft: allEvents.filter(e => e.status === 'draft').length
        },
        registrations: {
          validationRate: 100 // Default since no registrations yet
        },
        usersByRole: allUsers.reduce((acc: any, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {}),
        organizationsByStatus: allOrganizations.reduce((acc: any, org) => {
          acc[org.status] = (acc[org.status] || 0) + 1;
          return acc;
        }, {}),
        eventsByStatus: allEvents.reduce((acc: any, event) => {
          acc[event.status] = (acc[event.status] || 0) + 1;
          return acc;
        }, {})
      };

      res.json(statistics);
    } catch (error) {
      console.error("Error getting super admin statistics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all users
  app.get("/api/super-admin/users", authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const allUsers = await mongoStorage.getAllUsers();
      
      const users = allUsers.map(user => ({
        id: user._id.toString(),
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
        id: org._id.toString(),
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
        id: org._id.toString(),
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
        
        return {
          id: event._id.toString(),
          name: event.name,
          description: event.description,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
          status: event.status,
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
        const updatedUser = await mongoStorage.updateUser((user._id as any).toString(), { status: 'active' });
        if (updatedUser) {
          updatedUsers.push(updatedUser);
        }
      }

      console.log(`Organization ${updatedOrg.name} approved. Updated ${updatedUsers.length} user(s) to active status.`);

      res.json({ 
        message: "Organization approved successfully",
        organization: {
          id: updatedOrg._id.toString(),
          name: updatedOrg.name,
          status: updatedOrg.status,
          approvedAt: updatedOrg.approvedAt
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
          id: updatedOrg._id.toString(),
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
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const updatedUser = await mongoStorage.updateUser(userId, { status });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
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
}