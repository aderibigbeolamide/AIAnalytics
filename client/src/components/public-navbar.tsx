import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useAuthStore } from "@/lib/auth";

export function PublicNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();

  return (
    <nav className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/">
            <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="EventValidate Logo" className="h-10 w-auto" />
              <span className="ml-2 text-xl font-bold text-gray-900">EventValidate</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/about">
              <span className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer">About</span>
            </Link>
            <Link href="/documentation">
              <span className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer">Documentation</span>
            </Link>
            <a href="/#events" className="text-gray-600 hover:text-gray-900 transition-colors">Events</a>
            <a href="/#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="/#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">Login</Button>
              </Link>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile navigation menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-sm">
          <div className="px-4 py-3 space-y-3">
            <Link href="/about">
              <span 
                className="block text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </span>
            </Link>
            <Link href="/documentation">
              <span 
                className="block text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Documentation
              </span>
            </Link>
            <a 
              href="/#events" 
              className="block text-gray-600 hover:text-gray-900 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Events
            </a>
            <a 
              href="/#features" 
              className="block text-gray-600 hover:text-gray-900 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </a>
            <a 
              href="/#pricing" 
              className="block text-gray-600 hover:text-gray-900 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </a>
            <div className="pt-2 border-t border-gray-200">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="sm" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}