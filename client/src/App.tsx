import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "./lib/auth";
import { useEffect } from "react";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Scanner from "@/pages/scanner";
import EventDetail from "@/pages/event-detail";
import EventRegistration from "@/pages/event-registration";
import NotFound from "@/pages/not-found";
import Members from "@/pages/members";
import Events from "@/pages/events";
import Analytics from "@/pages/analytics";
import Report from "@/pages/report";
import Reports from "@/pages/reports";
import { LandingPage } from "@/pages/landing";
import { ProtectedRoute } from "@/components/protected-route";

function Router() {
  const { isAuthenticated, checkAuth, loadFromStorage } = useAuthStore();

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
      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/events/:id">
        <ProtectedRoute>
          <EventDetail />
        </ProtectedRoute>
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
