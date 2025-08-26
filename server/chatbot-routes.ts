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

import mongoose from 'mongoose';

// MongoDB Schema for Chat Sessions
const chatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userEmail: { type: String, required: true },
  isEscalated: { type: Boolean, default: false },
  adminId: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'resolved', 'pending_admin'], 
    default: 'active' 
  },
  messages: [{
    id: String,
    text: String,
    sender: { type: String, enum: ['user', 'admin', 'bot'] },
    timestamp: Date,
    type: { type: String, enum: ['text', 'quick_reply', 'escalation'], default: 'text' }
  }],
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now }
});

const ChatSessionModel = mongoose.model('ChatSession', chatSessionSchema);

// In-memory cache for quick access (with MongoDB persistence)
const chatSessions = new Map<string, ChatSession>();
const adminLastSeen = new Map<string, Date>();

// Helper functions for database operations
export async function saveChatSession(session: ChatSession) {
  try {
    console.log(`Attempting to save chat session ${session.id} to database...`);
    const result = await ChatSessionModel.findOneAndUpdate(
      { sessionId: session.id },
      {
        sessionId: session.id,
        userEmail: session.userEmail,
        isEscalated: session.isEscalated,
        adminId: session.adminId,
        status: session.status,
        messages: session.messages,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
      },
      { upsert: true, new: true }
    );
    console.log(`✅ Chat session ${session.id} saved to database successfully:`, result?.sessionId);
  } catch (error) {
    console.error('❌ Error saving chat session:', error);
  }
}

export async function getChatSessionFromDB(sessionId: string): Promise<ChatSession | null> {
  try {
    const dbSession = await ChatSessionModel.findOne({ sessionId });
    if (!dbSession) return null;
    
    return {
      id: dbSession.sessionId,
      userEmail: dbSession.userEmail || '',
      isEscalated: dbSession.isEscalated,
      adminId: dbSession.adminId || undefined,
      status: dbSession.status as 'active' | 'resolved' | 'pending_admin',
      messages: dbSession.messages.map(msg => ({
        id: msg.id || '',
        text: msg.text || '',
        sender: msg.sender as 'bot' | 'user' | 'admin',
        timestamp: msg.timestamp || new Date(),
        type: (msg.type as 'text' | 'quick_reply' | 'escalation') || 'text'
      })),
      createdAt: dbSession.createdAt,
      lastActivity: dbSession.lastActivity
    };
  } catch (error) {
    console.error('Error getting chat session from database:', error);
    return null;
  }
}

async function loadChatSessions() {
  try {
    const sessions = await ChatSessionModel.find({ status: { $ne: 'resolved' } });
    console.log(`Loaded ${sessions.length} chat sessions from database`);
    
    sessions.forEach(session => {
      chatSessions.set(session.sessionId, {
        id: session.sessionId,
        userEmail: session.userEmail || '',
        isEscalated: session.isEscalated,
        adminId: session.adminId || undefined,
        status: session.status as 'active' | 'resolved' | 'pending_admin',
        messages: session.messages.map(msg => ({
          id: msg.id || '',
          text: msg.text || '',
          sender: msg.sender as 'bot' | 'user' | 'admin',
          timestamp: msg.timestamp || new Date(),
          type: (msg.type as 'text' | 'quick_reply' | 'escalation') || 'text'
        })),
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
      });
    });
  } catch (error) {
    console.error('Error loading chat sessions:', error);
  }
}

// Knowledge base for quick responses
const KNOWLEDGE_BASE = {
  organization_register: "To register your organization:\n\n1. Go to the EventValidate landing page\n2. Click 'Register Organization'\n3. Fill in your organization details\n4. Wait for super admin approval\n5. Once approved, set up your bank account for payments\n6. Start creating events!\n\nNeed help with any of these steps?",
  
  user_register: "To register for an event:\n\n1. Find the event on our platform or scan the event QR code\n2. Fill out the registration form with your details\n3. Upload any required documents (if needed)\n4. Complete payment if required\n5. Save your personal QR code for event validation\n\nYour QR code is your entry ticket!",
  
  buy_ticket: "To buy a ticket:\n\n1. Find the ticket-based event\n2. Click 'Buy Tickets'\n3. Select your ticket category (Regular, VIP, etc.)\n4. Complete payment via Paystack\n5. Download your PDF ticket with QR code\n6. Present QR code at event entrance\n\nTickets can be transferred to others if needed!",
  
  validate_event: "Event validation methods:\n\n📱 QR Code Scanning (most common)\n🆔 Manual ID entry\n📸 Face recognition (if enabled)\n📋 CSV member verification\n\nFor QR validation:\n1. Show your QR code to event staff\n2. Staff scan with the validation app\n3. System verifies your registration\n4. Entry granted if valid!\n\nEach method ensures secure event access.",
  
  explore_features: "EventValidate key features:\n\n🏢 Multi-tenant organization management\n🎫 Dual event systems (registration + tickets)\n💳 Integrated payment processing\n📱 QR code validation\n🤖 AI seat availability heatmaps\n🎯 Personalized event recommendations\n📊 Real-time analytics\n🔔 Notification system\n\nWhich feature interests you most?"
};

