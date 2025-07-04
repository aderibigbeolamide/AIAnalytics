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

function Router() {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/register/:id" component={EventRegistration} />
      <Route path="/report/:eventId" component={Report} />
      
      {/* Protected routes */}
      {!isAuthenticated ? (
        <Route component={Login} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/members" component={Members} />
          <Route path="/events" component={Events} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/reports" component={Reports} />
          <Route path="/events/:id" component={EventDetail} />
          <Route path="/scanner" component={Scanner} />
          <Route component={NotFound} />
        </>
      )}
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
