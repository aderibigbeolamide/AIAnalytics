import { Router } from "express";
import { authenticateToken, isSuperAdmin, AuthenticatedRequest } from "./auth";
import { storage } from "./storage";

const router = Router();

// All routes require super admin authentication
router.use(authenticateToken, isSuperAdmin);

// Get platform statistics
router.get("/statistics", async (req, res) => {
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
});

// Get all users with details
router.get("/users", async (req, res) => {
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
});

// Get user details by ID
router.get("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user's events and registrations
    const [userEvents, userRegistrations, userMember] = await Promise.all([
      storage.getEvents({ createdBy: userId }),
      storage.getEventRegistrations(undefined, {}),
      storage.getMemberByUserId(userId),
    ]);

    const userRegistrationsFiltered = userRegistrations.filter(reg => reg.userId === userId);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
      statistics: {
        eventsCreated: userEvents.length,
        registrations: userRegistrationsFiltered.length,
        memberProfile: userMember ? true : false,
      },
      recentActivity: {
        events: userEvents.slice(0, 5),
        registrations: userRegistrationsFiltered.slice(0, 5),
      }
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update user status (suspend/activate)
router.put("/users/:id/status", async (req: AuthenticatedRequest, res) => {
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
});

// Get all events with admin details
router.get("/events", async (req, res) => {
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
});

// Get event analytics
router.get("/events/:id/analytics", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const event = await storage.getEvent(eventId);
    
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const [registrations, attendance] = await Promise.all([
      storage.getEventRegistrations(eventId),
      storage.getAttendance(eventId),
    ]);

    // Registration analytics
    const registrationsByType = registrations.reduce((acc, reg) => {
      acc[reg.registrationType] = (acc[reg.registrationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const registrationsByStatus = registrations.reduce((acc, reg) => {
      acc[reg.status] = (acc[reg.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Attendance analytics
    const attendanceByValidation = attendance.reduce((acc, att) => {
      acc[att.validationStatus] = (acc[att.validationStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      event: {
        id: event.id,
        name: event.name,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate,
      },
      registrations: {
        total: registrations.length,
        byType: registrationsByType,
        byStatus: registrationsByStatus,
      },
      attendance: {
        total: attendance.length,
        byValidation: attendanceByValidation,
        rate: registrations.length > 0 ? 
          Math.round((attendance.length / registrations.length) * 100) : 0,
      }
    });
  } catch (error) {
    console.error("Error fetching event analytics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get system activity log
router.get("/activity", async (req, res) => {
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
});

export default router;