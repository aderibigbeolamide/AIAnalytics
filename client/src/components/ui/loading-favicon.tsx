import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface LoadingFaviconProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  text?: string;
}

export function LoadingFavicon({ 
  className, 
  size = "md", 
  showText = false,
  text = "Loading..." 
}: LoadingFaviconProps) {
  const [rotation, setRotation] = useState(0);

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg", 
    xl: "text-xl",
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 45) % 360);
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div 
        className={cn(
          "transition-transform duration-150 ease-in-out",
          sizeClasses[size]
        )}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <img 
          src="/loading-favicon.png" 
          alt="Loading" 
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <p className={cn(
          "mt-2 text-gray-600 font-medium animate-pulse",
          textSizeClasses[size]
        )}>
          {text}
        </p>
      )}
    </div>
  );
}

// Enhanced loading spinner with favicon option
export function EnhancedLoadingSpinner({ 
  className, 
  size = "md",
  useFavicon = false,
  showText = false,
  text = "Loading..."
}: LoadingFaviconProps & { useFavicon?: boolean }) {
  if (useFavicon) {
    return (
      <LoadingFavicon 
        className={className}
        size={size}
        showText={showText}
        text={text}
      />
    );
  }

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base", 
    lg: "text-lg",
    xl: "text-xl",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div
        className={cn(
          "animate-spin border-2 border-current border-t-transparent rounded-full",
          sizeClasses[size]
        )}
        aria-label="Loading"
      />
      {showText && (
        <p className={cn(
          "mt-2 text-gray-600 font-medium animate-pulse",
          textSizeClasses[size]
        )}>
          {text}
        </p>
      )}
    </div>
  );
}