import { Bell, Menu, X, User } from "lucide-react";
import { useState } from "react";
// Logo image placed in public folder for proper asset handling
import { useAuthStore } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/ui/notification-bell";

export function Navbar() {
  const { user, member, logout } = useAuthStore();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Query organization profile for profile image (only for admins)
  const { data: profile } = useQuery<{ profileImage?: string }>({
    queryKey: ['/api/organization/profile'],
    enabled: user?.role === 'admin',
  });

  // Filter navigation items based on user role
  const getNavItems = () => {
    const baseItems = [
      { href: "/my-events", label: "My Events", roles: ["admin", "member", "guest", "invitee"] }
    ];

    const adminItems = [
      { href: "/dashboard", label: "Dashboard", roles: ["admin"] },
      { href: "/members", label: "Members", roles: ["admin"] },
      { href: "/events", label: "Events", roles: ["admin"] },
      { href: "/scanner", label: "Scan QR", roles: ["admin"] },
      { href: "/reports", label: "Reports", roles: ["admin"] },
    ];

    const superAdminItems = [
      { href: "/super-admin", label: "Super Admin", roles: ["super_admin"] },
    ];

    return [...baseItems, ...adminItems, ...superAdminItems].filter(item => 
      item.roles.includes(user?.role || 'guest')
    );
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    return location === href || (href === "/dashboard" && location === "/");
  };

  return (
    <nav className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo - Mobile Optimized */}
          <div className="flex items-center min-w-0">
            <Link href="/landing">
              <div className="flex-shrink-0 flex items-center cursor-pointer hover:opacity-80 transition-all duration-200">
                <img 
                  src="/logo.png" 
                  alt="EventValidate Logo" 
                  className="h-8 md:h-12 w-auto" 
                />
                <span className="ml-2 md:ml-3 text-lg md:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent truncate">
                  EventValidate
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="flex items-baseline space-x-2 lg:space-x-4">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
                      isActive(item.href)
                        ? "text-white bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 shadow-lg transform scale-105"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 dark:hover:from-gray-800 dark:hover:to-gray-700 hover:shadow-md"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
            <ThemeToggle />
            {user && <NotificationBell />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 dark:hover:from-gray-800 dark:hover:to-gray-700 rounded-xl transition-all duration-300 px-3 py-2">
                  <Avatar className="h-9 w-9 ring-2 ring-blue-100 dark:ring-blue-900">
                    <AvatarImage 
                      src={profile?.profileImage || undefined} 
                      alt="Profile"
                      className="object-cover object-center w-full h-full"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 text-blue-600 dark:text-blue-300">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-32">
                    {member ? `${member.firstName} ${member.lastName}` : user?.username}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user?.role === 'super_admin' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/super-admin">
                        <span className="w-full cursor-pointer">Super Admin</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/platform-analytics">
                        <span className="w-full cursor-pointer">Platform Revenue</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {user?.role === 'admin' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/bank-account-setup">
                        <span className="w-full cursor-pointer">Bank Account</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/organization-profile">
                        <span className="w-full cursor-pointer">Organization Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <span className="w-full cursor-pointer">Settings</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={logout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors cursor-pointer ${
                      isActive(item.href)
                        ? "text-primary bg-blue-50 dark:bg-blue-900/50"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
              {/* Mobile user section */}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex items-center px-3 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={profile?.profileImage || undefined} 
                      alt="Profile"
                      className="object-cover object-center w-full h-full"
                    />
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="ml-3 text-base font-medium text-gray-700 dark:text-gray-300">
                    {member ? `${member.firstName} ${member.lastName}` : user?.username}
                  </span>
                </div>
                {user?.role === 'admin' && (
                  <>
                    <Link href="/bank-account-setup">
                      <Button
                        variant="ghost"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full justify-start px-3 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      >
                        Bank Account
                      </Button>
                    </Link>
                    <Link href="/organization-profile">
                      <Button
                        variant="ghost"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full justify-start px-3 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      >
                        Organization Profile
                      </Button>
                    </Link>
                    <Link href="/settings">
                      <Button
                        variant="ghost"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full justify-start px-3 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      >
                        Settings
                      </Button>
                    </Link>
                  </>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start px-3 py-2 text-left text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
