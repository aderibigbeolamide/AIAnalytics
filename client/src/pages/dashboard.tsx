import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Joyride, { STATUS, CallBackProps, Step } from "react-joyride";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Navbar } from "@/components/navbar";
import { MemberForm } from "@/components/member-form";
import { EventForm } from "@/components/event-form";
import { QRScanner } from "@/components/qr-scanner";

import { CountdownTimer } from "@/components/countdown-timer";
import { AuxiliaryBodyFilter } from "@/components/auxiliary-body-filter";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { 
  Users, 
  Calendar, 
  QrCode, 
  CheckCircle, 
  Plus, 
  UserPlus, 
  Edit, 
  Download,
  BarChart,
  UsersRound,
  Settings,
  Camera,
  Bot,
  Trash2,
  TrendingUp,
  Activity,
  Clock,
  HelpCircle
} from "lucide-react";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { StatusBadge } from "@/components/ui/status-badge";
// Removed LoadingCard import as it doesn't exist
import SeatHeatmap from "@/components/seat-heatmap";
import EventRecommendations from "@/components/event-recommendations";

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState("all");
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualValidationOpen, setManualValidationOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [currentView, setCurrentView] = useState<"overview" | "events" | "members">("overview");
  const [runTour, setRunTour] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const queryClient = useQueryClient();

  // Tour configuration
  const tourSteps: Step[] = [
    {
      target: '.tour-dashboard-welcome',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Welcome to Eventify AI Dashboard! 🎉</h3>
          <p>This guided tour will show you around your event management dashboard. You can create events, manage members, scan QR codes, and much more!</p>
        </div>
      ),
      placement: 'center',
    },
    {
      target: '.tour-stats-overview',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Overview Statistics 📊</h3>
          <p>Here you can see your key metrics at a glance - total events, members, registrations, and recent activity. This gives you a quick snapshot of your organization's performance.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.tour-navigation-tabs',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Navigation Tabs 🗂️</h3>
          <p>Switch between different views: Overview (statistics), Events (manage your events), and Members (manage your organization members). Each tab provides specific tools for that area.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.tour-quick-actions',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Quick Actions ⚡</h3>
          <p>These buttons let you quickly create new events, add members, or scan QR codes for validation. Use these for your most common tasks!</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.tour-events-section',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Recent Events 📅</h3>
          <p>View and manage your recent events here. You can see event status, registration counts, and quickly access event details or edit events.</p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '.tour-ai-features',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">AI-Powered Features 🤖</h3>
          <p>Eventify AI includes smart features like seat availability heatmaps and personalized event recommendations to help optimize your events and improve user experience.</p>
        </div>
      ),
      placement: 'top',
    }
  ];

  // Tour callback function
  const handleTourCallback = (data: CallBackProps) => {
    const { status, index, type } = data;
    
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
      setTourStepIndex(0);
      
      // Store that user has seen the tour
      localStorage.setItem('dashboard-tour-seen', 'true');
    } else if (type === 'step:after') {
      setTourStepIndex(index + 1);
    }
  };

  // Check if user should see tour on first visit
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('dashboard-tour-seen');
    if (!hasSeenTour) {
      // Show tour after a short delay to allow dashboard to load
      const timer = setTimeout(() => setRunTour(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats", {
        headers: getAuthHeaders(),
      });
      return response.json();
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const response = await fetch("/api/events", {
        headers: getAuthHeaders(),
      });
      return response.json();
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["/api/members", memberFilter, memberSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (memberFilter !== "all") params.append("auxiliaryBody", memberFilter);
      if (memberSearch) params.append("search", memberSearch);
      
      const response = await fetch(`/api/members?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      return response.json();
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: "bg-green-100 text-green-800",
      upcoming: "bg-blue-100 text-blue-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return statusMap[status as keyof typeof statusMap] || "bg-gray-100 text-gray-800";
  };

  const getAuxiliaryBodyBadge = (auxiliaryBody: string) => {
    // Generate consistent colors based on auxiliary body name
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800", 
      "bg-purple-100 text-purple-800",
      "bg-orange-100 text-orange-800",
      "bg-pink-100 text-pink-800",
      "bg-indigo-100 text-indigo-800",
      "bg-yellow-100 text-yellow-800",
      "bg-red-100 text-red-800",
    ];
    
    // Generate consistent color index based on string hash
    let hash = 0;
    for (let i = 0; i < auxiliaryBody.length; i++) {
      hash = auxiliaryBody.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };

  const deleteEvent = async (eventId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        toast({
          title: "Event Deleted",
          description: "The event has been successfully deleted.",
        });
        // Refetch events to update the UI
        queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      } else {
        toast({
          title: "Delete Failed",
          description: "Failed to delete the event. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while deleting the event.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-12">
        {/* Streamlined Header */}
        <div className="desktop-card mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Manage events and track attendance
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 tour-quick-actions">
              <Button 
                onClick={() => setIsEventModalOpen(true)} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-create-event"
              >
                <Plus className="h-4 w-4 mr-1" />
                Event
              </Button>
              <Button 
                onClick={() => setIsMemberModalOpen(true)} 
                variant="outline" 
                className="px-4 py-2"
                data-testid="button-add-member"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Member
              </Button>
              <Button 
                onClick={() => setIsScannerOpen(true)} 
                variant="outline" 
                className="px-4 py-2"
                data-testid="button-scan-qr"
              >
                <Camera className="h-4 w-4 mr-1" />
                Scan
              </Button>
              <Button 
                onClick={() => setRunTour(true)} 
                variant="outline" 
                className="px-4 py-2"
                data-testid="button-help-tour"
                title="Take a guided tour"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Help
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border p-2 mb-6 tour-navigation-tabs">
          <div className="flex gap-1">
            {[
              { id: "overview", label: "Overview", icon: BarChart },
              { id: "events", label: "Events", icon: Calendar },
              { id: "members", label: "Members", icon: Users }
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={currentView === id ? "default" : "ghost"}
                onClick={() => setCurrentView(id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm ${
                  currentView === id 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Condensed Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 tour-stats-overview">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Events</p>
                  <p className="text-2xl font-bold text-blue-600">{stats?.totalEvents || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Registrations</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.totalRegistrations || 0}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">QR Scans</p>
                  <p className="text-2xl font-bold text-orange-600">{stats?.scansToday || 0}</p>
                </div>
                <QrCode className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Validation Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{stats?.validationRate?.toFixed(1) || 0}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conditional Content Based on Current View */}
        {currentView === "overview" && (
          <>
            {/* Quick Stats Row */}
            {stats?.auxiliaryBodyStats && Object.keys(stats.auxiliaryBodyStats).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Auxiliary Body Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(stats.auxiliaryBodyStats).slice(0, 4).map(([auxBody, bodyStats]: [string, any]) => (
                    <Card key={auxBody} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">{auxBody}</p>
                          <p className="text-lg font-bold text-blue-600">{bodyStats.totalMembers || 0}</p>
                          <p className="text-xs text-gray-500">{bodyStats.validationRate?.toFixed(1) || 0}% rate</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {currentView === "overview" && (
          <>
            {/* Registration Distribution */}
            {stats?.registrationTypeStats && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Registration Types</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-lg font-bold">{stats.registrationTypeStats.members || 0}</p>
                      <p className="text-sm text-gray-600">Members</p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <UserPlus className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-lg font-bold">{stats.registrationTypeStats.guests || 0}</p>
                      <p className="text-sm text-gray-600">Guests</p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <Bot className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-lg font-bold">{stats.registrationTypeStats.invitees || 0}</p>
                      <p className="text-sm text-gray-600">Invitees</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}

        {currentView === "overview" && (
          <>
            {/* Upcoming Events - Condensed */}
            {Array.isArray(events) && events.filter((event: any) => 
              new Date(event.startDate) > new Date()
            ).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Events</h3>
                <div className="space-y-3">
                  {Array.isArray(events) && events
                    .filter((event: any) => 
                      new Date(event.startDate) > new Date()
                    )
                    .slice(0, 2)
                    .map((event: any) => (
                      <Card key={event.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{event.name}</h4>
                              <p className="text-sm text-gray-600">{event.location}</p>
                              <p className="text-sm text-blue-600">{new Date(event.startDate).toLocaleDateString()}</p>
                            </div>
                            <CountdownTimer
                              event={event}
                              showEventDetails={false}
                              size="compact"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* Live Events - Condensed */}
            {Array.isArray(events) && events.filter((event: any) => {
              const now = new Date();
              const start = new Date(event.startDate);
              const end = new Date(event.endDate);
              return now >= start && now <= end;
            }).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live Events
                </h3>
                <div className="space-y-3">
                  {Array.isArray(events) && events
                    .filter((event: any) => {
                      const now = new Date();
                      const start = new Date(event.startDate);
                      const end = new Date(event.endDate);
                      return now >= start && now <= end;
                    })
                    .slice(0, 2)
                    .map((event: any) => (
                      <Card key={event.id} className="border-green-200 bg-green-50 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{event.name}</h4>
                              <p className="text-sm text-gray-600">{event.location}</p>
                              <Badge className="bg-green-100 text-green-800">Live Now</Badge>
                            </div>
                            <Button
                              onClick={() => setIsScannerOpen(true)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Camera className="h-4 w-4 mr-1" />
                              Scan
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Conditional Content Based on Current View */}
        {currentView === "events" && (
          <Card className="tour-events-section">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Event Management</CardTitle>
                <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
                    </DialogHeader>
                    <EventForm 
                      event={editingEvent}
                      onClose={() => {
                        setIsEventModalOpen(false);
                        setEditingEvent(null);
                      }} 
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.map((event: any) => (
                  <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{event.name}</h3>
                        <p className="text-sm text-gray-600">
                          Eligible: {event.eligibleAuxiliaryBodies?.join(", ")} • {new Date(event.startDate).toLocaleDateString()}
                        </p>
                        <div className="flex items-center mt-2 space-x-4">
                          <Badge className={getStatusBadge(event.status)}>
                            {event.status}
                          </Badge>
                          <span className="text-sm text-gray-600">Location: {event.location}</span>
                        </div>
                        <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                          <span>📊 {event.totalRegistrations || 0} total</span>
                          <span>👥 {event.memberRegistrations || 0} members</span>
                          <span>🎫 {event.guestRegistrations || 0} guests</span>
                          {event.inviteeRegistrations > 0 && (
                            <span>📧 {event.inviteeRegistrations} invitees</span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Link href={`/events/${event.id}`}>
                          <Button variant="outline" size="sm">
                            View Event
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (event.qrCode) {
                              const newWindow = window.open('', '_blank');
                              if (newWindow) {
                                newWindow.document.write(`
                                  <html>
                                    <head><title>Event QR Code - ${event.name}</title></head>
                                    <body style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
                                      <h2>${event.name}</h2>
                                      <p>Scan this QR code to register for the event</p>
                                      <img src="${event.qrCode}" alt="Event QR Code" style="max-width: 400px; max-height: 400px;"/>
                                      <p><strong>Registration Link:</strong><br/>
                                      ${window.location.origin}/register/${event.id}</p>
                                    </body>
                                  </html>
                                `);
                              }
                            } else {
                              toast({
                                title: "QR Code Not Available",
                                description: "QR code is being generated. Please try again in a moment.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingEvent(event);
                            setIsEventModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${event.name}"?`)) {
                              deleteEvent(event.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Member Management View */}
        {currentView === "members" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Member Management</CardTitle>
                <Dialog open={isMemberModalOpen} onOpenChange={setIsMemberModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Member</DialogTitle>
                    </DialogHeader>
                    <MemberForm onClose={() => setIsMemberModalOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search members..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                  </div>
                  <AuxiliaryBodyFilter value={memberFilter} onValueChange={setMemberFilter} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Auxiliary Body</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {members.map((member: any) => (
                      <tr key={member.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-sm font-medium text-muted-foreground">
                                {member.firstName?.[0]}{member.lastName?.[0]}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-foreground">
                                {member.firstName} {member.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getAuxiliaryBodyBadge(member.auxiliaryBody)}>
                            {member.auxiliaryBody}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusBadge(member.status)}>
                            {member.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button variant="ghost" size="sm" className="mr-2">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics View */}
        {currentView === "analytics" && (
          <div className="space-y-6">
            {/* AI-Powered Features */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 tour-ai-features">
              <div>
                <EventRecommendations limit={3} />
              </div>
              {events && events.length > 0 && (
                <div>
                  <SeatHeatmap 
                    eventId={events[0].id} 
                    refreshInterval={10000}
                  />
                </div>
              )}
            </div>

            {/* Detailed Auxiliary Body Stats */}
            {stats?.auxiliaryBodyStats && Object.keys(stats.auxiliaryBodyStats).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Auxiliary Body Analytics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(stats.auxiliaryBodyStats).map(([auxBody, bodyStats]: [string, any]) => (
                    <Card key={auxBody} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-gray-900">{auxBody}</h4>
                          <Badge className={getAuxiliaryBodyBadge(auxBody)}>
                            {auxBody}
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Members:</span>
                            <span className="text-sm font-medium">{bodyStats.totalMembers || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Event Registrations:</span>
                            <span className="text-sm font-medium">{bodyStats.totalRegistrations || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Validated:</span>
                            <span className="text-sm font-medium">{bodyStats.validatedRegistrations || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Validation Rate:</span>
                            <span className="text-sm font-medium">{bodyStats.validationRate?.toFixed(1) || 0}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sidebar (moved to be conditionally shown) */}
        {(currentView === "overview" || currentView === "validation") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {/* QR Scanner and Quick Actions for overview/validation */}
              {currentView === "validation" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Validation Tools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-center">
                        <div className="bg-muted rounded-lg p-8 mb-4">
                          <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <p className="text-sm text-muted-foreground">Camera will activate when scanning</p>
                        </div>
                        <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                          <DialogTrigger asChild>
                            <Button className="w-full">
                              <Camera className="h-4 w-4 mr-2" />
                              Start QR Scanning
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle>QR Code Scanner</DialogTitle>
                            </DialogHeader>
                            <QRScanner onClose={() => setIsScannerOpen(false)} />
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold">AI Validation Status</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Face Recognition</span>
                            <Badge className="bg-green-100 text-green-800">
                              <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                              Online
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Member Lookup</span>
                            <Badge className="bg-green-100 text-green-800">
                              <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                              Active
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Quick Actions Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      const activeEvent = events.find((event: any) => event.status === 'active');
                      if (activeEvent) {
                        window.open(`/api/events/${activeEvent.id}/export-attendance`, '_blank');
                      } else {
                        toast({
                          title: "No Active Event",
                          description: "Please select an event to export attendance.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-3" />
                    Export Attendance
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setCurrentView("events")}
                  >
                    <Calendar className="h-4 w-4 mr-3" />
                    Manage Events
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setCurrentView("members")}
                  >
                    <Users className="h-4 w-4 mr-3" />
                    Manage Members
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Manual Validation Modal */}
        <Dialog open={manualValidationOpen} onOpenChange={setManualValidationOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manual Validation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Enter validation ID..." />
              <Button 
                onClick={() => {
                  setManualValidationOpen(false);
                  toast({
                    title: "Validation Complete",
                    description: "Member has been validated successfully.",
                  });
                }}
                className="w-full"
              >
                Validate Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Hidden element for tour welcome step */}
      <div className="tour-dashboard-welcome" style={{ display: 'none' }}></div>

      {/* Guided Tour Component */}
      <Joyride
        steps={tourSteps}
        run={runTour}
        stepIndex={tourStepIndex}
        callback={handleTourCallback}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        styles={{
          options: {
            primaryColor: '#3B82F6',
            backgroundColor: '#FFFFFF',
            textColor: '#374151',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            arrowColor: '#FFFFFF',
            zIndex: 1000,
          },
          tooltip: {
            fontSize: '14px',
            borderRadius: '8px',
            padding: '16px',
          },
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip Tour',
        }}
      />
    </div>
  );
}
