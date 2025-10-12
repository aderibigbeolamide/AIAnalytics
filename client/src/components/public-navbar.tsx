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
        <div className="flex justify-between items-center h-16 w-full">
          <Link href="/">
            <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
              <img src="/logo.png" alt="EventifyAI Logo" className="h-8 w-auto" />
              <span className="ml-2 text-lg sm:text-xl font-bold text-gray-900 whitespace-nowrap">EventifyAI</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6 ml-auto">
            <Link href="/about">
              <span className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors cursor-pointer whitespace-nowrap">About</span>
            </Link>
            <Link href="/documentation">
              <span className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors cursor-pointer whitespace-nowrap">Documentation</span>
            </Link>
            <Link href="/">
              <span 
                className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap cursor-pointer"
                onClick={() => {
                  setTimeout(() => {
                    const eventsSection = document.getElementById('events');
                    if (eventsSection) {
                      eventsSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                }}
              >
                Events
              </span>
            </Link>
            <Link href="/">
              <span 
                className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap cursor-pointer"
                onClick={() => {
                  setTimeout(() => {
                    const featuresSection = document.getElementById('features');
                    if (featuresSection) {
                      featuresSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                }}
              >
                Features
              </span>
            </Link>
            <Link href="/">
              <span 
                className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap cursor-pointer"
                onClick={() => {
                  setTimeout(() => {
                    const pricingSection = document.getElementById('pricing');
                    if (pricingSection) {
                      pricingSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                }}
              >
                Pricing
              </span>
            </Link>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="sm" className="whitespace-nowrap">Dashboard</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm" className="whitespace-nowrap">Login</Button>
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
            <Link href="/">
              <span 
                className="block text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setTimeout(() => {
                    const eventsSection = document.getElementById('events');
                    if (eventsSection) {
                      eventsSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                }}
              >
                Events
              </span>
            </Link>
            <Link href="/">
              <span 
                className="block text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setTimeout(() => {
                    const featuresSection = document.getElementById('features');
                    if (featuresSection) {
                      featuresSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                }}
              >
                Features
              </span>
            </Link>
            <Link href="/">
              <span 
                className="block text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setTimeout(() => {
                    const pricingSection = document.getElementById('pricing');
                    if (pricingSection) {
                      pricingSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                }}
              >
                Pricing
              </span>
            </Link>
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