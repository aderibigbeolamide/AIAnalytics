import { useState } from 'react';
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
  ScanLine,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  ChevronLeft,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { ROUTES } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';

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
    icon: <Home className="h-5 w-5" />,
  },
  {
    href: ROUTES.MY_EVENTS,
    label: 'My Events',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    href: ROUTES.EVENTS,
    label: 'Events',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    href: ROUTES.MEMBERS,
    label: 'Members',
    icon: <Users className="h-5 w-5" />,
    roles: ['admin', 'super_admin'],
  },
  {
    href: ROUTES.SCANNER,
    label: 'Scan QR',
    icon: <ScanLine className="h-5 w-5" />,
    roles: ['admin', 'super_admin'],
  },
  {
    href: ROUTES.REPORTS,
    label: 'Reports',
    icon: <FileText className="h-5 w-5" />,
    roles: ['admin', 'super_admin'],
  },
  {
    href: ROUTES.ANALYTICS,
    label: 'Analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ['admin', 'super_admin'],
  },
];

const superAdminItems: NavItem[] = [
  {
    href: ROUTES.SUPER_ADMIN_DASHBOARD,
    label: 'Super Admin',
    icon: <Settings className="h-5 w-5" />,
    roles: ['super_admin'],
  },
  {
    href: ROUTES.PLATFORM_ANALYTICS,
    label: 'Platform Analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ['super_admin'],
  },
];

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <div>{children}</div>;
  }

  const getNavItems = () => {
    const baseItems = navigationItems.filter(item => 
      !item.roles || item.roles.includes(user.role)
    );

    if (user.role === 'super_admin') {
      return [...baseItems, ...superAdminItems];
    }

    return baseItems;
  };

  const handleLogout = () => {
    logout();
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

  const isActive = (href: string) => location === href;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen bg-gradient-to-b from-blue-900 to-blue-950 text-white transition-all duration-300",
          sidebarCollapsed ? "w-20" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-blue-800">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-2">
              <Building2 className="h-6 w-6" />
              <span className="text-lg font-semibold">EventifyAI</span>
            </div>
          )}
          {sidebarCollapsed && (
            <Building2 className="h-6 w-6 mx-auto" />
          )}
          
          {/* Close button for mobile */}
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:bg-blue-800 rounded p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {getNavItems().map((item) => (
            <Link key={item.href} href={item.href}>
              <button
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                  isActive(item.href)
                    ? "bg-blue-800 text-white shadow-lg"
                    : "text-blue-100 hover:bg-blue-800/50 hover:text-white",
                  sidebarCollapsed && "justify-center"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-blue-800 p-4">
          {!sidebarCollapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-800/50 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} alt={user.username} />
                    <AvatarFallback className="bg-blue-700 text-white">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm font-medium truncate">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.username
                      }
                    </p>
                    <p className="text-xs text-blue-200 truncate">{getRoleLabel()}</p>
                  </div>
                </button>
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
                      <Building2 className="mr-2 h-4 w-4" />
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
          ) : (
            <button 
              onClick={() => setSidebarCollapsed(false)}
              className="w-full flex justify-center p-3 rounded-lg hover:bg-blue-800/50"
              title="Expand sidebar"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.username} />
                <AvatarFallback className="bg-blue-700 text-white">{getUserInitials()}</AvatarFallback>
              </Avatar>
            </button>
          )}

          {/* Collapse Toggle - Desktop only */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center w-full mt-2 p-2 rounded-lg hover:bg-blue-800/50 transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={cn(
              "h-5 w-5 transition-transform",
              sidebarCollapsed && "rotate-180"
            )} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Breadcrumb or Title */}
            <div className="flex-1 px-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getNavItems().find(item => item.href === location)?.label || 'Dashboard'}
              </h2>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
