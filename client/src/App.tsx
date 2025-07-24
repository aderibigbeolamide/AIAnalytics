import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuthStore } from "./lib/auth";
import { useEffect } from "react";
import { initGTM } from "../lib/gtm";
import { useGTM } from "../hooks/use-gtm";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Scanner from "@/pages/scanner";
import MyEvents from "@/pages/my-events";
import PublicEventDetail from "@/pages/public-event-detail";
import GuestLookup from "@/pages/guest-lookup";
import EventDetail from "@/pages/event-detail";
import EventRegistration from "@/pages/event-registration";
import NotFound from "@/pages/not-found";
import Members from "@/pages/members";
import Events from "@/pages/events";
import Analytics from "@/pages/analytics";
import Report from "@/pages/report";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Invitees from "@/pages/invitees";
import { LandingPage } from "@/pages/landing";
import { ProtectedRoute } from "@/components/protected-route";
import PaymentCallback from "@/pages/payment-callback";
import BuyTicket from "@/pages/buy-ticket";
import TicketDetail from "@/pages/ticket-detail";
import TicketScanner from "@/pages/ticket-scanner";

function Router() {
  const { isAuthenticated, checkAuth, loadFromStorage } = useAuthStore();
  
  // Track page views with Google Tag Manager
  useGTM();

  // Debug current URL
  useEffect(() => {
    const handleLocationChange = () => {
      console.log('Current URL:', window.location.pathname);
      console.log('Current hash:', window.location.hash);
      console.log('Current search:', window.location.search);
    };
    
    handleLocationChange(); // Log initial location
    window.addEventListener('popstate', handleLocationChange);
    
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    // First load from storage, then check if needed
    loadFromStorage();
    const currentState = useAuthStore.getState();
    console.log('Initial auth state after loading from storage:', currentState);
    
    // Only check auth via API if we have a token but need to validate it
    if (currentState.token && !currentState.isAuthenticated) {
      checkAuth();
    }
  }, []);

  console.log('Router - isAuthenticated:', isAuthenticated);

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/register/:id" component={EventRegistration} />
      <Route path="/report/:eventId" component={Report} />
      <Route path="/payment/callback" component={PaymentCallback} />
      <Route path="/buy-ticket/:eventId" component={BuyTicket} />
      <Route path="/ticket/:ticketId" component={TicketDetail} />
      <Route path="/login" component={Login} />
      
      {/* Root and landing route always go to landing page */}
      <Route path="/" component={LandingPage} />
      <Route path="/landing" component={LandingPage} />
      
      {/* Protected routes - only accessible to authenticated users */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/members">
        <ProtectedRoute>
          <Members />
        </ProtectedRoute>
      </Route>
      <Route path="/events">
        <ProtectedRoute>
          <Events />
        </ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute>
          <Analytics />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/invitees">
        <ProtectedRoute>
          <Invitees />
        </ProtectedRoute>
      </Route>
      <Route path="/my-events" component={MyEvents} />
      <Route path="/event-view/:id" component={PublicEventDetail} />
      <Route path="/guest-lookup" component={GuestLookup} />
      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/events/:eventId/scan-tickets">
        {(params) => {
          console.log('Ticket scanner route matched with params:', params);
          return (
            <ProtectedRoute>
              <TicketScanner />
            </ProtectedRoute>
          );
        }}
      </Route>
      <Route path="/events/:id">
        {(params) => {
          console.log('Event detail route matched with params:', params);
          return (
            <ProtectedRoute>
              <EventDetail />
            </ProtectedRoute>
          );
        }}
      </Route>
      <Route path="/scanner">
        <ProtectedRoute>
          <Scanner />
        </ProtectedRoute>
      </Route>
      
      {/* Fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize Google Tag Manager
  useEffect(() => {
    initGTM();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="eventvalidate-theme">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
