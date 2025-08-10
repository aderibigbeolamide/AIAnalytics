import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server } from 'http';
import { mongoStorage } from './mongodb-storage';

interface ChatMessage {
  id: string;
  sessionId: string;
  text: string;
  sender: 'user' | 'admin';
  timestamp: Date;
}

interface ChatSession {
  id: string;
  userEmail?: string;
  isEscalated: boolean;
  adminId?: string;
  status: 'active' | 'resolved' | 'pending_admin';
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
}

class WebSocketChatServer {
  private wss: WebSocketServer;
  private chatSessions = new Map<string, ChatSession>();
  private userConnections = new Map<string, WebSocket>();
  private adminConnections = new Map<string, WebSocket>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/chat' });
    
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('New WebSocket connection');
      
      ws.on('message', async (data) => {
        try {
          const rawMessage = data.toString();
          console.log('Raw WebSocket message received:', rawMessage);
          
          if (!rawMessage || rawMessage.trim() === '') {
            console.log('Empty message received, ignoring');
            return;
          }
          
          const message = JSON.parse(rawMessage);
          console.log('Parsed WebSocket message:', message);
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          console.error('Raw data was:', data.toString());
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        // Remove connection from maps
        this.userConnections.forEach((conn, sessionId) => {
          if (conn === ws) {
            this.userConnections.delete(sessionId);
          }
        });
        
        this.adminConnections.forEach((conn, adminId) => {
          if (conn === ws) {
            this.adminConnections.delete(adminId);
          }
        });
      });

      // Send connection acknowledgment
      ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
    });
  }

  private async handleMessage(ws: WebSocket, message: any) {
    const { type, data } = message;

    switch (type) {
      case 'join_user_session':
        await this.handleUserJoin(ws, data);
        break;
      
      case 'join_admin_session':
        await this.handleAdminJoin(ws, data);
        break;
      
      case 'user_message':
        await this.handleUserMessage(ws, data);
        break;
      
      case 'admin_message':
        await this.handleAdminMessage(ws, data);
        break;
      
      case 'escalate_to_admin':
        await this.handleEscalation(ws, data);
        break;
      
      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  }

  private async handleUserJoin(ws: WebSocket, data: any) {
    const { sessionId, userEmail } = data;
    
    // Store user connection
    this.userConnections.set(sessionId, ws);
    
    // Get or create chat session
    let session = this.chatSessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        userEmail,
        isEscalated: false,
        status: 'active',
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date()
      };
      this.chatSessions.set(sessionId, session);
    }
    
    // Send existing messages to user
    ws.send(JSON.stringify({
      type: 'session_data',
      data: {
        sessionId,
        messages: session.messages,
        isEscalated: session.isEscalated,
        status: session.status
      }
    }));
  }

  private async handleAdminJoin(ws: WebSocket, data: any) {
    const { adminId, sessionId } = data;
    
    // Store admin connection
    this.adminConnections.set(adminId, ws);
    
    if (sessionId) {
      const session = this.chatSessions.get(sessionId);
      if (session) {
        session.adminId = adminId;
        session.isEscalated = true;
        session.status = 'active';
        
        // Send session data to admin
        ws.send(JSON.stringify({
          type: 'session_data',
          data: {
            sessionId,
            userEmail: session.userEmail,
            messages: session.messages,
            isEscalated: session.isEscalated,
            status: session.status
          }
        }));
      }
    }

    // Send list of all active sessions to admin
    const activeSessions = Array.from(this.chatSessions.values())
      .filter(s => s.status === 'active' || s.status === 'pending_admin')
      .map(s => ({
        id: s.id,
        userEmail: s.userEmail,
        isEscalated: s.isEscalated,
        status: s.status,
        lastActivity: s.lastActivity,
        messageCount: s.messages.length
      }));

    ws.send(JSON.stringify({
      type: 'active_sessions',
      data: activeSessions
    }));
  }

  private async handleUserMessage(ws: WebSocket, data: any) {
    const { sessionId, text, userEmail } = data;
    console.log(`WebSocket user message received for session ${sessionId}:`, text);
    
    const session = this.chatSessions.get(sessionId);
    if (!session) {
      ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
      return;
    }

    // Create message
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      text,
      sender: 'user',
      timestamp: new Date()
    };

    // Add to session and update timestamps
    session.messages.push(message);
    session.lastActivity = new Date();
    
    // Update in-memory cache
    this.chatSessions.set(sessionId, session);

    // Save to database immediately
    try {
      const chatbotModule = await import('./chatbot-routes.js');
      if (chatbotModule.saveChatSession) {
        await chatbotModule.saveChatSession(session);
        console.log(`WebSocket USER message saved to database for session ${sessionId}`);
      } else {
        console.log('saveChatSession function not available, user message stored in memory only');
      }
    } catch (error) {
      console.error('Error saving WebSocket user message to database:', error);
    }

    // Send to user (confirmation)
    ws.send(JSON.stringify({
      type: 'message_received',
      data: message
    }));

    // If escalated, send to admin
    if (session.isEscalated && session.adminId) {
      const adminWs = this.adminConnections.get(session.adminId);
      if (adminWs && adminWs.readyState === WebSocket.OPEN) {
        console.log(`Notifying admin ${session.adminId} of new user message in session ${sessionId}`);
        adminWs.send(JSON.stringify({
          type: 'new_user_message',
          data: { ...message, sessionId, userEmail: session.userEmail }
        }));
      } else {
        console.log(`Admin ${session.adminId} not connected via WebSocket for session ${sessionId}`);
      }
    }
  }

  private async handleAdminMessage(ws: WebSocket, data: any) {
    const { sessionId, text, adminId } = data;
    console.log(`WebSocket admin message received for session ${sessionId}:`, text);
    
    // First, try to load the latest session from database to ensure we have current state
    try {
      // Import the chat session model directly
      const chatbotModule = await import('./chatbot-routes.js');
      if (chatbotModule.getChatSessionFromDB) {
        const dbSession = await chatbotModule.getChatSessionFromDB(sessionId);
        if (dbSession) {
          console.log(`Found session in database, updating in-memory cache`);
          this.chatSessions.set(sessionId, dbSession);
        }
      } else {
        console.log('getChatSessionFromDB function not available, using in-memory session');
      }
    } catch (error) {
      console.error('Error syncing with database:', error);
    }
    
    const session = this.chatSessions.get(sessionId);
    if (!session) {
      ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
      return;
    }

    // Create message
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      text,
      sender: 'admin',
      timestamp: new Date()
    };

    // Add to session and update timestamps
    session.messages.push(message);
    session.lastActivity = new Date();
    session.adminId = adminId;
    
    // Update in-memory cache
    this.chatSessions.set(sessionId, session);

    // Save to database immediately
    try {
      const chatbotModule = await import('./chatbot-routes.js');
      if (chatbotModule.saveChatSession) {
        await chatbotModule.saveChatSession(session);
        console.log(`WebSocket message saved to database for session ${sessionId}`);
      } else {
        console.log('saveChatSession function not available, message stored in memory only');
      }
    } catch (error) {
      console.error('Error saving WebSocket message to database:', error);
    }

    // Send to admin (confirmation)
    ws.send(JSON.stringify({
      type: 'message_sent',
      data: message
    }));

    // Send to user
    const userWs = this.userConnections.get(sessionId);
    if (userWs && userWs.readyState === WebSocket.OPEN) {
      userWs.send(JSON.stringify({
        type: 'admin_reply',
        data: message
      }));
    }
  }

  private async handleEscalation(ws: WebSocket, data: any) {
    const { sessionId, userEmail, reason } = data;
    
    let session = this.chatSessions.get(sessionId);
    if (!session) {
      // Create new session for escalation
      session = {
        id: sessionId,
        userEmail,
        isEscalated: true,
        status: 'pending_admin',
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date()
      };
      this.chatSessions.set(sessionId, session);
    } else {
      session.isEscalated = true;
      session.status = 'pending_admin';
      session.userEmail = userEmail;
      session.lastActivity = new Date();
    }

    // Add escalation message
    const escalationMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      text: `User requested human support. Reason: ${reason}`,
      sender: 'user',
      timestamp: new Date()
    };
    session.messages.push(escalationMessage);

    // Notify all connected admins
    this.adminConnections.forEach((adminWs) => {
      if (adminWs.readyState === WebSocket.OPEN) {
        adminWs.send(JSON.stringify({
          type: 'escalation_request',
          data: {
            sessionId,
            userEmail,
            reason,
            timestamp: new Date()
          }
        }));
      }
    });

    // Confirm to user
    ws.send(JSON.stringify({
      type: 'escalation_confirmed',
      data: {
        message: 'Your request has been forwarded to our support team. A human agent will assist you shortly.'
      }
    }));
  }

  // Get active sessions for admin dashboard
  public getActiveSessions() {
    return Array.from(this.chatSessions.values())
      .filter(s => s.status === 'active' || s.status === 'pending_admin')
      .map(s => ({
        id: s.id,
        userEmail: s.userEmail,
        isEscalated: s.isEscalated,
        status: s.status,
        lastActivity: s.lastActivity,
        messageCount: s.messages.length
      }));
  }

  // Get session by ID
  public getSession(sessionId: string): ChatSession | undefined {
    return this.chatSessions.get(sessionId);
  }
}

export { WebSocketChatServer, type ChatSession, type ChatMessage };