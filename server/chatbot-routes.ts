import type { Express, Request, Response } from "express";
import { mongoStorage } from "./mongodb-storage";
import { NotificationService } from "./notification-service";
import { OpenAIService } from "./openai-service";

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

// Knowledge base for quick responses
const KNOWLEDGE_BASE = {
  organization_register: "To register your organization:\n\n1. Go to the EventValidate landing page\n2. Click 'Register Organization'\n3. Fill in your organization details\n4. Wait for super admin approval\n5. Once approved, set up your bank account for payments\n6. Start creating events!\n\nNeed help with any of these steps?",
  
  user_register: "To register for an event:\n\n1. Find the event on our platform or scan the event QR code\n2. Fill out the registration form with your details\n3. Upload any required documents (if needed)\n4. Complete payment if required\n5. Save your personal QR code for event validation\n\nYour QR code is your entry ticket!",
  
  buy_ticket: "To buy a ticket:\n\n1. Find the ticket-based event\n2. Click 'Buy Tickets'\n3. Select your ticket category (Regular, VIP, etc.)\n4. Complete payment via Paystack\n5. Download your PDF ticket with QR code\n6. Present QR code at event entrance\n\nTickets can be transferred to others if needed!",
  
  validate_event: "Event validation methods:\n\n📱 QR Code Scanning (most common)\n🆔 Manual ID entry\n📸 Face recognition (if enabled)\n📋 CSV member verification\n\nFor QR validation:\n1. Show your QR code to event staff\n2. Staff scan with the validation app\n3. System verifies your registration\n4. Entry granted if valid!\n\nEach method ensures secure event access.",
  
  explore_features: "EventValidate key features:\n\n🏢 Multi-tenant organization management\n🎫 Dual event systems (registration + tickets)\n💳 Integrated payment processing\n📱 QR code validation\n🤖 AI seat availability heatmaps\n🎯 Personalized event recommendations\n📊 Real-time analytics\n🔔 Notification system\n\nWhich feature interests you most?"
};

export function setupChatbotRoutes(app: Express) {
  
  // AI-powered chat endpoint
  app.post("/api/chatbot/chat", async (req: Request, res: Response) => {
    try {
      const { message, sessionId, conversationHistory = [] } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Check if this is a quick action first
      if (KNOWLEDGE_BASE[message as keyof typeof KNOWLEDGE_BASE]) {
        return res.json({
          response: KNOWLEDGE_BASE[message as keyof typeof KNOWLEDGE_BASE],
          source: "knowledge_base"
        });
      }

      // Use OpenAI for complex questions
      try {
        const context = {
          userType: 'general' as const,
          conversationHistory: conversationHistory.map((msg: any) => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          })),
          currentIntent: 'general' as const
        };

        const aiResponse = await OpenAIService.generateChatbotResponse(message, context);
        
        res.json({
          response: aiResponse.response,
          suggestedActions: aiResponse.suggestedActions,
          source: "ai"
        });
      } catch (aiError) {
        console.error("AI service error:", aiError);
        
        // Fallback to simple keyword matching
        const response = generateFallbackResponse(message);
        res.json({
          response,
          source: "fallback"
        });
      }

    } catch (error) {
      console.error("Error in chat endpoint:", error);
      res.status(500).json({ 
        message: "I'm experiencing some technical difficulties. Please try again or contact support.",
        source: "error"
      });
    }
  });

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
            category: "support",
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
            category: "support",
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
      console.log('API: Getting chat sessions, total in memory:', chatSessions.size);
      const allSessions = Array.from(chatSessions.values());
      console.log('API: All sessions:', allSessions.map(s => ({ id: s.id, email: s.userEmail, status: s.status })));
      
      const sessions = allSessions
        .filter(session => session.isEscalated && session.status !== 'resolved')
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

      console.log('API: Filtered sessions to return:', sessions.length);
      
      // Disable caching for this endpoint
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
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

// Fallback response function
function generateFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('register') && lowerMessage.includes('organization')) {
    return KNOWLEDGE_BASE.organization_register;
  }
  
  if (lowerMessage.includes('register') || lowerMessage.includes('event')) {
    return KNOWLEDGE_BASE.user_register;
  }
  
  if (lowerMessage.includes('ticket') || lowerMessage.includes('buy')) {
    return KNOWLEDGE_BASE.buy_ticket;
  }
  
  if (lowerMessage.includes('validate') || lowerMessage.includes('validation')) {
    return KNOWLEDGE_BASE.validate_event;
  }
  
  if (lowerMessage.includes('feature') || lowerMessage.includes('explore')) {
    return KNOWLEDGE_BASE.explore_features;
  }
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('help')) {
    return "Hello! I'm here to help you with EventValidate. I can assist you with:\n\n🏢 Organization registration\n🎫 Event registration\n🎟️ Ticket purchasing\n✅ Event validation\n🔍 Platform features\n📞 Customer support\n\nWhat would you like to know more about?";
  }
  
  return "I'd be happy to help! Here are some things I can assist you with:\n\n• Registering your organization\n• Joining and registering for events\n• Buying tickets\n• Understanding validation process\n• Exploring platform features\n\nCould you please be more specific about what you need help with?";
}