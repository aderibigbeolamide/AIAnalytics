import type { Express, Request, Response } from "express";
import { mongoStorage } from "./mongodb-storage";
import { authenticateToken, type AuthenticatedRequest } from "./mongo-auth-routes";

export function registerMongoDashboardRoutes(app: Express) {
  // Dashboard statistics
  app.get("/api/dashboard/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      
      // Get all data for the organization
      const events = await mongoStorage.getEvents(organizationId ? { organizationId } : {});
      const members = await mongoStorage.getMembers(organizationId ? { organizationId } : {});
      const registrations = await mongoStorage.getEventRegistrations();
      
      // Calculate statistics
      const totalEvents = events.length;
      const totalMembers = members.length;
      const totalRegistrations = registrations.length;
      const totalScans = registrations.filter(r => r.attendanceStatus === 'attended').length;
      const validationRate = totalRegistrations > 0 ? Math.round((totalScans / totalRegistrations) * 100) : 100;
      
      // Recent activity (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const recentEvents = events.filter(e => e.createdAt >= oneWeekAgo).length;
      const recentRegistrations = registrations.filter(r => r.createdAt >= oneWeekAgo).length;
      
      const stats = {
        totalEvents: totalEvents.toString(),
        totalMembers: totalMembers.toString(),
        totalRegistrations: totalRegistrations.toString(),
        totalScans: totalScans.toString(),
        validationRate,
        recentActivity: {
          newEvents: recentEvents,
          newRegistrations: recentRegistrations
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
    try {
      const organizationId = req.user?.organizationId;
      
      const events = await mongoStorage.getEvents(organizationId ? { organizationId } : {});
      
      const formattedEvents = events.map(event => ({
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
        createdAt: event.createdAt,
        organizationId: event.organizationId?.toString(),
        createdBy: event.createdBy?.toString()
      }));

      res.json(formattedEvents);
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

  // Get auxiliary bodies (public endpoint)
  app.get("/api/auxiliary-bodies", async (req: Request, res: Response) => {
    try {
      // Return default auxiliary bodies for now
      const auxiliaryBodies = [
        "Atfal",
        "Khuddam",
        "Lajna", 
        "Ansarullah",
        "Nasra"
      ];

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
      const preferences = {
        auxiliaryBodies: ["Atfal", "Khuddam", "Lajna", "Ansarullah", "Nasra"],
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
}