export function setupChatbotRoutes(app: Express) {
  // Initialize chat sessions from database on startup
  loadChatSessions();
  
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

      // Use AWS Bedrock (Claude) for EventValidate-specific questions
      try {
        const context = {
          userType: 'general' as const,
          conversationHistory: conversationHistory.map((msg: any) => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          })),
          currentIntent: 'general' as const
        };

        const { AWSBedrockService } = await import('./aws-bedrock-service');
        const aiResponse = await AWSBedrockService.generateChatbotResponse(message, context);
        
        res.json({
          response: aiResponse.response,
          suggestedActions: aiResponse.suggestedActions,
          source: "aws_bedrock"
        });
      } catch (aiError) {
        console.error("AWS Bedrock service error:", aiError);
        
        // Fallback to simple keyword matching
        const response = generateFallbackResponse(message);
        
        // Handle support requests specially
        if (response === "SUPPORT_REQUEST") {
          // Check admin status for support availability
          const superAdmins = await mongoStorage.getUsersByRole('super_admin');
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          let isAdminOnline = false;
          
          for (const admin of superAdmins) {
            const adminId = admin._id?.toString();
            if (adminId) {
              const lastSeen = adminLastSeen.get(adminId);
              if (lastSeen && lastSeen > fiveMinutesAgo) {
                isAdminOnline = true;
                break;
              }
            }
          }
          
          const supportMessage = isAdminOnline 
            ? "🟢 **Live Support Available!** I'll connect you with our customer support team right now.\n\nThey can help with:\n• Account and login issues\n• Technical problems\n• Payment questions\n• Organization approval status\n• Specific troubleshooting\n\nPlease provide your email address so our support team can follow up with you:"
            : "🟡 **Support Team Offline** - I'll forward your message to our customer support team.\n\nThey can help with:\n• Account and login issues\n• Technical problems\n• Payment questions\n• Organization approval status\n• Specific troubleshooting\n\n⏰ **Response Time:** Within 24 hours via email\n\nPlease provide your email address for follow-up:";
          
          res.json({
            response: supportMessage,
            supportRequest: true,
            adminOnline: isAdminOnline,
            source: "support_escalation"
          });
        } else {
          res.json({
            response,
            source: "fallback"
          });
        }
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
      await saveChatSession(session);

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
      await saveChatSession(session);

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
      // Reload from database to ensure we have latest data
      await loadChatSessions();
      
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
      
      // First try to get from database for most up-to-date data
      try {
        const dbSession = await ChatSessionModel.findOne({ sessionId });
        if (dbSession) {
          const sessionData = {
            id: dbSession.sessionId,
            userEmail: dbSession.userEmail || '',
            isEscalated: dbSession.isEscalated,
            adminId: dbSession.adminId || undefined,
            status: dbSession.status as 'active' | 'resolved' | 'pending_admin',
            messages: dbSession.messages.map(msg => ({
              id: msg.id || '',
              text: msg.text || '',
              sender: msg.sender as 'bot' | 'user' | 'admin',
              timestamp: msg.timestamp || new Date(),
              type: (msg.type as 'text' | 'quick_reply' | 'escalation') || 'text'
            })),
            createdAt: dbSession.createdAt,
            lastActivity: dbSession.lastActivity
          };
          
          // Update in-memory cache
          chatSessions.set(sessionId, sessionData);
          
          console.log(`✅ Loaded session ${sessionId} from database with ${sessionData.messages.length} messages`);
          return res.json(sessionData);
        }
      } catch (dbError) {
        console.error('Database lookup failed, using in-memory:', dbError);
      }
      
      // Fallback to in-memory
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

      // Also save to database and ensure real-time sync
      try {
        await ChatSessionModel.findOneAndUpdate(
          { sessionId },
          {
            messages: session.messages,
            lastActivity: session.lastActivity,
            adminId: session.adminId,
            status: session.status
          }
        );
        console.log(`✅ Admin response saved to database for session ${sessionId}, status: ${session.status}`);
        
        // Force reload from database to ensure sync
        const updatedSession = await ChatSessionModel.findOne({ sessionId });
        if (updatedSession) {
          const sessionData = {
            id: updatedSession.sessionId,
            userEmail: updatedSession.userEmail || '',
            isEscalated: updatedSession.isEscalated,
            adminId: updatedSession.adminId || undefined,
            status: updatedSession.status as 'active' | 'resolved' | 'pending_admin',
            messages: updatedSession.messages.map(msg => ({
              id: msg.id || '',
              text: msg.text || '',
              sender: msg.sender as 'bot' | 'user' | 'admin',
              timestamp: msg.timestamp || new Date(),
              type: (msg.type as 'text' | 'quick_reply' | 'escalation') || 'text'
            })),
            createdAt: updatedSession.createdAt,
            lastActivity: updatedSession.lastActivity
          };
          chatSessions.set(sessionId, sessionData);
          console.log(`🔄 Session ${sessionId} reloaded from database for sync`);
        }
      } catch (dbError) {
        console.error('Error saving admin response to database:', dbError);
        // Continue anyway as in-memory is updated
      }

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

// Enhanced fallback response function
function generateFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Check for support requests first
  if (lowerMessage.includes('support') || lowerMessage.includes('customer service') || 
      lowerMessage.includes('help me') || lowerMessage.includes('contact') ||
      lowerMessage.includes('speak to someone') || lowerMessage.includes('talk to admin') ||
      lowerMessage.includes('technical issue') || lowerMessage.includes('problem')) {
    return "SUPPORT_REQUEST";
  }
  
  // Organization-related questions
  if (lowerMessage.includes('register') && (lowerMessage.includes('organization') || lowerMessage.includes('company') || lowerMessage.includes('business'))) {
    return KNOWLEDGE_BASE.organization_register;
  }
  
  if (lowerMessage.includes('create event') || lowerMessage.includes('make event') || lowerMessage.includes('host event')) {
    return "Creating events on EventValidate:\n\n1. First register your organization and get approved\n2. Login to your organization dashboard\n3. Click 'Events' → 'Create Event'\n4. Choose event type:\n   • Registration Event (for members with validation)\n   • Ticket Event (for public ticket sales)\n5. Fill in event details and publish\n\n🎯 Your event will appear on public listings immediately!\n\nNeed help with event configuration or registration?";
  }
  
  // User registration and participation
  if (lowerMessage.includes('register for') || lowerMessage.includes('join event') || lowerMessage.includes('attend event')) {
    return KNOWLEDGE_BASE.user_register;
  }
  
  if (lowerMessage.includes('ticket') || lowerMessage.includes('buy') || lowerMessage.includes('purchase')) {
    return KNOWLEDGE_BASE.buy_ticket;
  }
  
  if (lowerMessage.includes('validate') || lowerMessage.includes('validation') || lowerMessage.includes('qr code') || lowerMessage.includes('entry')) {
    return KNOWLEDGE_BASE.validate_event;
  }
  
  // Features and platform info
  if (lowerMessage.includes('feature') || lowerMessage.includes('explore') || lowerMessage.includes('what can') || lowerMessage.includes('capabilities')) {
    return KNOWLEDGE_BASE.explore_features;
  }
  
  if (lowerMessage.includes('payment') || lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('fee')) {
    return "EventValidate payment system:\n\n💳 **Payment Methods:**\n• Secure online payments via Paystack\n• Manual verification at events\n• Organization bank accounts for direct routing\n\n💰 **Pricing:**\n• Platform fee: 2% of successful transactions\n• Organizations keep 98% of payments\n• No hidden charges or monthly fees\n\n🔒 **Security:**\n• Bank-level encryption (256-bit SSL)\n• PCI compliant processing\n• No card details stored on our servers\n\nQuestions about payments for a specific event?";
  }
  
  if (lowerMessage.includes('how') && (lowerMessage.includes('work') || lowerMessage.includes('use'))) {
    return "EventValidate is an AI-powered event management platform:\n\n🏢 **For Organizations:**\n• Register and create events\n• Manage member databases\n• QR code validation systems\n• Payment processing integration\n• Real-time analytics\n\n👥 **For Users:**\n• Browse and join events\n• Secure registration process\n• Digital tickets with QR codes\n• Multiple validation methods\n\n🤖 **AI Features:**\n• Smart event recommendations\n• Seat availability heatmaps\n• Automated validation\n\nWhat specific aspect would you like to learn about?";
  }
  
  // Greeting responses
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('good morning') || lowerMessage.includes('good afternoon')) {
    return "Hello! I'm **Valie**, your EventValidate AI assistant! 👋\n\nI'm here to help you navigate our event management platform. I can assist you with:\n\n🏢 Organization registration and setup\n🎫 Event creation and management\n👥 User registration for events\n🎟️ Ticket purchasing and validation\n💳 Payment and billing questions\n🔍 Platform features and capabilities\n📞 Connecting with customer support when needed\n\nWhat would you like to explore today?";
  }
  
  // Default response for unclear questions
  return "Hi! I'm **Valie**, your EventValidate AI assistant! 🤖\n\nI'm here to help with our platform that offers:\n\n✅ **Event Management:** Create and manage events easily\n✅ **Member Validation:** QR codes, face recognition, CSV validation\n✅ **Payment Processing:** Secure payments via Paystack\n✅ **Ticket Sales:** Digital tickets with QR validation\n✅ **Analytics:** Real-time event insights\n\nCould you be more specific about what you need help with? For example:\n• \"How do I register my organization?\"\n• \"How do I buy tickets for an event?\"\n• \"How does validation work?\"\n• \"I need to speak to customer support\"";
}