import React from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Calendar, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  User,
  Menu,
  ScanLine
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { ThemeToggle } from '@/components/theme-toggle';
import { ROUTES } from '@/lib/constants/routes';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navigationItems: NavItem[] = [
  {
    href: ROUTES.DASHBOARD,
    label: 'Dashboard',
    icon: <Home className="h-4 w-4" />,
  },
  {
    href: ROUTES.EVENTS,
    label: 'Events',
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    href: ROUTES.MEMBERS,
    label: 'Members',
    icon: <Users className="h-4 w-4" />,
    roles: ['admin', 'super_admin'],
  },
  {
    href: ROUTES.SCANNER,
    label: 'Scanner',
    icon: <ScanLine className="h-4 w-4" />,
    roles: ['admin', 'super_admin'],
  },
  {
    href: ROUTES.ANALYTICS,
    label: 'Analytics',
    icon: <BarChart3 className="h-4 w-4" />,
    roles: ['admin', 'super_admin'],
  },
];

const superAdminItems: NavItem[] = [
  {
    href: ROUTES.SUPER_ADMIN_DASHBOARD,
    label: 'Super Admin',
    icon: <Settings className="h-4 w-4" />,
    roles: ['super_admin'],
  },
  {
    href: ROUTES.PLATFORM_ANALYTICS,
    label: 'Platform Analytics',
    icon: <BarChart3 className="h-4 w-4" />,
    roles: ['super_admin'],
  },
];

export const Navbar: React.FC = () => {
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  const getNavItems = () => {
    const baseItems = navigationItems.filter(item => 
      !item.roles || item.roles.includes(user.role)
    );

    if (user.role === 'super_admin') {
      return [...baseItems, ...superAdminItems];
    }

    return baseItems;
  };

  const getUserInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.username ? user.username.slice(0, 2).toUpperCase() : 'U';
  };

  const getRoleBadgeVariant = () => {
    switch (user.role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = () => {
    switch (user.role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'User';
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and primary navigation */}
          <div className="flex items-center">
            <Link href={ROUTES.DASHBOARD}>
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  EventifyAI
                </h1>
              </div>
            </Link>

            {/* Desktop navigation */}
            <div className="hidden md:ml-8 md:flex md:space-x-4">
              {getNavItems().map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      className="flex items-center space-x-2"
                      data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-8 w-8 rounded-full"
                  data-testid="user-menu-trigger"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} alt={user.username} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.username
                      }
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    <div className="flex items-center space-x-2 pt-1">
                      <Badge variant={getRoleBadgeVariant()}>
                        {getRoleLabel()}
                      </Badge>
                      {user.organization && (
                        <Badge variant="outline">
                          {user.organization.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild>
                  <Link href={ROUTES.PROFILE} className="w-full">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href={ROUTES.SETTINGS} className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                
                {user.role === 'admin' && user.organization && (
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.ORGANIZATION_PROFILE} className="w-full">
                      <User className="mr-2 h-4 w-4" />
                      <span>Organization Profile</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  className="text-red-600 dark:text-red-400"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button variant="ghost" size="icon" data-testid="mobile-menu-toggle">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation menu - you can expand this as needed */}
      <div className="md:hidden">
        {/* Add mobile menu implementation here if needed */}
      </div>
    </nav>
  );
};