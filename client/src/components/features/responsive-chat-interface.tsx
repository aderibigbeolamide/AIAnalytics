import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  MessageCircle, 
  User, 
  Send, 
  RefreshCw, 
  Clock,
  ArrowLeft,
  X,
  Menu,
  Smartphone,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { EmojiPicker } from '../emoji-picker';
import { ChatLoadingSpinner } from '../chat-loading-spinner';
import { SupportPerformanceDashboard } from '../support-performance-dashboard';
import { TypingIndicator } from '../typing-indicator';
import { ResponsiveLayout, MobileContainer, ResponsiveCard } from '../layout/responsive-layout';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin' | 'bot';
  timestamp: string;
  type: string;
}

interface ChatSession {
  id: string;
  userEmail: string;
  status: 'active' | 'resolved' | 'pending';
  messages: Message[];
  createdAt: string;
  adminId?: string;
}

interface ResponsiveChatInterfaceProps {
  sessionId?: string;
  currentSession?: ChatSession;
  messages: Message[];
  onSessionSelect?: (sessionId: string) => void;
  onSendMessage: (text: string) => void;
  isConnected: boolean;
  isSending: boolean;
  isTyping: boolean;
  onCloseSession?: () => void;
  onRefreshSession?: () => void;
}

/**
 * Responsive Chat Interface Component
 * 
 * Optimized for both mobile and desktop experiences with:
 * - Mobile-first responsive design
 * - Touch-friendly interface elements
 * - Collapsible sidebar for performance dashboard
 * - Adaptive message layout
 * - Enhanced accessibility
 */
export function ResponsiveChatInterface({
  sessionId,
  currentSession,
  messages,
  onSessionSelect,
  onSendMessage,
  isConnected,
  isSending,
  isTyping,
  onCloseSession,
  onRefreshSession
}: ResponsiveChatInterfaceProps) {
  const [inputText, setInputText] = useState('');
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Check if mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim() || isSending || !isConnected) return;
    
    onSendMessage(inputText);
    setInputText('');
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Mobile Performance Dashboard
  const MobilePerformanceDashboard = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <BarChart3 className="w-4 h-4 mr-1" />
          Stats
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <div className="py-4">
          <SupportPerformanceDashboard />
        </div>
      </SheetContent>
    </Sheet>
  );

  // Message Component
  const MessageItem = ({ message }: { message: Message }) => (
    <div className={cn(
      "flex mb-4",
      message.sender === 'admin' ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-2 text-sm",
        message.sender === 'admin' 
          ? "bg-primary text-primary-foreground ml-auto" 
          : message.sender === 'bot'
          ? "bg-secondary text-secondary-foreground"
          : "bg-muted text-muted-foreground"
      )}>
        <div className="whitespace-pre-wrap break-words">
          {message.text}
        </div>
        <div className={cn(
          "text-xs mt-1 opacity-70",
          message.sender === 'admin' ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {format(new Date(message.timestamp), 'HH:mm')}
        </div>
      </div>
    </div>
  );

  if (!sessionId || !currentSession) {
    return (
      <MobileContainer className="h-full flex items-center justify-center">
        <ResponsiveCard className="text-center max-w-md mx-auto">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Session Selected</h3>
          <p className="text-muted-foreground">
            Select a chat session to start or continue a conversation.
          </p>
        </ResponsiveCard>
      </MobileContainer>
    );
  }

  return (
    <ResponsiveLayout
      layout="full-width"
      className="h-full"
      sidebar={!isMobileView && showPerformanceDashboard ? (
        <SupportPerformanceDashboard />
      ) : undefined}
      sidebarWidth="md"
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Back Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onSessionSelect?.("")}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            {/* User Info */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium truncate text-sm sm:text-base">
                  {currentSession.userEmail || 'Anonymous User'}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={currentSession.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {currentSession.status}
                  </Badge>
                  <Badge 
                    variant={isConnected ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {isConnected ? "Live" : "Offline"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefreshSession}
              title="Refresh messages"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            {/* Performance Dashboard Toggle */}
            {isMobileView ? (
              <MobilePerformanceDashboard />
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPerformanceDashboard(!showPerformanceDashboard)}
                title="Toggle performance dashboard"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            )}

            {/* Close Session Button */}
            {currentSession.status !== 'resolved' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onCloseSession}
                title="Close session"
                className="hidden sm:flex"
              >
                <X className="w-4 h-4 mr-1" />
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No messages yet</p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageItem key={message.id} message={message} />
                ))
              )}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start mb-4">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <TypingIndicator />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t bg-card p-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={handleKeyPress}
                  disabled={!isConnected || isSending || currentSession.status === 'resolved'}
                  className="pr-12"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                </div>
              </div>
              <Button 
                onClick={handleSendMessage} 
                disabled={!inputText.trim() || !isConnected || isSending || currentSession.status === 'resolved'}
                size={isMobileView ? "default" : "sm"}
              >
                {isSending ? (
                  <ChatLoadingSpinner variant="pulse" className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Connection Status */}
            {!isConnected && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Connection lost. Messages will be sent when reconnected.
                </p>
              </div>
            )}

            {/* Session Closed Status */}
            {currentSession.status === 'resolved' && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900/20 rounded-md">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  This session has been resolved. No new messages can be sent.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
}