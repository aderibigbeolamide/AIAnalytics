import type { Express, Request, Response } from "express";
import { mongoStorage } from "./mongodb-storage";
import { NotificationService } from "./notification-service";

interface ChatSession {
  id: string;
  userEmail?: string;
  isEscalated: boolean;
  adminId?: string;
  status: 'active' | 'resolved' | 'pending_admin';
  messages: Array<{
    id: string;
    text: string;
    sender: 'bot' | 'user' | 'admin';
    timestamp: Date;
    type?: 'text' | 'quick_reply' | 'escalation';
  }>;
  createdAt: Date;
  lastActivity: Date;
}

// In-memory storage for chat sessions (in production, use MongoDB)
const chatSessions = new Map<string, ChatSession>();
const adminLastSeen = new Map<string, Date>();

export function setupChatbotRoutes(app: Express) {
  
  // Check if super admin is online
  app.get("/api/chatbot/admin-status", async (req: Request, res: Response) => {
    try {
      // Check if any super admin has been active in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const superAdmins = await mongoStorage.getUsersByRole('super_admin');
      
      let isOnline = false;
      for (const admin of superAdmins) {
        const adminId = admin._id?.toString();
        if (adminId) {
          const lastSeen = adminLastSeen.get(adminId);
          if (lastSeen && lastSeen > fiveMinutesAgo) {
            isOnline = true;
            break;
          }
        }
      }
      
      res.json({ isOnline });
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.json({ isOnline: false });
    }
  });

  // Update admin activity (called when super admin is active)
  app.post("/api/chatbot/admin-heartbeat", async (req: Request, res: Response) => {
    try {
      const { adminId } = req.body;
      if (adminId) {
        adminLastSeen.set(adminId, new Date());
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating admin heartbeat:", error);
      res.status(500).json({ message: "Failed to update heartbeat" });
    }
  });

  // Escalate chat to admin
  app.post("/api/chatbot/escalate", async (req: Request, res: Response) => {
    try {
      const { sessionId, userEmail, messages, adminOnlineStatus } = req.body;

      if (!sessionId || !userEmail) {
        return res.status(400).json({ message: "Session ID and email are required" });
      }

      // Create or update chat session
      const session: ChatSession = {
        id: sessionId,
        userEmail,
        isEscalated: true,
        status: adminOnlineStatus ? 'pending_admin' : 'pending_admin',
        messages: messages || [],
        createdAt: new Date(),
        lastActivity: new Date()
      };

      chatSessions.set(sessionId, session);

      // Send notification to all super admins
      const superAdmins = await mongoStorage.getUsersByRole('super_admin');
      
      for (const admin of superAdmins) {
        const adminId = admin._id?.toString();
        const orgId = admin.organizationId?.toString();
        if (adminId && orgId) {
          await NotificationService.createNotification({
            recipientId: adminId,
            organizationId: orgId,
            title: "New Customer Support Request",
            message: `A user (${userEmail}) needs assistance. Chat session: ${sessionId}`,
            type: "individual",
            priority: "high",
            actionUrl: `/super-admin-chat/${sessionId}`
          });
        }
      }

      res.json({ 
        success: true, 
        message: "Chat escalated successfully",
        sessionId,
        adminOnlineStatus
      });

    } catch (error) {
      console.error("Error escalating chat:", error);
      res.status(500).json({ message: "Failed to escalate chat" });
    }
  });

  // Send message to admin (from user)
  app.post("/api/chatbot/send-to-admin", async (req: Request, res: Response) => {
    try {
      const { sessionId, message, userEmail } = req.body;

      if (!sessionId || !message) {
        return res.status(400).json({ message: "Session ID and message are required" });
      }

      const session = chatSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Add user message to session
      const userMessage = {
        id: `msg_${Date.now()}`,
        text: message,
        sender: 'user' as const,
        timestamp: new Date(),
        type: 'text' as const
      };

      session.messages.push(userMessage);
      session.lastActivity = new Date();
      chatSessions.set(sessionId, session);

      // Notify admin of new message
      const superAdmins = await mongoStorage.getUsersByRole('super_admin');
      
      for (const admin of superAdmins) {
        const adminId = admin._id?.toString();
        const orgId = admin.organizationId?.toString();
        if (adminId && orgId) {
          await NotificationService.createNotification({
            recipientId: adminId,
            organizationId: orgId,
            title: "New Message in Support Chat",
            message: `${userEmail || 'User'}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
            type: "individual",
            priority: "medium",
            actionUrl: `/super-admin-chat/${sessionId}`
          });
        }
      }

      res.json({ success: true });

    } catch (error) {
      console.error("Error sending message to admin:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get admin responses (polling endpoint for user)
  app.get("/api/chatbot/admin-response/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { lastMessageId } = req.query;

      const session = chatSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Find new admin messages since lastMessageId
      let newMessages = session.messages.filter(msg => msg.sender === 'admin');
      
      if (lastMessageId) {
        const lastIndex = session.messages.findIndex(msg => msg.id === lastMessageId);
        if (lastIndex >= 0) {
          newMessages = session.messages
            .slice(lastIndex + 1)
            .filter(msg => msg.sender === 'admin');
        }
      }

      res.json({
        hasNewMessages: newMessages.length > 0,
        messages: newMessages,
        sessionStatus: session.status
      });

    } catch (error) {
      console.error("Error getting admin response:", error);
      res.status(500).json({ message: "Failed to get admin response" });
    }
  });

  // Admin endpoints for super admin dashboard
  
  // Get all active chat sessions (for super admin)
  app.get("/api/admin/chat-sessions", async (req: Request, res: Response) => {
    try {
      const sessions = Array.from(chatSessions.values())
        .filter(session => session.isEscalated && session.status !== 'resolved')
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

      res.json(sessions);
    } catch (error) {
      console.error("Error getting chat sessions:", error);
      res.status(500).json({ message: "Failed to get chat sessions" });
    }
  });

  // Get specific chat session (for super admin)
  app.get("/api/admin/chat-sessions/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = chatSessions.get(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error getting chat session:", error);
      res.status(500).json({ message: "Failed to get chat session" });
    }
  });

  // Send admin response to user
  app.post("/api/admin/chat-sessions/:sessionId/respond", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { message, adminId } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const session = chatSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Add admin message to session
      const adminMessage = {
        id: `msg_${Date.now()}`,
        text: message,
        sender: 'admin' as const,
        timestamp: new Date(),
        type: 'text' as const
      };

      session.messages.push(adminMessage);
      session.lastActivity = new Date();
      session.adminId = adminId;
      session.status = 'active';
      chatSessions.set(sessionId, session);

      // Update admin heartbeat
      if (adminId) {
        adminLastSeen.set(adminId, new Date());
      }

      res.json({ success: true });

    } catch (error) {
      console.error("Error sending admin response:", error);
      res.status(500).json({ message: "Failed to send response" });
    }
  });

  // Close chat session
  app.post("/api/admin/chat-sessions/:sessionId/close", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { adminId } = req.body;

      const session = chatSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Add closing message
      const closingMessage = {
        id: `msg_${Date.now()}`,
        text: "This support session has been closed. If you need further assistance, please start a new chat. Thank you!",
        sender: 'admin' as const,
        timestamp: new Date(),
        type: 'text' as const
      };

      session.messages.push(closingMessage);
      session.status = 'resolved';
      session.lastActivity = new Date();
      chatSessions.set(sessionId, session);

      // Update admin heartbeat
      if (adminId) {
        adminLastSeen.set(adminId, new Date());
      }

      res.json({ success: true });

    } catch (error) {
      console.error("Error closing chat session:", error);
      res.status(500).json({ message: "Failed to close chat session" });
    }
  });
}