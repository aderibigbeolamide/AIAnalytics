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
  type?: 'text' | 'quick_reply' | 'escalation' | 'quick_actions';
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
    "hello", "hi", "hey", "good morning", "good afternoon", "good evening", "help"
  ],
  organization_keywords: [
    "organization", "company", "business", "admin", "manage", "create event", 
    "host event", "setup", "register organization", "org", "organize"
  ],
  user_keywords: [
    "register", "attend", "validate", "qr code", "event", "ticket", 
    "registration", "join event", "buy ticket", "purchase"
  ],
  features_keywords: [
    "features", "what can", "how does", "capabilities", "functionality", 
    "explore", "tour", "overview"
  ],
  navigation_keywords: [
    "navigate", "how to use", "guide", "help", "tutorial", "steps",
    "get started", "begin"
  ],
  payment_keywords: [
    "payment", "pay", "cost", "price", "fee", "billing", "subscription",
    "money", "charge", "bank"
  ],
  validation_keywords: [
    "validate", "validation", "verify", "check in", "attendance", "entry"
  ],
  ticket_keywords: [
    "ticket", "buy", "purchase", "booking", "reserve"
  ]
};

const PREDEFINED_RESPONSES = {
  greeting: "Hello! Welcome to EventValidate! 👋 I'm here to help you understand our platform. Choose what you need help with:\n\n🏢 Organization registration and management\n🎫 Event registration and validation\n🎟️ Buying tickets for events\n💳 Payment and billing questions\n🔍 Exploring platform features\n📞 Speaking with customer support",
  
  organization_help: "Great! EventValidate helps organizations manage events efficiently. Here's what you can do:\n\n✅ Register your organization\n✅ Create and manage events\n✅ Set up QR code validation\n✅ Track member registrations\n✅ Handle payments through Paystack\n✅ Generate attendance reports\n✅ Multi-tenant organization support\n\nWould you like me to guide you through:\n• Organization registration process\n• Creating your first event\n• Setting up payment processing\n• Managing members and registrations",
  
  user_help: "Perfect! As a user, you can easily participate in events. Here's how:\n\n✅ Find events on our public listings\n✅ Register for events using QR codes or direct links\n✅ Upload required documents (ID, photos)\n✅ Make payments for paid events\n✅ Get your personal QR code for event entry\n✅ Track your registered events\n\nWould you like help with:\n• Finding and joining events\n• Registration process step-by-step\n• Validation and QR codes\n• Payment assistance",
  
  features_overview: "EventValidate offers comprehensive event management:\n\n🎯 **For Organizations:**\n• Multi-tenant event management\n• QR code generation and validation\n• Payment processing integration\n• Member database management\n• Real-time analytics and reporting\n• AI-powered features (seat availability, recommendations)\n\n👥 **For Users:**\n• Easy event discovery\n• Quick registration process\n• Secure payment options\n• Digital ticket management\n• Event reminders and updates\n• Personalized event recommendations",
  
  navigation_guide: "Here's how to navigate EventValidate:\n\n🏢 **Organizations:**\n1. Register your organization on the landing page\n2. Wait for admin approval\n3. Login to your organization dashboard\n4. Create and manage events\n5. Monitor registrations and payments\n\n👤 **Users:**\n1. Browse public events on the homepage\n2. Click 'Register' or scan QR code\n3. Fill registration form with your details\n4. Complete payment (if required)\n5. Get your validation QR code\n6. Present QR code at event for validation",
  
  payment_info: "EventValidate uses secure payment processing:\n\n💳 **Payment Methods:**\n• Online payments via Paystack (Nigeria's leading payment processor)\n• Manual payment verification at events\n• Organization-specific bank accounts for direct payments\n\n🔒 **Security:**\n• Bank-level encryption\n• PCI compliant processing\n• Multi-tenant financial separation\n• No card details stored on our servers\n\n💰 **Pricing:**\n• Free for basic event management\n• Pro plans for advanced features\n• Pay-per-event options available\n• Competitive transaction fees",
  
  default_response: "I understand you're looking for help, but I might need to connect you with our support team for a more detailed answer. Would you like me to:\n\n📞 Forward your question to our customer support?\n📖 Show you our help documentation?\n🔍 Try rephrasing your question differently?\n\nOur support team can help with specific account issues, technical problems, and detailed guidance.",

  quick_actions: {
    organization_register: "How do I register my organization?",
    create_event: "How do I create an event?", 
    user_register: "How do I register for an event?",
    buy_ticket: "How do I buy a ticket?",
    validate_event: "How do I validate myself for an event?",
    explore_features: "How can I explore the platform features?",
    payment_help: "How do payments work?",
    qr_validation: "How does QR code validation work?",
    contact_support: "I need to speak to someone"
  }
};

