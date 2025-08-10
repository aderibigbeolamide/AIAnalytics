import { Router, Request, Response } from 'express';
import { db } from './db/index.js';
import { users, events, eventRegistrations, tickets, organizations } from '@shared/schema';
import { eq, sql, and, gte, lte, desc } from 'drizzle-orm';
import { authenticateToken, AuthenticatedRequest } from './middleware/auth.js';

const router = Router();

/**
 * Platform Revenue Analytics API
 * Provides comprehensive revenue data with automatic synchronization
 */

// Get comprehensive platform statistics with revenue analytics
router.get('/admin/platform-analytics', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const currentDate = new Date();
    const last30Days = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    const last7Days = new Date(currentDate.getTime() - (7 * 24 * 60 * 60 * 1000));

    // Revenue Analytics
    const revenueQueries = await Promise.all([
      // Total platform revenue from registrations
      db.select({
        total: sql<number>`COALESCE(SUM(CAST(${eventRegistrations.paymentAmount} AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`
      })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.paymentStatus, 'paid')),

      // Total ticket revenue
      db.select({
        total: sql<number>`COALESCE(SUM(CAST(${tickets.price} AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`
      })
      .from(tickets)
      .where(eq(tickets.paymentStatus, 'paid')),

      // Revenue by month (last 12 months)
      db.select({
        month: sql<string>`DATE_FORMAT(${eventRegistrations.createdAt}, '%Y-%m')`,
        revenue: sql<number>`COALESCE(SUM(CAST(${eventRegistrations.paymentAmount} AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`
      })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.paymentStatus, 'paid'),
          gte(eventRegistrations.createdAt, new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))
        )
      )
      .groupBy(sql`DATE_FORMAT(${eventRegistrations.createdAt}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${eventRegistrations.createdAt}, '%Y-%m')`),

      // Ticket revenue by month
      db.select({
        month: sql<string>`DATE_FORMAT(${tickets.createdAt}, '%Y-%m')`,
        revenue: sql<number>`COALESCE(SUM(CAST(${tickets.price} AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`
      })
      .from(tickets)
      .where(
        and(
          eq(tickets.paymentStatus, 'paid'),
          gte(tickets.createdAt, new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))
        )
      )
      .groupBy(sql`DATE_FORMAT(${tickets.createdAt}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${tickets.createdAt}, '%Y-%m')`),

      // Daily revenue (last 30 days)
      db.select({
        date: sql<string>`DATE(${eventRegistrations.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(CAST(${eventRegistrations.paymentAmount} AS DECIMAL)), 0)`,
        transactions: sql<number>`COUNT(*)`
      })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.paymentStatus, 'paid'),
          gte(eventRegistrations.createdAt, last30Days)
        )
      )
      .groupBy(sql`DATE(${eventRegistrations.createdAt})`)
      .orderBy(sql`DATE(${eventRegistrations.createdAt})`),

      // Platform fees calculation (3% of total revenue)
      db.select({
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${eventRegistrations.paymentAmount} AS DECIMAL)), 0)`
      })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.paymentStatus, 'paid'))
    ]);

    const [registrationRevenue, ticketRevenue, monthlyRegistrations, monthlyTickets, dailyRevenue, totalRevenueForFees] = revenueQueries;

    // Calculate platform fees (3% of total revenue)
    const totalRevenue = (registrationRevenue[0]?.total || 0) + (ticketRevenue[0]?.total || 0);
    const platformFees = totalRevenue * 0.03;

    // Combine monthly data
    const monthlyRevenueMap = new Map();
    
    monthlyRegistrations.forEach(item => {
      monthlyRevenueMap.set(item.month, {
        month: item.month,
        registrationRevenue: item.revenue,
        registrationCount: item.count,
        ticketRevenue: 0,
        ticketCount: 0
      });
    });

    monthlyTickets.forEach(item => {
      const existing = monthlyRevenueMap.get(item.month) || {
        month: item.month,
        registrationRevenue: 0,
        registrationCount: 0,
        ticketRevenue: 0,
        ticketCount: 0
      };
      existing.ticketRevenue = item.revenue;
      existing.ticketCount = item.count;
      monthlyRevenueMap.set(item.month, existing);
    });

    const monthlyData = Array.from(monthlyRevenueMap.values()).map(item => ({
      month: item.month,
      totalRevenue: item.registrationRevenue + item.ticketRevenue,
      registrationRevenue: item.registrationRevenue,
      ticketRevenue: item.ticketRevenue,
      transactions: item.registrationCount + item.ticketCount,
      platformFees: (item.registrationRevenue + item.ticketRevenue) * 0.03
    }));

    // Get organization statistics
    const organizationStats = await db.select({
      total: sql<number>`COUNT(*)`,
      approved: sql<number>`SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)`,
      pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
      suspended: sql<number>`SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END)`
    }).from(organizations);

    // Get user statistics
    const userStats = await db.select({
      total: sql<number>`COUNT(*)`,
      admins: sql<number>`SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END)`,
      superAdmins: sql<number>`SUM(CASE WHEN role = 'super_admin' THEN 1 ELSE 0 END)`,
      active: sql<number>`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)`
    }).from(users);

    // Get event statistics
    const eventStats = await db.select({
      total: sql<number>`COUNT(*)`,
      upcoming: sql<number>`SUM(CASE WHEN date >= CURDATE() THEN 1 ELSE 0 END)`,
      past: sql<number>`SUM(CASE WHEN date < CURDATE() THEN 1 ELSE 0 END)`
    }).from(events);

    // Calculate growth rates
    const last30DaysRevenue = dailyRevenue.reduce((sum, day) => sum + (day.revenue || 0), 0);
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const currentMonthRevenue = monthlyData.find(m => m.month === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`)?.totalRevenue || 0;
    const previousMonthRevenue = monthlyData.find(m => m.month === `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`)?.totalRevenue || 0;
    
    const revenueGrowthRate = previousMonthRevenue > 0 ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;

    const analytics = {
      overview: {
        totalRevenue,
        platformFees,
        totalTransactions: (registrationRevenue[0]?.count || 0) + (ticketRevenue[0]?.count || 0),
        totalOrganizations: organizationStats[0]?.total || 0,
        totalUsers: userStats[0]?.total || 0,
        totalEvents: eventStats[0]?.total || 0,
        revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100,
        last30DaysRevenue
      },
      
      revenue: {
        total: totalRevenue,
        registrationRevenue: registrationRevenue[0]?.total || 0,
        ticketRevenue: ticketRevenue[0]?.total || 0,
        platformFees,
        monthlyData,
        dailyData: dailyRevenue
      },

      transactions: {
        total: (registrationRevenue[0]?.count || 0) + (ticketRevenue[0]?.count || 0),
        registrations: registrationRevenue[0]?.count || 0,
        tickets: ticketRevenue[0]?.count || 0,
        averageTransactionValue: totalRevenue > 0 ? Math.round((totalRevenue / ((registrationRevenue[0]?.count || 0) + (ticketRevenue[0]?.count || 0))) * 100) / 100 : 0
      },

      organizations: {
        total: organizationStats[0]?.total || 0,
        approved: organizationStats[0]?.approved || 0,
        pending: organizationStats[0]?.pending || 0,
        suspended: organizationStats[0]?.suspended || 0
      },

      users: {
        total: userStats[0]?.total || 0,
        admins: userStats[0]?.admins || 0,
        superAdmins: userStats[0]?.superAdmins || 0,
        active: userStats[0]?.active || 0
      },

      events: {
        total: eventStats[0]?.total || 0,
        upcoming: eventStats[0]?.upcoming || 0,
        past: eventStats[0]?.past || 0
      },

      metadata: {
        lastUpdated: new Date().toISOString(),
        dataRange: {
          from: last30Days.toISOString().split('T')[0],
          to: currentDate.toISOString().split('T')[0]
        },
        currency: 'NGN' // Nigerian Naira
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
router.get('/admin/revenue-metrics', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const currentDate = new Date();
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));
    const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Real-time metrics
    const [todayRevenue, yesterdayRevenue, thisMonthRevenue] = await Promise.all([
      // Today's revenue
      db.select({
        revenue: sql<number>`COALESCE(SUM(CAST(${eventRegistrations.paymentAmount} AS DECIMAL)), 0)`,
        transactions: sql<number>`COUNT(*)`
      })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.paymentStatus, 'paid'),
          gte(eventRegistrations.createdAt, today)
        )
      ),

      // Yesterday's revenue
      db.select({
        revenue: sql<number>`COALESCE(SUM(CAST(${eventRegistrations.paymentAmount} AS DECIMAL)), 0)`,
        transactions: sql<number>`COUNT(*)`
      })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.paymentStatus, 'paid'),
          gte(eventRegistrations.createdAt, yesterday),
          lte(eventRegistrations.createdAt, today)
        )
      ),

      // This month's revenue
      db.select({
        revenue: sql<number>`COALESCE(SUM(CAST(${eventRegistrations.paymentAmount} AS DECIMAL)), 0)`,
        transactions: sql<number>`COUNT(*)`
      })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.paymentStatus, 'paid'),
          gte(eventRegistrations.createdAt, thisMonth)
        )
      )
    ]);

    const todayGrowth = yesterdayRevenue[0]?.revenue > 0 ? 
      ((todayRevenue[0]?.revenue - yesterdayRevenue[0]?.revenue) / yesterdayRevenue[0]?.revenue) * 100 : 0;

    res.json({
      success: true,
      data: {
        today: {
          revenue: todayRevenue[0]?.revenue || 0,
          transactions: todayRevenue[0]?.transactions || 0,
          growth: Math.round(todayGrowth * 100) / 100
        },
        yesterday: {
          revenue: yesterdayRevenue[0]?.revenue || 0,
          transactions: yesterdayRevenue[0]?.transactions || 0
        },
        thisMonth: {
          revenue: thisMonthRevenue[0]?.revenue || 0,
          transactions: thisMonthRevenue[0]?.transactions || 0
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

export default router;