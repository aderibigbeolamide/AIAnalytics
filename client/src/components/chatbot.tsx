import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Phone, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Minimize2,
  Maximize2
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
  userId?: string;
  userEmail?: string;
  isEscalated: boolean;
  adminId?: string;
  status: 'active' | 'resolved' | 'pending_admin';
  messages: Message[];
  createdAt: Date;
  lastActivity: Date;
}

const KNOWLEDGE_BASE = {
  greetings: [
    "hello", "hi", "hey", "good morning", "good afternoon", "good evening"
  ],
  organization_keywords: [
    "organization", "company", "business", "admin", "manage", "create event", 
    "host event", "setup", "register organization"
  ],
  user_keywords: [
    "register", "attend", "validate", "qr code", "event", "ticket", 
    "registration", "join event"
  ],
  features_keywords: [
    "features", "what can", "how does", "capabilities", "functionality"
  ],
  navigation_keywords: [
    "navigate", "how to use", "guide", "help", "tutorial", "steps"
  ],
  payment_keywords: [
    "payment", "pay", "cost", "price", "fee", "billing", "subscription"
  ]
};

const PREDEFINED_RESPONSES = {
  greeting: "Hello! Welcome to EventValidate! 👋 I'm here to help you understand our platform. Are you:\n\n🏢 An organization looking to manage events?\n👤 A user wanting to register for events?\n❓ Looking for general information about our features?",
  
  organization_help: "Great! EventValidate helps organizations manage events efficiently. Here's what you can do:\n\n✅ Create and manage events\n✅ Set up QR code validation\n✅ Track member registrations\n✅ Handle payments through Paystack\n✅ Generate attendance reports\n✅ Multi-tenant organization support\n\nWould you like me to guide you through:\n• Organization registration\n• Creating your first event\n• Setting up payment processing",
  
  user_help: "Perfect! As a user, you can easily participate in events. Here's how:\n\n✅ Find events on our public listings\n✅ Register for events using QR codes or direct links\n✅ Upload required documents (ID, photos)\n✅ Make payments for paid events\n✅ Get your personal QR code for event entry\n✅ Track your registered events\n\nWould you like help with:\n• Finding events\n• Registration process\n• Payment assistance",
  
  features_overview: "EventValidate offers comprehensive event management:\n\n🎯 **For Organizations:**\n• Multi-tenant event management\n• QR code generation and validation\n• Payment processing integration\n• Member database management\n• Real-time analytics and reporting\n\n👥 **For Users:**\n• Easy event discovery\n• Quick registration process\n• Secure payment options\n• Digital ticket management\n• Event reminders and updates",
  
  navigation_guide: "Here's how to navigate EventValidate:\n\n🏢 **Organizations:**\n1. Register your organization\n2. Complete admin verification\n3. Access your dashboard\n4. Create and manage events\n5. Monitor registrations\n\n👤 **Users:**\n1. Browse public events\n2. Click 'Register' or scan QR code\n3. Fill registration form\n4. Complete payment (if required)\n5. Get your validation QR code",
  
  payment_info: "EventValidate uses secure payment processing:\n\n💳 **Payment Methods:**\n• Online payments via Paystack\n• Manual payment verification\n• Organization-specific bank accounts\n\n🔒 **Security:**\n• End-to-end encryption\n• PCI compliant processing\n• Multi-tenant financial separation\n\n💰 **Pricing:**\n• Free for basic event management\n• Pro plans for advanced features\n• Pay-per-event options available",
  
  default_response: "I understand you're looking for help, but I might need to connect you with our support team for a more detailed answer. Would you like me to:\n\n📞 Forward your question to our customer support?\n📖 Show you our help documentation?\n🔍 Try rephrasing your question differently?"
};

