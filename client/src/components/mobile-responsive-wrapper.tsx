import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileResponsiveWrapperProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
  maxWidth?: 'full' | 'container' | 'screen';
}

export function MobileResponsiveWrapper({ 
  children, 
  className,
  padding = 'medium',
  maxWidth = 'container'
}: MobileResponsiveWrapperProps) {
  const paddingClasses = {
    none: '',
    small: 'px-2 py-2 sm:px-4 sm:py-4',
    medium: 'px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8',
    large: 'px-6 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-12'
  };

  const maxWidthClasses = {
    full: 'w-full',
    container: 'max-w-7xl mx-auto',
    screen: 'max-w-screen-2xl mx-auto'
  };

  return (
    <div className={cn(
      'min-h-screen w-full',
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-optimized grid component
interface MobileGridProps {
  children: ReactNode;
  cols?: '1' | '2' | '3' | '4';
  gap?: 'small' | 'medium' | 'large';
  className?: string;
}

export function MobileGrid({ 
  children, 
  cols = '2',
  gap = 'medium',
  className 
}: MobileGridProps) {
  const colClasses = {
    '1': 'grid-cols-1',
    '2': 'grid-cols-1 sm:grid-cols-2',
    '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  const gapClasses = {
    small: 'gap-2 md:gap-3',
    medium: 'gap-3 md:gap-4 lg:gap-6',
    large: 'gap-4 md:gap-6 lg:gap-8'
  };

  return (
    <div className={cn(
      'grid',
      colClasses[cols],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-friendly section header
interface MobileSectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function MobileSectionHeader({ 
  title, 
  subtitle, 
  action, 
  className 
}: MobileSectionHeaderProps) {
  return (
    <div className={cn(
      'flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4 md:mb-6',
      className
    )}>
      <div className="space-y-1">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm md:text-base text-gray-600">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

// Mobile-optimized stats card
interface MobileStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  className?: string;
}

export function MobileStatsCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  className 
}: MobileStatsCardProps) {
  return (
    <div className={cn(
      'bg-white rounded-lg border shadow-sm p-3 md:p-4 lg:p-6',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-medium text-gray-600 truncate">
            {title}
          </p>
          <p className="text-lg md:text-2xl lg:text-3xl font-bold text-gray-900">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs md:text-sm text-gray-500 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-2 flex items-center">
          <span className={cn(
            'text-xs md:text-sm font-medium',
            trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
          )}>
            {trend.direction === 'up' ? '+' : '-'}{Math.abs(trend.value)}%
          </span>
          <span className="text-xs md:text-sm text-gray-500 ml-1">
            from last period
          </span>
        </div>
      )}
    </div>
  );
}