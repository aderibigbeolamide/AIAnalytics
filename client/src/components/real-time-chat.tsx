import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  X,
  CheckCircle2,
  Clock,
  ArrowLeft,
  PhoneCall,
  Mail,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  messageCount?: number;
}

interface RealTimeChatProps {
  sessionId?: string;
  onSessionSelect?: (sessionId: string) => void;
}

export default function RealTimeChat({ sessionId, onSessionSelect }: RealTimeChatProps) {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [activeSessions, setActiveSessions] = useState<ChatSession[]>([]);
  const [inputText, setInputText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuthStore();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  useEffect(() => {
    if (user?.id) {
      console.log('RealTimeChat: User ID found, initializing WebSocket...', user.id);
      connectWebSocket();
      loadActiveSessions(); // Load sessions immediately on mount
      
      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    } else {
      console.log('RealTimeChat: No user ID found');
    }
  }, [user?.id]);

  // Load individual session when sessionId is provided
  const loadSession = async (sessionIdToLoad: string) => {
    try {
      console.log(`Loading individual session: ${sessionIdToLoad}`);
      const response = await fetch(`/api/admin/chat-sessions/${sessionIdToLoad}?_t=${Date.now()}`);
      if (response.ok) {
        const session = await response.json();
        console.log('Loaded individual session:', session);
        
        // Convert to proper format
        const processedSession = {
          ...session,
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })),
          createdAt: new Date(session.createdAt),
          lastActivity: new Date(session.lastActivity)
        };
        
        setCurrentSession(processedSession);
        scrollToBottom();
      } else {
        console.error('Failed to load individual session:', response.status);
        toast({
          title: "Error",
          description: "Failed to load chat session",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading individual session:', error);
      toast({
        title: "Error",
        description: "Failed to load chat session",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (sessionId && isConnected) {
      joinSession(sessionId);
    }
  }, [sessionId, isConnected]);

  // Load session when sessionId changes
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    } else {
      setCurrentSession(null);
    }
  }, [sessionId]);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Join as admin
        if (user?.id) {
          wsRef.current?.send(JSON.stringify({
            type: 'join_admin_session',
            data: { 
              adminId: user.id,
              sessionId: sessionId
            }
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected - attempting reconnect...');
        setIsConnected(false);
        
        // Try to reconnect after 2 seconds
        setTimeout(() => {
          if (user?.id) {
            console.log('Reconnecting WebSocket...');
            connectWebSocket();
          }
        }, 2000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setIsConnected(false);
    }
  };

  const handleWebSocketMessage = (message: any) => {
    const { type, data } = message;

    switch (type) {
      case 'connected':
        console.log('WebSocket connection confirmed');
        break;
      
      case 'session_data':
        if (data.sessionId === sessionId) {
          setCurrentSession({
            id: data.sessionId,
            userEmail: data.userEmail,
            isEscalated: data.isEscalated,
            status: data.status,
            messages: data.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            })),
            createdAt: new Date(),
            lastActivity: new Date()
          });
        }
        break;
      
      case 'active_sessions':
        console.log('WebSocket: Received active sessions update', data);
        setActiveSessions(data.map((session: any) => ({
          ...session,
          lastActivity: new Date(session.lastActivity)
        })));
        break;
      
      case 'new_user_message':
        console.log('WebSocket: New user message received', data);
        if (data.sessionId === sessionId) {
          setCurrentSession(prev => {
            if (!prev) return null;
            return {
              ...prev,
              messages: [...prev.messages, {
                ...data,
                timestamp: new Date(data.timestamp)
              }],
              lastActivity: new Date()
            };
          });
        }
        
        // Update sessions list with new message count
        setActiveSessions(prev => prev.map(session => 
          session.id === data.sessionId 
            ? { ...session, messageCount: (session.messageCount || 0) + 1, lastActivity: new Date() }
            : session
        ));
        
        // Show notification for new messages
        toast({
          title: "New Message",
          description: `From ${data.userEmail}: ${data.text.substring(0, 50)}...`,
          duration: 5000
        });
        break;
      
      case 'message_sent':
        // Message confirmation - update local state
        setCurrentSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, {
              ...data,
              timestamp: new Date(data.timestamp)
            }],
            lastActivity: new Date()
          };
        });
        break;
      
      case 'escalation_request':
        // New escalation request
        toast({
          title: "New Support Request",
          description: `${data.userEmail} needs help: ${data.reason}`,
          duration: 10000
        });
        
        // Refresh active sessions
        if (wsRef.current && user?.id) {
          wsRef.current.send(JSON.stringify({
            type: 'join_admin_session',
            data: { adminId: user.id }
          }));
        }
        break;
      
      case 'error':
        toast({
          title: "Connection Error",
          description: data.message || "Something went wrong",
          variant: "destructive"
        });
        break;
    }
  };

  const joinSession = (sessionId: string) => {
    if (wsRef.current && user?.id) {
      wsRef.current.send(JSON.stringify({
        type: 'join_admin_session',
        data: { 
          adminId: user.id,
          sessionId: sessionId
        }
      }));
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !currentSession || !user?.id) return;

    setIsSending(true);
    
    try {
      if (wsRef.current && isConnected) {
        // Send via WebSocket
        wsRef.current.send(JSON.stringify({
          type: 'admin_message',
          data: {
            sessionId: currentSession.id,
            text: inputText,
            adminId: user.id
          }
        }));
      } else {
        // Fallback to HTTP API
        const response = await fetch(`/api/admin/chat-sessions/${currentSession.id}/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: inputText,
            adminId: user.id
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }
        
        // Reload session to get updated messages
        await loadSession(currentSession.id);
      }
      
      setInputText("");
      
      // Also refresh the session list to update message count
      if (!sessionId) {
        loadActiveSessions();
      }
    } catch (error) {
      toast({
        title: "Message Failed",
        description: "Unable to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const closeSession = async () => {
    if (!currentSession || !user?.id) return;

    try {
      const response = await fetch(`/api/admin/chat-sessions/${currentSession.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to close session');
      }

      toast({
        title: "Session Closed",
        description: "Chat session has been resolved and closed"
      });

      // Go back to session list after closing
      onSessionSelect?.("");

    } catch (error) {
      console.error('Error closing session:', error);
      toast({
        title: "Failed to Close",
        description: "Unable to close session",
        variant: "destructive"
      });
    }
  };

  const loadActiveSessions = async () => {
    try {
      console.log('Loading active chat sessions...');
      const response = await fetch('/api/admin/chat-sessions?' + Date.now(), {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const sessions = await response.json();
        console.log('Received sessions from API:', sessions);
        // API returns array directly, not wrapped in data.sessions
        const processedSessions = sessions.map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          lastActivity: new Date(session.lastActivity),
          messageCount: session.messages?.length || 0
        }));
        console.log('Processed sessions for display:', processedSessions);
        setActiveSessions(processedSessions);
      } else {
        console.error('Failed to load sessions, response status:', response.status);
      }
    } catch (error) {
      console.error('Error loading active sessions:', error);
      toast({
        title: "Connection Error",
        description: "Unable to load chat sessions",
        variant: "destructive"
      });
    }
  };

  // Removed polling - using WebSocket only for real-time updates;

  if (!sessionId) {
    // Show session list
    return (
      <div className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Customer Support Sessions
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {activeSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active support sessions</p>
                <p className="text-sm">Sessions will appear here when users request help</p>
                <button 
                  onClick={loadActiveSessions}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Refresh Sessions
                </button>
                <p className="text-xs mt-2">Debug: {activeSessions.length} sessions loaded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeSessions.map((session) => (
                  <Card 
                    key={session.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSessionSelect?.(session.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span className="font-medium">
                              {session.userEmail || 'Anonymous User'}
                            </span>
                            <Badge 
                              variant={session.status === 'active' ? 'default' : 'secondary'}
                            >
                              {session.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {session.messageCount} messages • Last activity: {' '}
                            {session.lastActivity.toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.isEscalated && (
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                          )}
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </div>
    );
  }

  // Show chat interface for selected session
  if (!currentSession) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onSessionSelect?.("")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            Loading Chat Session...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p className="text-muted-foreground">Loading conversation...</p>
            <p className="text-xs mt-2">Session ID: {sessionId}</p>
            <Button 
              onClick={() => sessionId && loadSession(sessionId)}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Retry Loading
            </Button>
          </div>
        </CardContent>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onSessionSelect?.("")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <User className="w-5 h-5" />
          {currentSession?.userEmail || 'Anonymous User'}
          <Badge variant={currentSession?.status === 'active' ? 'default' : 'secondary'}>
            {currentSession?.status}
          </Badge>
          <Badge variant={isConnected ? "default" : "destructive"} className="ml-auto">
            {isConnected ? "Live" : "Offline"}
          </Badge>
          {currentSession?.status !== 'resolved' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={closeSession}
              className="ml-2"
              title="Close and resolve this chat session"
            >
              <X className="w-4 h-4 mr-1" />
              Close
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 mb-4 max-h-96">
          <div className="space-y-4">
            {currentSession?.messages?.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 p-3 rounded-lg",
                  message.sender === 'admin' 
                    ? "bg-blue-50 dark:bg-blue-900/20 ml-12" 
                    : "bg-muted mr-12"
                )}
              >
                <div className="flex-shrink-0">
                  {message.sender === 'admin' ? (
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                  ) : (
                    <User className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                      {message.sender === 'admin' ? 'You' : 'Customer'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="flex gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your response..."
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={!isConnected || isSending}
          />
          <Button 
            onClick={sendMessage} 
            disabled={!inputText.trim() || !isConnected || isSending}
          >
            {isSending ? (
              <Clock className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {!isConnected && (
          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Connection lost. Messages will be sent when reconnected.
            </p>
          </div>
        )}
      </CardContent>
    </div>
  );
}