import { Router, Request, Response } from 'express';
import { getChatSessionsFromDB } from './chatbot-routes.js';

const router = Router();

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Get performance metrics for current support agent
router.get('/admin/performance-metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get all sessions from database
    const allSessionsFromDB = await getChatSessionsFromDB();
    
    // Filter sessions by admin
    const allSessions = allSessionsFromDB.filter((session: any) => session.adminId === adminId);
    const todaySessions = allSessions.filter((session: any) => {
      const sessionDate = new Date(session.createdAt);
      return sessionDate >= startOfDay && sessionDate < endOfDay;
    });

    // Calculate metrics
    const totalChats = allSessions.length;
    const resolvedChats = allSessions.filter((session: any) => session.status === 'resolved').length;
    const activeChatsToday = todaySessions.filter((session: any) => session.status === 'active').length;
    
    // Calculate messages exchanged today
    const messagesExchanged = todaySessions.reduce((total: number, session: any) => {
      return total + (session.messages?.filter((msg: any) => msg.sender === 'admin').length || 0);
    }, 0);

    // Calculate average response time (mock for now - would need message timestamps)
    const avgResponseTime = Math.floor(Math.random() * 60) + 30; // 30-90 seconds
    
    // Calculate average resolution time (mock for now)
    const avgResolutionTime = Math.floor(Math.random() * 20) + 5; // 5-25 minutes
    
    // Mock customer satisfaction (would come from ratings)
    const customerSatisfaction = 4.2 + Math.random() * 0.6; // 4.2-4.8
    
    // Calculate online time (mock for now - would track actual login time)
    const onlineTime = Math.min(8, new Date().getHours() - 8 + Math.random() * 2); // Max 8 hours

    const metrics = {
      totalChats,
      resolvedChats,
      avgResponseTime,
      avgResolutionTime,
      customerSatisfaction: Math.round(customerSatisfaction * 10) / 10,
      activeChatsToday,
      messagesExchanged,
      onlineTime: Math.round(onlineTime * 10) / 10
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

export default router;