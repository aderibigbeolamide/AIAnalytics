import { Express, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from './mongo-auth-routes.js';
import { 
  User, 
  Event, 
  EventRegistration, 
  Ticket, 
  Organization 
} from '../shared/mongoose-schema.js';

export function registerAnalyticsRoutes(app: Express) {
  // Get comprehensive platform analytics with revenue data
  app.get('/api/admin/platform-analytics', authenticateToken, async (req: any, res: Response) => {
    try {
      // Check if user is super admin
      if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'Unauthorized access' });
      }

      const currentDate = new Date();
      const last30Days = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));
      const last7Days = new Date(currentDate.getTime() - (7 * 24 * 60 * 60 * 1000));
      const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastYear = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1);

      // Get all paid registrations
      const paidRegistrations = await EventRegistration.find({
        paymentStatus: 'paid'
      }).populate('event');

      // Get all paid tickets
      const paidTickets = await Ticket.find({
        paymentStatus: 'paid'
      });

      // Calculate revenue
      const registrationRevenue = paidRegistrations.reduce((sum, reg) => {
        return sum + (parseFloat(reg.paymentAmount) || 0);
      }, 0);

      const ticketRevenue = paidTickets.reduce((sum, ticket) => {
        return sum + (parseFloat(ticket.price) || 0);
      }, 0);

      const totalRevenue = registrationRevenue + ticketRevenue;
      const platformFees = totalRevenue * 0.03;

      // Generate monthly data for the last 12 months
      const monthlyData = [];
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);
        
        const monthRegistrations = paidRegistrations.filter(reg => {
          const regDate = new Date(reg.createdAt);
          return regDate >= monthStart && regDate <= monthEnd;
        });

        const monthTickets = paidTickets.filter(ticket => {
          const ticketDate = new Date(ticket.createdAt);
          return ticketDate >= monthStart && ticketDate <= monthEnd;
        });

        const monthRegRevenue = monthRegistrations.reduce((sum, reg) => sum + (parseFloat(reg.paymentAmount) || 0), 0);
        const monthTicketRevenue = monthTickets.reduce((sum, ticket) => sum + (parseFloat(ticket.price) || 0), 0);
        const monthTotal = monthRegRevenue + monthTicketRevenue;

        monthlyData.push({
          month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
          totalRevenue: monthTotal,
          registrationRevenue: monthRegRevenue,
          ticketRevenue: monthTicketRevenue,
          transactions: monthRegistrations.length + monthTickets.length,
          platformFees: monthTotal * 0.03
        });
      }

      // Generate daily data for the last 30 days
      const dailyData = [];
      for (let i = 29; i >= 0; i--) {
        const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - i);
        const dayEnd = new Date(dayStart.getTime() + (24 * 60 * 60 * 1000));
        
        const dayRegistrations = paidRegistrations.filter(reg => {
          const regDate = new Date(reg.createdAt);
          return regDate >= dayStart && regDate < dayEnd;
        });

        const dayTickets = paidTickets.filter(ticket => {
          const ticketDate = new Date(ticket.createdAt);
          return ticketDate >= dayStart && ticketDate < dayEnd;
        });

        const dayRevenue = dayRegistrations.reduce((sum, reg) => sum + (parseFloat(reg.paymentAmount) || 0), 0) +
                          dayTickets.reduce((sum, ticket) => sum + (parseFloat(ticket.price) || 0), 0);

        dailyData.push({
          date: dayStart.toISOString().split('T')[0],
          revenue: dayRevenue,
          transactions: dayRegistrations.length + dayTickets.length
        });
      }

      // Get platform statistics
      const [organizations, users, events] = await Promise.all([
        Organization.countDocuments(),
        User.countDocuments(),
        Event.countDocuments()
      ]);

      const [approvedOrgs, pendingOrgs, suspendedOrgs] = await Promise.all([
        Organization.countDocuments({ status: 'approved' }),
        Organization.countDocuments({ status: 'pending' }),
        Organization.countDocuments({ status: 'suspended' })
      ]);

      const [activeUsers, adminUsers, superAdminUsers] = await Promise.all([
        User.countDocuments({ status: 'active' }),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({ role: 'super_admin' })
      ]);

      const upcomingEvents = await Event.countDocuments({ 
        date: { $gte: new Date() } 
      });

      // Calculate growth rates
      const last30DaysRevenue = dailyData.slice(-30).reduce((sum, day) => sum + day.revenue, 0);
      const previousMonthRevenue = monthlyData[monthlyData.length - 2]?.totalRevenue || 0;
      const currentMonthRevenue = monthlyData[monthlyData.length - 1]?.totalRevenue || 0;
      const revenueGrowthRate = previousMonthRevenue > 0 ? 
        ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;

      const analytics = {
        overview: {
          totalRevenue,
          platformFees,
          totalTransactions: paidRegistrations.length + paidTickets.length,
          totalOrganizations: organizations,
          totalUsers: users,
          totalEvents: events,
          revenueGrowthRate,
          last30DaysRevenue
        },
        
        revenue: {
          total: totalRevenue,
          registrationRevenue,
          ticketRevenue,
          platformFees,
          monthlyData,
          dailyData
        },

        transactions: {
          total: paidRegistrations.length + paidTickets.length,
          registrations: paidRegistrations.length,
          tickets: paidTickets.length,
          averageTransactionValue: (paidRegistrations.length + paidTickets.length) > 0 ? 
            totalRevenue / (paidRegistrations.length + paidTickets.length) : 0
        },

        organizations: {
          total: organizations,
          approved: approvedOrgs,
          pending: pendingOrgs,
          suspended: suspendedOrgs
        },

        users: {
          total: users,
          admins: adminUsers,
          superAdmins: superAdminUsers,
          active: activeUsers
        },

        events: {
          total: events,
          upcoming: upcomingEvents,
          past: events - upcomingEvents
        },

        metadata: {
          lastUpdated: new Date().toISOString(),
          dataRange: {
            from: last30Days.toISOString().split('T')[0],
            to: currentDate.toISOString().split('T')[0]
          },
          currency: 'NGN'
        }
      };

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Platform analytics error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch platform analytics' 
      });
    }
  });

  // Get real-time revenue metrics
  app.get('/api/admin/revenue-metrics', authenticateToken, async (req: any, res: Response) => {
    try {
      if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'Unauthorized access' });
      }

      const currentDate = new Date();
      const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));
      const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      // Get today's revenue
      const todayRegistrations = await EventRegistration.find({
        paymentStatus: 'paid',
        createdAt: { $gte: today }
      });

      const todayTickets = await Ticket.find({
        paymentStatus: 'paid',
        createdAt: { $gte: today }
      });

      // Get yesterday's revenue
      const yesterdayRegistrations = await EventRegistration.find({
        paymentStatus: 'paid',
        createdAt: { 
          $gte: yesterday,
          $lt: today
        }
      });

      const yesterdayTickets = await Ticket.find({
        paymentStatus: 'paid',
        createdAt: { 
          $gte: yesterday,
          $lt: today
        }
      });

      // Get this month's revenue
      const thisMonthRegistrations = await EventRegistration.find({
        paymentStatus: 'paid',
        createdAt: { $gte: thisMonth }
      });

      const thisMonthTickets = await Ticket.find({
        paymentStatus: 'paid',
        createdAt: { $gte: thisMonth }
      });

      // Calculate revenues
      const todayRevenue = todayRegistrations.reduce((sum, reg) => sum + (parseFloat(reg.paymentAmount) || 0), 0) +
                          todayTickets.reduce((sum, ticket) => sum + (parseFloat(ticket.price) || 0), 0);

      const yesterdayRevenue = yesterdayRegistrations.reduce((sum, reg) => sum + (parseFloat(reg.paymentAmount) || 0), 0) +
                              yesterdayTickets.reduce((sum, ticket) => sum + (parseFloat(ticket.price) || 0), 0);

      const thisMonthRevenue = thisMonthRegistrations.reduce((sum, reg) => sum + (parseFloat(reg.paymentAmount) || 0), 0) +
                              thisMonthTickets.reduce((sum, ticket) => sum + (parseFloat(ticket.price) || 0), 0);

      const todayGrowth = yesterdayRevenue > 0 ? 
        ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;

      res.json({
        success: true,
        data: {
          today: {
            revenue: todayRevenue,
            transactions: todayRegistrations.length + todayTickets.length,
            growth: todayGrowth
          },
          yesterday: {
            revenue: yesterdayRevenue,
            transactions: yesterdayRegistrations.length + yesterdayTickets.length
          },
          thisMonth: {
            revenue: thisMonthRevenue,
            transactions: thisMonthRegistrations.length + thisMonthTickets.length
          },
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Revenue metrics error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch revenue metrics' 
      });
    }
  });
}