export default function ChatbotComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [isEscalated, setIsEscalated] = useState(false);
  const [adminOnlineStatus, setAdminOnlineStatus] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize session
    const existingSessionId = localStorage.getItem('chatbot_session_id');
    const savedMessages = localStorage.getItem('chatbot_messages');
    
    if (existingSessionId && savedMessages) {
      setSessionId(existingSessionId);
      setMessages(JSON.parse(savedMessages));
    } else {
      const newSessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('chatbot_session_id', newSessionId);
      
      // Add welcome message
      const welcomeMessage: Message = {
        id: `msg_${Date.now()}`,
        text: PREDEFINED_RESPONSES.greeting,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages([welcomeMessage]);
    }

    // Check admin online status
    checkAdminStatus();
  }, []);

  useEffect(() => {
    // Save messages to localStorage
    if (messages.length > 0) {
      localStorage.setItem('chatbot_messages', JSON.stringify(messages));
    }
  }, [messages]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/chatbot/admin-status');
      if (response.ok) {
        const data = await response.json();
        setAdminOnlineStatus(data.isOnline);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const analyzeMessage = (text: string): string => {
    const lowerText = text.toLowerCase();
    
    // Check for greetings
    if (KNOWLEDGE_BASE.greetings.some(greeting => lowerText.includes(greeting))) {
      return 'greeting';
    }
    
    // Check for organization-related queries
    if (KNOWLEDGE_BASE.organization_keywords.some(keyword => lowerText.includes(keyword))) {
      return 'organization_help';
    }
    
    // Check for user-related queries
    if (KNOWLEDGE_BASE.user_keywords.some(keyword => lowerText.includes(keyword))) {
      return 'user_help';
    }
    
    // Check for features
    if (KNOWLEDGE_BASE.features_keywords.some(keyword => lowerText.includes(keyword))) {
      return 'features_overview';
    }
    
    // Check for navigation help
    if (KNOWLEDGE_BASE.navigation_keywords.some(keyword => lowerText.includes(keyword))) {
      return 'navigation_guide';
    }
    
    // Check for payment info
    if (KNOWLEDGE_BASE.payment_keywords.some(keyword => lowerText.includes(keyword))) {
      return 'payment_info';
    }
    
    return 'default_response';
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // If escalated, send to admin
    if (isEscalated) {
      await sendToAdmin(inputText.trim());
      setIsTyping(false);
      return;
    }

    // Simulate typing delay
    setTimeout(async () => {
      const responseType = analyzeMessage(inputText);
      const responseText = PREDEFINED_RESPONSES[responseType as keyof typeof PREDEFINED_RESPONSES];
      
      const botMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        text: responseText,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);

      // If default response, offer escalation
      if (responseType === 'default_response') {
        setTimeout(() => {
          const escalationMessage: Message = {
            id: `msg_${Date.now() + 2}`,
            text: "Would you like me to connect you with our customer support team?",
            sender: 'bot',
            timestamp: new Date(),
            type: 'quick_reply'
          };
          setMessages(prev => [...prev, escalationMessage]);
        }, 1000);
      }
    }, 1500);
  };

  const escalateToAdmin = async () => {
    if (!userEmail && !showEmailInput) {
      setShowEmailInput(true);
      return;
    }

    if (!userEmail) {
      toast({
        title: "Email Required",
        description: "Please provide your email for follow-up support",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/chatbot/escalate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userEmail,
          messages: messages.slice(-5), // Send last 5 messages for context
          adminOnlineStatus
        }),
      });

      if (response.ok) {
        setIsEscalated(true);
        setShowEmailInput(false);
        
        const statusMessage: Message = {
          id: `msg_${Date.now()}`,
          text: adminOnlineStatus 
            ? "🟢 Great! I've connected you with our customer support team. An admin is online and will respond shortly."
            : "🟡 I've forwarded your question to our customer support team. An admin will respond to your email once they're online. You can continue chatting here and they'll see your messages.",
          sender: 'bot',
          timestamp: new Date(),
          type: 'escalation'
        };
        
        setMessages(prev => [...prev, statusMessage]);
        
        toast({
          title: "Connected to Support",
          description: adminOnlineStatus ? "Admin is online and will respond soon" : "Your message has been forwarded to support",
        });
      } else {
        throw new Error('Failed to escalate');
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to support. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendToAdmin = async (message: string) => {
    try {
      const response = await fetch('/api/chatbot/send-to-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message,
          userEmail
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      // Poll for admin responses
      pollForAdminResponse();
    } catch (error) {
      toast({
        title: "Message Failed",
        description: "Unable to send message to support",
        variant: "destructive"
      });
    }
  };

  const pollForAdminResponse = async () => {
    try {
      const response = await fetch(`/api/chatbot/admin-response/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.hasNewMessages) {
          data.messages.forEach((msg: any) => {
            const adminMessage: Message = {
              id: `msg_${Date.now()}_${Math.random()}`,
              text: msg.text,
              sender: 'admin',
              timestamp: new Date(msg.timestamp),
              type: 'text'
            };
            setMessages(prev => [...prev, adminMessage]);
          });
        }
      }
    } catch (error) {
      console.error('Error polling for admin response:', error);
    }
    
    // Continue polling if escalated
    if (isEscalated) {
      setTimeout(pollForAdminResponse, 3000);
    }
  };

  const closeChat = () => {
    localStorage.removeItem('chatbot_session_id');
    localStorage.removeItem('chatbot_messages');
    setIsOpen(false);
    setMessages([]);
    setIsEscalated(false);
    setShowEmailInput(false);
    setUserEmail("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-2xl border",
      isMinimized ? "w-80 h-16" : "w-96 h-[600px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <div>
            <div className="font-semibold">EventValidate Support</div>
            {isEscalated && (
              <div className="text-xs flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  adminOnlineStatus ? "bg-green-400" : "bg-yellow-400"
                )} />
                {adminOnlineStatus ? "Admin Online" : "Admin Offline"}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:bg-blue-700 p-1"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeChat}
            className="text-white hover:bg-blue-700 p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto h-[480px] space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.sender === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.sender !== 'user' && (
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs",
                    message.sender === 'bot' ? "bg-blue-600" : "bg-green-600"
                  )}>
                    {message.sender === 'bot' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] p-3 rounded-lg text-sm",
                    message.sender === 'user' 
                      ? "bg-blue-600 text-white ml-auto" 
                      : message.sender === 'admin'
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-gray-100 text-gray-800"
                  )}
                >
                  <div className="whitespace-pre-wrap">{message.text}</div>
                  <div className={cn(
                    "text-xs mt-1 opacity-70",
                    message.sender === 'user' ? "text-blue-100" : "text-gray-500"
                  )}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Buttons */}
          {!isEscalated && messages.length > 1 && (
            <div className="px-4 py-2 border-t">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={escalateToAdmin}
                  disabled={isLoading}
                  className="text-xs"
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Contact Support
                </Button>
              </div>
            </div>
          )}

          {/* Email Input */}
          {showEmailInput && (
            <div className="p-4 border-t bg-gray-50">
              <div className="text-sm font-medium mb-2">Your Email (for follow-up)</div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="text-sm"
                />
                <Button
                  onClick={escalateToAdmin}
                  disabled={isLoading || !userEmail}
                  size="sm"
                >
                  Connect
                </Button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder={isEscalated ? "Message customer support..." : "Type your message..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!inputText.trim() || isTyping}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}