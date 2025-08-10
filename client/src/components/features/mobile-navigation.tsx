import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Menu, 
  X, 
  Home, 
  Calendar, 
  Users, 
  Settings, 
  MessageCircle,
  BarChart3,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  roles?: string[];
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: ['admin', 'super_admin', 'user']
  },
  {
    label: 'Events',
    href: '/events',
    icon: Calendar,
    roles: ['admin', 'super_admin', 'user']
  },
  {
    label: 'Members',
    href: '/members',
    icon: Users,
    roles: ['admin', 'super_admin']
  },
  {
    label: 'Support Chat',
    href: '/admin/chat',
    icon: MessageCircle,
    badge: 3, // This would come from real chat state
    roles: ['admin', 'super_admin']
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    roles: ['admin', 'super_admin']
  },
  {
    label: 'Notifications',
    href: '/notifications',
    icon: Bell,
    badge: 2, // This would come from real notification state
    roles: ['admin', 'super_admin', 'user']
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['admin', 'super_admin', 'user']
  }
];

/**
 * Mobile Navigation Component
 * 
 * Provides a mobile-optimized navigation experience with:
 * - Hamburger menu for mobile devices
 * - Touch-friendly navigation items
 * - Badge notifications
 * - Role-based navigation filtering
 */
export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuthStore();

  // Filter navigation items based on user role
  const filteredItems = navigationItems.filter(item => 
    !item.roles || item.roles.includes(user?.role || 'user')
  );

  const isActive = (href: string) => {
    return location === href || (href !== '/dashboard' && location.startsWith(href));
  };

  return (
    <>
      {/* Desktop Navigation - Hidden on mobile */}
      <nav className="hidden lg:flex lg:space-x-8">
        {filteredItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive(item.href) ? "default" : "ghost"}
              className="relative"
            >
              <item.icon className="w-4 h-4 mr-2" />
              {item.label}
              {item.badge && item.badge > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 px-1 min-w-[1.25rem] h-5"
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </Button>
          </Link>
        ))}
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Menu className="w-5 h-5" />
              {/* Show notification badge on menu icon if there are notifications */}
              {filteredItems.some(item => item.badge && item.badge > 0) && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </Button>
          </SheetTrigger>
          
          <SheetContent side="left" className="w-80 p-0">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Navigation</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 p-4">
                <div className="space-y-2">
                  {filteredItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive(item.href) ? "default" : "ghost"}
                        className={cn(
                          "w-full justify-start relative h-12",
                          isActive(item.href) && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        <item.icon className="w-5 h-5 mr-3" />
                        <span className="text-base">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <Badge 
                            variant={isActive(item.href) ? "secondary" : "destructive"}
                            className="ml-auto px-2 min-w-[1.5rem] h-6"
                          >
                            {item.badge > 99 ? '99+' : item.badge}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  ))}
                </div>
              </nav>

              {/* User Info */}
              {user && (
                <div className="border-t p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

/**
 * Bottom Navigation for Mobile
 * 
 * Provides quick access to main sections on mobile devices
 */
export function BottomNavigation() {
  const [location] = useLocation();
  const { user } = useAuthStore();

  const quickNavItems = navigationItems
    .filter(item => ['dashboard', 'events', 'admin/chat', 'notifications'].some(path => item.href.includes(path)))
    .filter(item => !item.roles || item.roles.includes(user?.role || 'user'))
    .slice(0, 4); // Limit to 4 items for mobile

  const isActive = (href: string) => {
    return location === href || (href !== '/dashboard' && location.startsWith(href));
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <nav className="flex items-center justify-around h-16 px-2">
        {quickNavItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center justify-center h-14 w-16 relative",
                isActive(item.href) && "text-primary"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 mb-1",
                isActive(item.href) && "text-primary"
              )} />
              <span className="text-xs leading-none">
                {item.label.split(' ')[0]} {/* First word only */}
              </span>
              {item.badge && item.badge > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 px-1 min-w-[1rem] h-4 text-xs"
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </Badge>
              )}
            </Button>
          </Link>
        ))}
      </nav>
    </div>
  );
}

/**
 * Breadcrumb Navigation
 * 
 * Shows current page location for better navigation context
 */
interface BreadcrumbProps {
  items: Array<{
    label: string;
    href?: string;
  }>;
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span>/</span>}
          {item.href ? (
            <Link href={item.href}>
              <Button variant="link" className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground">
                {item.label}
              </Button>
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}