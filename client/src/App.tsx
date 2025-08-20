import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuthStore } from "./lib/auth";
import { useEffect, lazy } from "react";
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
import PaymentSuccess from "@/pages/payment-success";
import PaymentFailed from "@/pages/payment-failed";
import BuyTicket from "@/pages/buy-ticket";
import TicketDetail from "@/pages/ticket-detail";
import TicketScanner from "@/pages/ticket-scanner";
import BankAccountSetup from "@/pages/bank-account-setup";
import PlatformAnalytics from "@/pages/platform-analytics";
import SuperAdminDashboard from "@/pages/super-admin-dashboard";
import OrganizationRegistration from "@/pages/organization-registration";
import OrganizationRegister from "@/pages/organization-register";
import SuperAdminLogin from "@/pages/super-admin-login";
import OrganizationLogin from "@/pages/organization-login";
import OrganizationProfile from "@/pages/organization-profile";
import SuperAdminChat from "@/pages/super-admin-chat";
import EventTickets from "@/pages/event-tickets";
import EventRemindersPage from "@/pages/event-reminders";
import { FacialRecognitionDemo } from "@/pages/FacialRecognitionDemo";
import { AboutPage } from "@/pages/about";
import { DocumentationPage } from "@/pages/documentation";
import FaceRecognitionTestPage from "@/pages/face-recognition-test";

function Router() {
  const { isAuthenticated, checkAuth, loadFromStorage, initializeSessionManagement } = useAuthStore();
  
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
    
    // Initialize session management for mobile reliability
    initializeSessionManagement();
    
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
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/failed" component={PaymentFailed} />
      <Route path="/buy-ticket/:eventId" component={BuyTicket} />
      <Route path="/ticket/:ticketId" component={TicketDetail} />

      <Route path="/login" component={OrganizationLogin} />
      <Route path="/register" component={OrganizationRegister} />
      <Route path="/organization-register" component={OrganizationRegister} />
      <Route path="/super-admin-login" component={SuperAdminLogin} />
      <Route path="/register-organization" component={OrganizationRegistration} />
      
      {/* Root and landing route always go to landing page */}
      <Route path="/" component={LandingPage} />
      <Route path="/landing" component={LandingPage} />
      
      {/* Public information pages */}
      <Route path="/about" component={AboutPage} />
      <Route path="/documentation" component={DocumentationPage} />
      
      {/* Demo routes - accessible to everyone */}
      <Route path="/facial-recognition-demo" component={FacialRecognitionDemo} />
      <Route path="/face-recognition-test" component={FaceRecognitionTestPage} />
      
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
      <Route path="/bank-account-setup">
        <ProtectedRoute>
          <BankAccountSetup />
        </ProtectedRoute>
      </Route>
      <Route path="/organization-profile">
        <ProtectedRoute>
          <OrganizationProfile />
        </ProtectedRoute>
      </Route>
      <Route path="/platform-analytics">
        <ProtectedRoute>
          <PlatformAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin">
        <ProtectedRoute>
          <SuperAdminDashboard />
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
      <Route path="/events/:eventId/tickets">
        <ProtectedRoute>
          <EventTickets />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin-chat/:sessionId">
        <ProtectedRoute>
          <SuperAdminChat />
        </ProtectedRoute>
      </Route>
      <Route path="/event-reminders">
        <ProtectedRoute>
          <EventRemindersPage />
        </ProtectedRoute>
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
