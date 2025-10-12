import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Home,
  Calendar,
  Users,
  ScanLine,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronLeft,
  Building2,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/ui/notification-bell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

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
    href: '/admin/events',
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
  const { user, member, isAuthenticated, logout } = useAuthStore();

  // Query organization profile for profile image (only for admins)
  const { data: profile } = useQuery<{ profileImage?: string }>({
    queryKey: ['/api/organization/profile'],
    enabled: user?.role === 'admin',
  });

  // Helper function to get the correct image URL
  const getProfileImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return undefined;
    // If it's already a full URL (Cloudinary), return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    // If it's a local path, add /uploads/ prefix if not already present
    if (imageUrl.startsWith('/uploads/')) {
      return imageUrl;
    }
    return `/uploads/${imageUrl}`;
  };

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
            <Link href={ROUTES.LANDING}>
              <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
                <Building2 className="h-6 w-6" />
                <span className="text-lg font-semibold">EventifyAI</span>
              </div>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link href={ROUTES.LANDING}>
              <Building2 className="h-6 w-6 mx-auto cursor-pointer hover:opacity-80 transition-opacity" />
            </Link>
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
          {/* Collapse Toggle - Desktop only */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center w-full p-2 rounded-lg hover:bg-blue-800/50 transition-colors"
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
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 px-3 py-2"
                    data-testid="button-user-profile"
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-gray-200 dark:ring-gray-700">
                      <AvatarImage
                        src={getProfileImageUrl(profile?.profileImage)}
                        alt="Profile"
                        className="object-cover object-center w-full h-full"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 text-blue-600 dark:text-blue-300">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-32">
                      {member ? `${member.firstName} ${member.lastName}` : user?.username}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <span className="w-full cursor-pointer" data-testid="menu-settings">Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/organization-profile">
                        <span className="w-full cursor-pointer" data-testid="menu-organization-profile">Organization Profile</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