const QUICK_ACTION_RESPONSES = {
  organization_register: "To register your organization:\n\n1. Go to the EventValidate landing page\n2. Click 'Register Organization' button\n3. Fill in your organization details (name, contact info, etc.)\n4. Submit the registration form\n5. Wait for super admin approval (usually 24-48 hours)\n6. Once approved, you'll receive login credentials\n7. Login and start creating events!\n\n📧 You'll get email notifications about your approval status.\n\nWould you like help with any specific step?",
  
  create_event: "Creating an event is easy:\n\n1. Login to your organization dashboard\n2. Click 'Events' in the sidebar menu\n3. Click 'Create Event' button\n4. Choose between:\n   • Registration Event (traditional with validation)\n   • Ticket Event (simplified ticket purchasing)\n5. Fill in event details (name, date, location, description)\n6. Set up payment options if needed\n7. Configure registration requirements\n8. Publish your event\n\n✅ Your event will appear in public listings immediately!\n\nNeed help with event configuration?",
  
  user_register: "To register for an event:\n\n1. Browse events on the homepage or public event listings\n2. Find an event you want to attend\n3. Click 'Register' button or scan the event QR code\n4. Fill in the registration form with:\n   • Your name\n   • Contact information\n   • Required documents/photos if needed\n5. Complete payment if the event requires it\n6. Get your personal QR code for event entry\n7. Save or print your QR code\n8. Present it at the event for validation\n\n📱 You can also track all your events in 'My Events' section!\n\nAny questions about the registration process?",

  buy_ticket: "To buy tickets for an event:\n\n1. Browse available events on our homepage\n2. Look for events with purple 'Buy Ticket' buttons\n3. Click 'Buy Ticket' on the event you want\n4. Select your ticket category (Regular, VIP, etc.)\n5. Fill in your contact information\n6. Choose payment method:\n   • Online payment via Paystack\n   • Manual payment at the event\n7. Complete the payment process\n8. Get your digital ticket with QR code\n9. Download or save your ticket\n\n🎫 Your ticket contains all event details and validation QR code!\n\nNeed help with ticket purchasing?",

  validate_event: "To validate yourself for an event:\n\n1. **After Registration:** You'll receive a personal QR code\n2. **At the Event:** Present your QR code to event staff\n3. **QR Scanning:** Staff will scan your code for instant validation\n4. **Manual Backup:** If QR fails, staff can validate using your ID number\n5. **Verification:** System checks your registration and payment status\n6. **Entry Granted:** Once validated, you're marked as attended\n\n🔐 **Security Features:**\n• Encrypted QR codes\n• Timestamp validation\n• Payment verification\n• Member database checking\n\nQuestions about the validation process?",

  explore_features: "EventValidate offers many powerful features:\n\n🏢 **For Organizations:**\n• Multi-tenant event management\n• QR code generation and validation\n• Payment processing via Paystack\n• Member database management\n• Real-time analytics and reporting\n• Bank account setup for direct payments\n• CSV member validation\n• Face recognition validation\n\n👥 **For Users:**\n• Easy event discovery and registration\n• Secure payment options\n• Digital ticket management\n• QR code validation\n• Event tracking in 'My Events'\n• AI-powered event recommendations\n\n🤖 **AI Features:**\n• Seat availability heatmaps\n• Personalized event recommendations\n• Real-time occupancy tracking\n\nWant to learn more about any specific feature?",
  
  payment_help: "EventValidate payment system:\n\n💳 **Payment Methods:**\n• Secure online payments via Paystack (Nigeria's leading processor)\n• Manual payment verification at events\n• Organization-specific bank accounts for direct routing\n\n🔒 **Security:**\n• Bank-level encryption (256-bit SSL)\n• PCI compliant processing\n• No card details stored on our servers\n• Multi-tenant financial separation\n\n💰 **Fees:**\n• Transparent pricing\n• Competitive transaction fees\n• Organizations keep 98% of payments\n• Platform fee: 2% of successful transactions\n\n🏦 **For Organizations:**\n• Setup your own bank account for direct payments\n• Real-time payment tracking\n• Automated payment confirmations\n\nNeed help with a specific payment?",
  
  qr_validation: "QR code validation process:\n\n📱 **Two Types of QR Codes:**\n1. **Event QR Code:** Links to registration page (displayed in dashboards)\n2. **Personal QR Code:** Generated after successful registration\n\n🔍 **Validation Process:**\n1. User registers for event\n2. System generates encrypted personal QR code\n3. At event, admin scans personal QR code\n4. System validates registration, payment, and eligibility\n5. Entry granted or denied based on validation\n\n🔒 **Security Features:**\n• Encrypted data with timestamp validation\n• Payment status verification\n• Member database cross-checking\n• CSV validation (if enabled)\n• Face recognition backup (optional)\n\n🛡️ **Backup Methods:**\n• Manual ID number validation\n• Name-based lookup\n• Phone number verification\n\nQuestions about QR scanning or validation?",
  
  contact_support: "I'll connect you with our customer support team right away! They can help with:\n\n• Account and login issues\n• Technical problems and bugs\n• Payment and billing questions\n• Event management guidance\n• Feature requests and feedback\n• Organization approval status\n• API and integration support\n\n📧 Please provide your email address so our support team can follow up with you directly. This ensures you get personalized help even after this chat ends.\n\n⏰ **Response Times:**\n• Online admin: Immediate response\n• Offline admin: Within 24 hours via email"
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
  const chatRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !sessionId) {
      // Generate session ID and initialize welcome message only if no existing messages
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('chatbot_session_id', newSessionId);
      
      // Only show welcome messages if no existing chat history
      if (messages.length === 0) {
        const welcomeMessage: Message = {
          id: `msg_${Date.now()}`,
          text: "👋 Hi! How can we help?",
          sender: 'bot',
          timestamp: new Date(),
          type: 'text'
        };
        
        const faqMessage: Message = {
          id: `msg_${Date.now() + 1}`,
          text: "Here are some quick help options:",
          sender: 'bot',
          timestamp: new Date(),
          type: 'text'
        };
        
        const quickActionsMessage: Message = {
          id: `msg_${Date.now() + 2}`,
          text: "", // Empty text as we'll use the type to render buttons
          sender: 'bot',
          timestamp: new Date(),
          type: 'quick_actions'
        };
        
        setMessages([welcomeMessage, faqMessage, quickActionsMessage]);
      }
      
      // Check admin status
      checkAdminStatus();
      
      // Set up periodic admin status checks
      const statusInterval = setInterval(checkAdminStatus, 30000); // Check every 30 seconds
      return () => clearInterval(statusInterval);
    }
  }, [isOpen, sessionId, messages.length]);

  useEffect(() => {
    // Initialize session and restore chat history on component mount
    const existingSessionId = localStorage.getItem('chatbot_session_id');
    const savedMessages = localStorage.getItem('chatbot_messages');
    const savedEscalationState = localStorage.getItem('chatbot_escalated');
    const savedUserEmail = localStorage.getItem('chatbot_user_email');
    
    if (existingSessionId) {
      setSessionId(existingSessionId);
    }
    
    // Restore chat history if it exists
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
      } catch (error) {
        console.error('Error parsing saved messages:', error);
      }
    }
    
    // Restore escalation state
    if (savedEscalationState === 'true') {
      setIsEscalated(true);
    }
    
    // Restore user email
    if (savedUserEmail) {
      setUserEmail(savedUserEmail);
    }
    
    // Check admin online status
    checkAdminStatus();
  }, []);

  // Connect to WebSocket when escalated for real-time messaging
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const connectWebSocket = () => {
    if (wsRef.current) return; // Already connected
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('Customer WebSocket connected');
        setWsConnected(true);
        
        // Join as user
        if (sessionId) {
          wsRef.current?.send(JSON.stringify({
            type: 'join_user_session',
            data: { 
              sessionId,
              userEmail
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
        console.log('Customer WebSocket disconnected');
        setWsConnected(false);
        wsRef.current = null;
        
        // Try to reconnect after 2 seconds if escalated
        if (isEscalated) {
          setTimeout(() => {
            connectWebSocket();
          }, 2000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Customer WebSocket error:', error);
        setWsConnected(false);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  };

  const handleWebSocketMessage = (message: any) => {
    const { type, data } = message;
    
    switch (type) {
      case 'connected':
        console.log('Customer WebSocket connection confirmed');
        break;
      
      case 'admin_message':
        // Real-time admin message
        const adminMessage: Message = {
          id: data.id || `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: data.text,
          sender: 'admin',
          timestamp: new Date(data.timestamp),
          type: 'text'
        };
        
        setMessages(prev => [...prev, adminMessage]);
        break;
      
      case 'session_data':
        // Session data update
        if (data.messages && data.messages.length > 0) {
          const newMessages = data.messages.map((msg: any): Message => ({
            id: msg.id,
            text: msg.text,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp),
            type: msg.type || 'text'
          }));
          setMessages(newMessages);
        }
        break;
    }
  };

  useEffect(() => {
    if (isEscalated && sessionId) {
      connectWebSocket();
      
      return () => {
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      };
    }
  }, [isEscalated, sessionId]);

  useEffect(() => {
    // Save messages to localStorage
    if (messages.length > 0) {
      localStorage.setItem('chatbot_messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Save escalation state to localStorage
  useEffect(() => {
    localStorage.setItem('chatbot_escalated', isEscalated.toString());
  }, [isEscalated]);

  // Save user email to localStorage
  useEffect(() => {
    if (userEmail) {
      localStorage.setItem('chatbot_user_email', userEmail);
    }
  }, [userEmail]);

  // Save session ID to localStorage
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('chatbot_session_id', sessionId);
    }
  }, [sessionId]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Click outside to close chatbot
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node) && isOpen && !isMinimized) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMinimized]);

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
    
    // Check for specific question patterns first
    if (lowerText.includes('buy ticket') || lowerText.includes('purchase ticket') || KNOWLEDGE_BASE.ticket_keywords.some(keyword => lowerText.includes(keyword))) {
      return 'buy_ticket';
    }
    
    if (lowerText.includes('validate') || lowerText.includes('validation') || KNOWLEDGE_BASE.validation_keywords.some(keyword => lowerText.includes(keyword))) {
      return 'validate_event';
    }
    
    if (lowerText.includes('register organization') || lowerText.includes('register my org')) {
      return 'organization_register';
    }
    
    if (lowerText.includes('create event') || lowerText.includes('make event')) {
      return 'create_event';
    }
    
    if (lowerText.includes('register for') || lowerText.includes('join event')) {
      return 'user_register';
    }
    
    if (lowerText.includes('explore') || lowerText.includes('features') || lowerText.includes('what can')) {
      return 'explore_features';
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

  const handleQuickAction = (actionKey: string) => {
    // Add user message for the quick action
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      text: PREDEFINED_RESPONSES.quick_actions[actionKey as keyof typeof PREDEFINED_RESPONSES.quick_actions],
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => {
      // Remove quick_actions message and add user message
      const filteredMessages = prev.filter(msg => msg.type !== 'quick_actions');
      return [...filteredMessages, userMessage];
    });
    setIsTyping(true);

    // Handle contact support specially
    if (actionKey === 'contact_support') {
      setTimeout(() => {
        const botMessage: Message = {
          id: `msg_${Date.now() + 1}`,
          text: QUICK_ACTION_RESPONSES[actionKey as keyof typeof QUICK_ACTION_RESPONSES],
          sender: 'bot',
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
        
        // Auto-trigger escalation for contact support
        setTimeout(() => {
          if (!userEmail) {
            setShowEmailInput(true);
          } else {
            escalateToAdmin();
          }
        }, 1000);
      }, 1500);
      return;
    }

    // Regular quick action response
    setTimeout(() => {
      const botMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        text: QUICK_ACTION_RESPONSES[actionKey as keyof typeof QUICK_ACTION_RESPONSES],
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
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
    const currentInput = inputText.trim();
    setInputText("");
    setIsTyping(true);

    // If escalated, send to admin
    if (isEscalated) {
      await sendToAdmin(currentInput);
      setIsTyping(false);
      return;
    }

    try {
      // Send to AI-powered backend
      const response = await fetch('/api/chatbot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          sessionId: sessionId,
          conversationHistory: messages.slice(-10) // Send last 10 messages for context
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        const botMessage: Message = {
          id: `msg_${Date.now() + 1}`,
          text: data.response,
          sender: 'bot',
          timestamp: new Date(),
          type: 'text'
        };

        setMessages(prev => [...prev, botMessage]);

        // Add suggested actions if provided
        if (data.suggestedActions && data.suggestedActions.length > 0) {
          const suggestionsMessage: Message = {
            id: `msg_${Date.now() + 2}`,
            text: `Here are some helpful suggestions: ${data.suggestedActions.join(', ')}`,
            sender: 'bot',
            timestamp: new Date(),
            type: 'quick_reply'
          };
          
          setTimeout(() => {
            setMessages(prev => [...prev, suggestionsMessage]);
          }, 500);
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback to local response
      const responseType = analyzeMessage(currentInput);
      
      let responseText: string;
      if (QUICK_ACTION_RESPONSES[responseType as keyof typeof QUICK_ACTION_RESPONSES]) {
        responseText = QUICK_ACTION_RESPONSES[responseType as keyof typeof QUICK_ACTION_RESPONSES];
      } else if (PREDEFINED_RESPONSES[responseType as keyof Omit<typeof PREDEFINED_RESPONSES, 'quick_actions'>]) {
        responseText = PREDEFINED_RESPONSES[responseType as keyof Omit<typeof PREDEFINED_RESPONSES, 'quick_actions'>];
      } else {
        responseText = PREDEFINED_RESPONSES.default_response;
      }
      
      const botMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        text: responseText,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsTyping(false);
    }
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
      // Ensure sessionId exists
      const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!sessionId) {
        setSessionId(currentSessionId);
      }

      const response = await fetch('/api/chatbot/escalate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
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
        
        // Start polling for admin responses immediately
        setTimeout(pollForAdminResponse, 1000);
        
        toast({
          title: "Connected to Support",
          description: adminOnlineStatus ? "Admin is online and will respond soon" : "Your message has been forwarded to support",
        });
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to escalate');
      }
    } catch (error) {
      console.error('Escalation error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Unable to connect to support. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendToAdmin = async (message: string) => {
    try {
      if (wsRef.current && wsConnected) {
        // Send via WebSocket for real-time delivery
        wsRef.current.send(JSON.stringify({
          type: 'user_message',
          data: {
            sessionId,
            text: message,
            userEmail
          }
        }));
      } else {
        // Fallback to HTTP API
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
      }
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
        if (data.hasNewMessages && data.messages.length > 0) {
          const newAdminMessages = data.messages.map((msg: any): Message => ({
            id: msg.id || `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: msg.text || msg.message,
            sender: 'admin' as const,
            timestamp: new Date(msg.timestamp),
            type: 'text' as const
          }));
          
          // Only add messages that don't already exist
          setMessages(prev => {
            const existingMessageIds = prev.map(m => m.id);
            const trulyNewMessages = newAdminMessages.filter((msg: Message) => !existingMessageIds.includes(msg.id));
            
            if (trulyNewMessages.length > 0) {
              return [...prev, ...trulyNewMessages];
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error('Error polling for admin response:', error);
    }
    // Removed the setTimeout recursive call - now handled by setInterval in useEffect
  };

  const closeChat = () => {
    // Clear polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Clear all chat-related localStorage data
    localStorage.removeItem('chatbot_session_id');
    localStorage.removeItem('chatbot_messages');
    localStorage.removeItem('chatbot_escalated');
    localStorage.removeItem('chatbot_user_email');
    
    // Reset all state
    setIsOpen(false);
    setMessages([]);
    setSessionId("");
    setIsEscalated(false);
    setShowEmailInput(false);
    setUserEmail("");
  }

  const showHelpOptions = () => {
    const helpMessage: Message = {
      id: `msg_${Date.now()}`,
      text: "Here are the available help options:",
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    };
    
    const quickActionsMessage: Message = {
      id: `msg_${Date.now() + 1}`,
      text: "",
      sender: 'bot',
      timestamp: new Date(),
      type: 'quick_actions'
    };
    
    setMessages(prev => [...prev, helpMessage, quickActionsMessage]);
  };;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-16 w-16 sm:h-14 sm:w-14 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
        >
          <MessageCircle className="h-7 w-7 sm:h-6 sm:w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      ref={chatRef}
      className={cn(
        "fixed z-50 bg-white rounded-lg shadow-2xl border",
        // Mobile-first responsive design
        isMinimized 
          ? "bottom-4 right-4 w-80 h-16 sm:bottom-6 sm:right-6" 
          : "bottom-4 right-4 left-4 top-20 sm:bottom-6 sm:right-6 sm:left-auto sm:top-auto sm:w-96 sm:h-[500px] md:w-[420px] md:h-[550px] max-h-[80vh] flex flex-col"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-3 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-3 sm:gap-2">
          <Bot className="h-6 w-6 sm:h-5 sm:w-5" />
          <div>
            <div className="font-semibold text-base sm:text-sm">EventValidate Support</div>
            {isEscalated && (
              <div className="text-sm sm:text-xs flex items-center gap-1">
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
          <div className="flex-1 p-4 sm:p-3 overflow-y-auto space-y-4 sm:space-y-3 min-h-0 bg-gray-50">
            {messages.map((message) => (
              <div key={message.id}>
                {message.type === 'quick_actions' ? (
                  // Render quick action buttons inline
                  <div className="flex gap-2 justify-start mb-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="max-w-[85%]">
                      <div className="bg-gray-100 p-2 rounded-lg text-sm">
                        <div className="text-xs font-medium mb-2 text-gray-600">Choose what you need help with:</div>
                        <div className="grid grid-cols-1 gap-2 sm:gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction('organization_register')}
                            className="text-sm sm:text-xs h-9 sm:h-7 justify-start text-left w-full hover:bg-blue-50 transition-colors"
                          >
                            🏢 How to register my organization?
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction('user_register')}
                            className="text-xs h-7 justify-start text-left w-full"
                          >
                            🎫 How to register for an event?
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction('buy_ticket')}
                            className="text-xs h-7 justify-start text-left w-full"
                          >
                            🎟️ How to buy a ticket?
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction('validate_event')}
                            className="text-xs h-7 justify-start text-left w-full"
                          >
                            ✅ How to validate for an event?
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction('explore_features')}
                            className="text-xs h-7 justify-start text-left w-full"
                          >
                            🔍 How to explore platform features?
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction('contact_support')}
                            className="text-xs h-7 justify-start text-left w-full"
                          >
                            📞 Contact customer support
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs mt-1 opacity-70 text-gray-500">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Regular message rendering
                  <div
                    className={cn(
                      "flex gap-2 mb-4",
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
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )}
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

          {/* Contact Support Option for ongoing conversations */}
          {!isEscalated && messages.length > 2 && (
            <div className="px-4 py-2 border-t bg-gray-50">
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={escalateToAdmin}
                  disabled={isLoading}
                  className="text-xs"
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Need more help? Contact Support
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
          <div className="p-2 border-t bg-gray-50 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                placeholder={isEscalated ? "Message customer support..." : "Type your message..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={showHelpOptions}
                disabled={isTyping}
                className="px-2"
              >
                ?
              </Button>
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