import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, X, Bot, User, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  actions?: Array<{
    label: string;
    action: string;
    url?: string;
  }>;
}

interface ChatbotProps {
  className?: string;
}

const EventValidateKnowledgeBase = {
  // Organization onboarding and setup
  organization: {
    keywords: ['organization', 'register organization', 'setup', 'onboard', 'create account', 'admin account'],
    responses: [
      {
        content: "To register your organization on EventValidate:\n\n1. **Visit the Landing Page** - Go to our homepage\n2. **Click 'Register Organization'** - Find this button on the main page\n3. **Fill Organization Details** - Provide business name, contact info, and description\n4. **Wait for Approval** - Super admin will review and approve your organization\n5. **Start Managing Events** - Once approved, login and create your first event\n\n**Features for Organizations:**\n• Create unlimited events\n• Manage member registrations\n• QR code validation system\n• Payment processing with Paystack\n• Real-time analytics dashboard",
        actions: [
          { label: "Register Organization", action: "navigate", url: "/landing" },
          { label: "View Pricing", action: "navigate", url: "/landing#pricing" }
        ]
      }
    ]
  },

  // User registration and validation
  userRegistration: {
    keywords: ['register for event', 'attend event', 'validation', 'qr code', 'validate myself', 'join event'],
    responses: [
      {
        content: "To register and validate for an event:\n\n**Finding Events:**\n1. **Browse Public Events** - Visit our event listings\n2. **Scan Event QR Code** - Use your phone camera\n3. **Search by Organization** - Find events by group name\n\n**Registration Process:**\n1. **Fill Registration Form** - Provide required details\n2. **Make Payment** (if required) - Secure online payment\n3. **Get Your QR Code** - Download your personal validation code\n4. **Attend the Event** - Show QR code for validation\n\n**Validation Methods:**\n• QR code scanning\n• Manual ID verification\n• Face recognition (if enabled)",
        actions: [
          { label: "Browse Events", action: "navigate", url: "/guest-lookup" },
          { label: "How Validation Works", action: "topic", url: "validation-process" }
        ]
      }
    ]
  },

  // Features and capabilities
  features: {
    keywords: ['features', 'what can', 'capabilities', 'what does', 'how does', 'functionality'],
    responses: [
      {
        content: "**EventValidate Key Features:**\n\n**For Organizations:**\n• 🎫 **Event Management** - Create registration & ticket-based events\n• 👥 **Member Database** - Import and manage member lists\n• 💳 **Payment Processing** - Integrated Paystack payments\n• 📊 **Analytics Dashboard** - Real-time event statistics\n• 🔔 **Notification System** - Instant messaging and alerts\n• 🏦 **Bank Integration** - Direct payments to your account\n\n**For Users:**\n• 📱 **Easy Registration** - Simple form-based signup\n• 🎟️ **Digital Tickets** - QR codes for validation\n• 💰 **Secure Payments** - Protected online transactions\n• ⚡ **Instant Validation** - Quick event entry\n• 🔍 **Event Discovery** - Find events by organization",
        actions: [
          { label: "See All Features", action: "navigate", url: "/landing#features" },
          { label: "Watch Demo", action: "topic", url: "demo" }
        ]
      }
    ]
  },

  // Pricing and plans
  pricing: {
    keywords: ['price', 'cost', 'plan', 'subscription', 'fee', 'payment', 'how much'],
    responses: [
      {
        content: "**EventValidate Pricing:**\n\n**💡 Starter Plan - FREE**\n• Up to 3 events per month\n• 50 members maximum\n• Basic QR validation\n• Email support\n\n**🚀 Pro Plan - ₦15,000/month**\n• Unlimited events\n• Unlimited members\n• Advanced validation (face recognition)\n• Payment processing\n• Priority support\n• Custom branding\n\n**🏢 Enterprise - Custom**\n• Multi-organization management\n• API access\n• White-label solution\n• Dedicated support\n• Custom integrations\n\n**Platform Fee:** 2% of transaction value for payment processing",
        actions: [
          { label: "View Full Pricing", action: "navigate", url: "/landing#pricing" },
          { label: "Contact Sales", action: "forward", url: "pricing-inquiry" }
        ]
      }
    ]
  },

  // Technical support
  technical: {
    keywords: ['error', 'not working', 'bug', 'problem', 'issue', 'help', 'support', 'technical'],
    responses: [
      {
        content: "**Technical Support Available:**\n\n**Common Issues & Solutions:**\n• **QR Code Not Scanning** - Ensure good lighting and steady hands\n• **Payment Failed** - Check card details and network connection\n• **Can't Login** - Verify username/password or contact admin\n• **Event Not Found** - Check if event is still active\n\n**Get Help:**\n• Check our FAQ section\n• Contact your organization admin\n• Report technical issues to super admin\n\n**For urgent technical issues, I'll forward your message to our super admin team for immediate assistance.**",
        actions: [
          { label: "Report Technical Issue", action: "forward", url: "technical-support" },
          { label: "Contact Admin", action: "forward", url: "admin-contact" }
        ]
      }
    ]
  },

  // Default welcome and navigation
  welcome: {
    keywords: ['hello', 'hi', 'help', 'start', 'welcome', 'guide'],
    responses: [
      {
        content: "👋 **Welcome to EventValidate!**\n\nI'm here to help you navigate our platform. Choose what you'd like to do:\n\n**🏢 For Organizations:**\n• Register your organization\n• Learn about event management\n• Understand pricing and features\n\n**👤 For Event Attendees:**\n• Find and register for events\n• Learn about validation process\n• Get help with attendance\n\n**❓ General Questions:**\n• Platform features and capabilities\n• Technical support\n• Pricing information\n\nWhat would you like to know more about?",
        actions: [
          { label: "I'm an Organization", action: "topic", url: "organization" },
          { label: "I want to attend an event", action: "topic", url: "userRegistration" },
          { label: "Show me features", action: "topic", url: "features" }
        ]
      }
    ]
  }
};

