import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user' | 'admin';
  timestamp: Date;
  type?: 'text' | 'quick_reply' | 'escalation';
}

interface ChatSession {
  id: string;
  userEmail?: string;
  isEscalated: boolean;
  adminId?: string;
  status: 'active' | 'resolved' | 'pending_admin';
  messages: Message[];
  createdAt: Date;
  lastActivity: Date;
}

export default function SuperAdminChat() {
  const { sessionId } = useParams();
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session?.messages]);

  useEffect(() => {
    if (sessionId) {
      loadChatSession();
      // Update admin heartbeat
      updateAdminHeartbeat();
      
      // Set up heartbeat interval
      const heartbeatInterval = setInterval(updateAdminHeartbeat, 60000); // Every minute
      
      return () => clearInterval(heartbeatInterval);
    }
  }, [sessionId]);

  const updateAdminHeartbeat = async () => {
    if (user?.id) {
      try {
        await fetch('/api/chatbot/admin-heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ adminId: user.id }),
        });
      } catch (error) {
        console.error('Failed to update heartbeat:', error);
      }
    }
  };

  const loadChatSession = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/chat-sessions/${sessionId}`);
      if (response.ok) {
        const sessionData = await response.json();
        // Convert timestamp strings back to Date objects
        sessionData.messages = sessionData.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        sessionData.createdAt = new Date(sessionData.createdAt);
        sessionData.lastActivity = new Date(sessionData.lastActivity);
        setSession(sessionData);
      } else {
        toast({
          title: "Error",
          description: "Chat session not found",
          variant: "destructive"
        });
        setLocation('/super-admin');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load chat session",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !sessionId || !user?.id) return;

    const messageText = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const response = await fetch(`/api/admin/chat-sessions/${sessionId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          adminId: user.id
        }),
      });

      if (response.ok) {
        // Add message to local state immediately for better UX
        if (session) {
          const newMessage: Message = {
            id: `msg_${Date.now()}`,
            text: messageText,
            sender: 'admin',
            timestamp: new Date(),
            type: 'text'
          };
          
          setSession(prev => prev ? {
            ...prev,
            messages: [...prev.messages, newMessage],
            lastActivity: new Date(),
            status: 'active'
          } : null);
        }
        
        toast({
          title: "Message Sent",
          description: "Your response has been sent to the user"
        });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      // Restore the input text
      setInputText(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const closeChat = async () => {
    if (!sessionId || !user?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/chat-sessions/${sessionId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId: user.id }),
      });

      if (response.ok) {
        toast({
          title: "Chat Closed",
          description: "The support session has been closed"
        });
        setLocation('/super-admin');
      } else {
        throw new Error('Failed to close chat');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to close chat session",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading chat session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Chat Session Not Found</h2>
          <p className="text-gray-600 mb-4">The requested chat session could not be found.</p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => window.history.back()}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Customer Support Chat</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {session.userEmail || 'Unknown user'}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Started {session.createdAt.toLocaleString()}
                </div>
                <Badge variant={session.status === 'active' ? 'default' : session.status === 'resolved' ? 'secondary' : 'outline'}>
                  {session.status}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={closeChat}
              disabled={session.status === 'resolved'}
            >
              Close Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 max-w-4xl mx-auto">
        <Card className="m-6 h-[calc(100vh-200px)]">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {session.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.sender === 'admin' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.sender !== 'admin' && (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs",
                      message.sender === 'bot' ? "bg-blue-600" : "bg-gray-600"
                    )}>
                      {message.sender === 'bot' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[70%] p-4 rounded-lg",
                      message.sender === 'admin' 
                        ? "bg-blue-600 text-white" 
                        : message.sender === 'user'
                        ? "bg-gray-100 text-gray-800"
                        : "bg-blue-50 text-blue-800 border border-blue-200"
                    )}
                  >
                    <div className="whitespace-pre-wrap">{message.text}</div>
                    <div className={cn(
                      "text-xs mt-2 opacity-70",
                      message.sender === 'admin' ? "text-blue-100" : "text-gray-500"
                    )}>
                      {message.sender === 'admin' ? 'You' : message.sender === 'user' ? 'User' : 'Bot'} • {' '}
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  
                  {message.sender === 'admin' && (
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {session.status !== 'resolved' && (
              <div className="border-t p-6">
                <div className="flex gap-3">
                  <Input
                    placeholder="Type your response to the user..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    disabled={isSending}
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!inputText.trim() || isSending}
                  >
                    {isSending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Your message will be sent directly to the user's chat interface.
                </p>
              </div>
            )}

            {session.status === 'resolved' && (
              <div className="border-t p-6 bg-gray-50">
                <div className="text-center text-gray-600">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="font-medium">Chat session has been closed</p>
                  <p className="text-sm">This support conversation has ended.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}