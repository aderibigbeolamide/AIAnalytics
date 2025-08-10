import { cn } from '@/lib/utils';

interface ChatLoadingSpinnerProps {
  className?: string;
  variant?: 'dots' | 'pulse' | 'bounce';
}

export default function ChatLoadingSpinner({ className, variant = 'dots' }: ChatLoadingSpinnerProps) {
  if (variant === 'dots') {
    return (
      <div className={cn("flex space-x-1", className)}>
        <div className="flex space-x-1 animate-pulse">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className="w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
        <span className="text-sm text-muted-foreground animate-pulse">Sending...</span>
      </div>
    );
  }

  if (variant === 'bounce') {
    return (
      <div className={cn("flex items-center space-x-1", className)}>
        <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
        <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-red-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
        <span className="text-sm text-muted-foreground ml-2">Processing...</span>
      </div>
    );
  }

  return null;
}

// Typing indicator for when someone is typing
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center space-x-2 text-sm text-muted-foreground", className)}>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span>Support agent is typing...</span>
    </div>
  );
}