const ChatbotComponent: React.FC<ChatbotProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message when chatbot opens
      addBotMessage(EventValidateKnowledgeBase.welcome.responses[0]);
    }
  }, [isOpen]);

  const addBotMessage = (response: any) => {
    const botMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: response.content,
      timestamp: new Date(),
      actions: response.actions
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const addUserMessage = (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
  };

  const findBestResponse = (userInput: string): any => {
    const input = userInput.toLowerCase();
    
    // Check each knowledge base category
    for (const [category, data] of Object.entries(EventValidateKnowledgeBase)) {
      const keywords = data.keywords;
      const hasMatch = keywords.some(keyword => input.includes(keyword.toLowerCase()));
      
      if (hasMatch) {
        return data.responses[0];
      }
    }

    // If no match found, suggest forwarding to admin
    return {
      content: "I understand you have a specific question that I might not be able to answer completely. Let me forward your message to our super admin team who can provide you with detailed assistance.\n\n**Your question will be sent to the admin team, and they'll respond through the notification system when available.**\n\nIn the meantime, here are some common topics I can help with:",
      actions: [
        { label: "Forward to Admin", action: "forward", url: "general-inquiry" },
        { label: "Organization Setup", action: "topic", url: "organization" },
        { label: "Event Registration", action: "topic", url: "userRegistration" },
        { label: "Platform Features", action: "topic", url: "features" }
      ]
    };
  };

  const forwardToSuperAdmin = async (userQuestion: string, category: string) => {
    try {
      const response = await fetch('/api/super-admin/chatbot-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `**Chatbot Inquiry - ${category}**\n\nUser Question: "${userQuestion}"\n\nCategory: ${category}\nTimestamp: ${new Date().toLocaleString()}\n\nPlease respond to this user inquiry when available.`,
          type: 'chatbot_inquiry',
          metadata: {
            originalQuestion: userQuestion,
            category: category,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        toast({
          title: "Message Forwarded",
          description: "Your question has been sent to our admin team. They'll respond soon!",
        });
        
        addBotMessage({
          content: "✅ **Your message has been forwarded to our super admin team!**\n\nThey'll review your question and respond through the notification system. You can check for responses by:\n\n• Visiting our platform dashboard\n• Looking for notification updates\n• Checking back in a few hours\n\nIs there anything else I can help you with right now?",
          actions: [
            { label: "Visit Dashboard", action: "navigate", url: "/dashboard" },
            { label: "Browse Events", action: "navigate", url: "/guest-lookup" }
          ]
        });
      } else {
        throw new Error('Failed to forward message');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to forward message. Please try again or contact support directly.",
        variant: "destructive"
      });
      
      addBotMessage({
        content: "❌ **Sorry, I couldn't forward your message right now.**\n\nPlease try one of these alternatives:\n\n• Try again in a few moments\n• Contact support directly through our platform\n• Visit our help section for common questions",
        actions: [
          { label: "Try Again", action: "forward", url: "general-inquiry" },
          { label: "Visit Help", action: "navigate", url: "/landing#features" }
        ]
      });
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userQuestion = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message
    addUserMessage(userQuestion);

    // Simulate thinking time
    setTimeout(() => {
      const response = findBestResponse(userQuestion);
      addBotMessage(response);
      setIsLoading(false);
    }, 1000);
  };

  const handleActionClick = async (action: any) => {
    if (action.action === 'navigate' && action.url) {
      window.open(action.url, '_blank');
    } else if (action.action === 'topic') {
      const topicData = EventValidateKnowledgeBase[action.url as keyof typeof EventValidateKnowledgeBase];
      if (topicData) {
        addBotMessage(topicData.responses[0]);
      }
    } else if (action.action === 'forward') {
      const lastUserMessage = messages.filter(m => m.type === 'user').pop();
      if (lastUserMessage) {
        await forwardToSuperAdmin(lastUserMessage.content, action.url);
      }
    }
  };

  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      // Handle bold text
      const boldFormatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Handle bullet points
      const bulletFormatted = boldFormatted.replace(/^• /, '• ');
      
      return (
        <div key={index} className={line.startsWith('•') ? 'ml-2' : ''}>
          <span dangerouslySetInnerHTML={{ __html: bulletFormatted }} />
        </div>
      );
    });
  };

  if (!isOpen) {
    return (
      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-14 w-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      <Card className="w-80 sm:w-96 h-[500px] shadow-2xl border-0 bg-white dark:bg-gray-900">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <CardTitle className="text-lg">EventValidate Assistant</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Badge variant="secondary" className="w-fit bg-white/20 text-white border-0">
            Online • Ready to help
          </Badge>
        </CardHeader>

        <CardContent className="p-0 h-[380px] flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.type === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <div className={cn(
                    "max-w-[80%] rounded-lg p-3 text-sm",
                    message.type === 'user' 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  )}>
                    <div className="whitespace-pre-wrap">
                      {formatMessageContent(message.content)}
                    </div>
                    
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.actions.map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleActionClick(action)}
                            className="w-full justify-start text-xs"
                          >
                            {action.action === 'navigate' && <ExternalLink className="h-3 w-3 mr-1" />}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {message.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="ml-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything about EventValidate..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                size="sm"
                disabled={isLoading || !inputValue.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatbotComponent;