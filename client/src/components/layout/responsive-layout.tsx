import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  sidebarWidth?: 'sm' | 'md' | 'lg';
  layout?: 'default' | 'centered' | 'full-width';
}

/**
 * Responsive Layout Component
 * 
 * Provides a flexible layout system that adapts to different screen sizes
 * with proper mobile and desktop optimizations.
 */
export function ResponsiveLayout({
  children,
  className,
  sidebar,
  header,
  footer,
  sidebarWidth = 'md',
  layout = 'default'
}: ResponsiveLayoutProps) {
  const sidebarWidths = {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96'
  };

  const layoutClasses = {
    default: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    centered: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',
    'full-width': 'w-full px-2 sm:px-4'
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      {header && (
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className={layoutClasses[layout]}>
            {header}
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Sidebar - Hidden on mobile, visible on desktop */}
        {sidebar && (
          <>
            {/* Mobile Sidebar Overlay */}
            <div className="lg:hidden">
              {/* This would be controlled by a mobile menu state */}
            </div>
            
            {/* Desktop Sidebar */}
            <aside className={cn(
              "hidden lg:flex lg:flex-col lg:border-r lg:bg-card/50",
              sidebarWidths[sidebarWidth]
            )}>
              <div className="flex-1 overflow-y-auto p-4">
                {sidebar}
              </div>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className={cn(
            "flex-1 py-4",
            layout !== 'full-width' && (sidebar ? 'px-4 lg:px-8' : layoutClasses[layout]),
            layout === 'full-width' && 'px-2 sm:px-4',
            className
          )}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <footer className="border-t bg-card/50 mt-auto">
              <div className={layoutClasses[layout]}>
                {footer}
              </div>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
}

/**
 * Mobile-optimized Container Component
 */
interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function MobileContainer({ 
  children, 
  className, 
  padding = 'md' 
}: MobileContainerProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <div className={cn(
      "w-full mx-auto",
      paddingClasses[padding],
      // Mobile-first responsive padding
      "sm:px-6 md:px-8 lg:px-12",
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Grid Layout Component with responsive breakpoints
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveGrid({ 
  children, 
  columns = { default: 1, sm: 2, lg: 3 },
  gap = 'md',
  className 
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const gridColsClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6'
  };

  const getGridClasses = () => {
    const classes = ['grid', gapClasses[gap]];
    
    // Default columns
    classes.push(gridColsClasses[columns.default]);
    
    // Responsive columns
    if (columns.sm) classes.push(`sm:${gridColsClasses[columns.sm]}`);
    if (columns.md) classes.push(`md:${gridColsClasses[columns.md]}`);
    if (columns.lg) classes.push(`lg:${gridColsClasses[columns.lg]}`);
    if (columns.xl) classes.push(`xl:${gridColsClasses[columns.xl]}`);
    
    return classes.join(' ');
  };

  return (
    <div className={cn(getGridClasses(), className)}>
      {children}
    </div>
  );
}

/**
 * Card Component with responsive design
 */
interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export function ResponsiveCard({ 
  children, 
  className, 
  padding = 'md',
  hoverable = false 
}: ResponsiveCardProps) {
  const paddingClasses = {
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  };

  return (
    <div className={cn(
      "bg-card text-card-foreground border rounded-lg shadow-sm",
      paddingClasses[padding],
      hoverable && "transition-shadow hover:shadow-md",
      className
    )}>
      {children}
    </div>
  );
}