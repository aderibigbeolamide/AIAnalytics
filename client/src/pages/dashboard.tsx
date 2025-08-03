import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
  Clock
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
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [currentView, setCurrentView] = useState<"overview" | "events" | "members">("overview");
  const queryClient = useQueryClient();

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
    <div className="min-h-screen bg-background dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Enhanced Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">Event Management Dashboard</h1>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-300">Manage members, events, and track attendance with AI-powered validation</p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button 
                onClick={() => setIsEventModalOpen(true)} 
                size="lg"
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg w-full sm:w-auto"
              >
                <Plus className="h-5 w-5" />
                Create Event
              </Button>
              <Button 
                onClick={() => setIsMemberModalOpen(true)} 
                variant="outline" 
                size="lg"
                className="w-full sm:w-auto flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <UserPlus className="h-5 w-5" />
                Add Member
              </Button>
              <Button 
                onClick={() => setIsScannerOpen(true)} 
                variant="outline" 
                size="lg"
                className="w-full sm:w-auto flex items-center gap-2 border-green-200 text-green-700 hover:bg-green-50"
              >
                <Camera className="h-5 w-5" />
                QR Scanner
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-2 mb-6 sm:mb-8">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "overview", label: "Overview", icon: BarChart },
              { id: "events", label: "Events", icon: Calendar },
              { id: "members", label: "Members", icon: Users }
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={currentView === id ? "default" : "ghost"}
                onClick={() => setCurrentView(id as any)}
                className={`flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base ${
                  currentView === id 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" 
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <EnhancedCard
            title="Total Events"
            value={stats?.totalEvents || 0}
            icon={Calendar}
            description={`${stats?.upcomingEvents || 0} upcoming, ${stats?.completedEvents || 0} completed`}
            color="blue"
            trend={{
              value: stats?.eventTrend || 0,
              isPositive: (stats?.eventTrend || 0) >= 0
            }}
          />
          
          <EnhancedCard
            title="Event Registrations"
            value={stats?.totalRegistrations || 0}
            icon={Users}
            description={`${stats?.validatedRegistrations || 0} validated, ${stats?.pendingValidations || 0} pending`}
            color="green"
            trend={{
              value: stats?.registrationTrend || 0,
              isPositive: (stats?.registrationTrend || 0) >= 0
            }}
          />
          
          <EnhancedCard
            title="QR Validations Today"
            value={stats?.scansToday || 0}
            icon={QrCode}
            description="Real-time validation activity"
            color="orange"
          />
          
          <EnhancedCard
            title="Validation Rate"
            value={`${stats?.validationRate?.toFixed(1) || 0}%`}
            icon={TrendingUp}
            description="Success rate of event check-ins"
            color="purple"
            trend={{
              value: stats?.validationTrend || 0,
              isPositive: (stats?.validationTrend || 0) >= 0
            }}
          />
        </div>

        {/* Auxiliary Body Statistics */}
        {stats?.auxiliaryBodyStats && Object.keys(stats.auxiliaryBodyStats).length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Auxiliary Body Statistics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {Object.entries(stats.auxiliaryBodyStats).map(([auxBody, bodyStats]: [string, any]) => (
                <Card key={auxBody} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <UsersRound className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-lg font-semibold text-gray-900">{auxBody}</p>
                        </div>
                      </div>
                      <Badge className={getAuxiliaryBodyBadge(auxBody)}>
                        {auxBody}
                      </Badge>
                    </div>
                    <div className="space-y-2">
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
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active Members:</span>
                        <span className="text-sm font-medium">{bodyStats.activeMembers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Registrations:</span>
                        <span className="text-sm font-medium">{bodyStats.registrations || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Attended:</span>
                        <span className="text-sm font-medium">{bodyStats.attendedEvents || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Registration Type Statistics */}
        {stats?.registrationTypeStats && (
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Activity className="h-6 w-6 text-blue-600" />
                Registration Type Distribution
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <EnhancedCard
                  title="Members"
                  value={stats.registrationTypeStats.members || 0}
                  icon={Users}
                  description="Registered community members"
                  color="blue"
                />
                
                <EnhancedCard
                  title="Guests"
                  value={stats.registrationTypeStats.guests || 0}
                  icon={UserPlus}
                  description="Visiting guests"
                  color="green"
                />
                
                <EnhancedCard
                  title="Invitees"
                  value={stats.registrationTypeStats.invitees || 0}
                  icon={Bot}
                  description="Special invitations"
                  color="purple"
                />
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Events with Countdown */}
        {Array.isArray(events) && events.filter((event: any) => 
          event.status === 'upcoming' && new Date(event.startDate) > new Date()
        ).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.isArray(events) && events
                .filter((event: any) => 
                  event.status === 'upcoming' && new Date(event.startDate) > new Date()
                )
                .slice(0, 3)
                .map((event: any) => (
                  <CountdownTimer
                    key={event.id}
                    event={event}
                    showEventDetails={true}
                    size="normal"
                  />
                ))}
            </div>
          </div>
        )}

        {/* Live Events */}
        {Array.isArray(events) && events.filter((event: any) => {
          const now = new Date();
          const start = new Date(event.startDate);
          const end = new Date(event.endDate);
          return now >= start && now < end;
        }).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Live Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.isArray(events) && events
                .filter((event: any) => {
                  const now = new Date();
                  const start = new Date(event.startDate);
                  const end = new Date(event.endDate);
                  return now >= start && now < end;
                })
                .map((event: any) => (
                  <CountdownTimer
                    key={event.id}
                    event={event}
                    showEventDetails={true}
                    size="normal"
                  />
                ))}
            </div>
          </div>
        )}

        {/* AI-Powered Features Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Bot className="h-6 w-6 text-purple-600" />
            AI-Powered Features
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Event Recommendations */}
            <div>
              <EventRecommendations limit={3} />
            </div>
            
            {/* Seat Heatmap Demo */}
            {events && events.length > 0 && (
              <div>
                <SeatHeatmap 
                  eventId={events[0].id} 
                  refreshInterval={10000}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Events */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Events</CardTitle>
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
                                // Show QR code in a modal or new window
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

            {/* Member Management */}
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
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* QR Scanner */}
            <Card>
              <CardHeader>
                <CardTitle>QR Code Scanner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="bg-muted rounded-lg p-8 mb-4">
                    <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Camera will activate when scanning</p>
                  </div>
                  <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <Camera className="h-4 w-4 mr-2" />
                        Start Scanning
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
              </CardContent>
            </Card>

            {/* AI Validation Status */}
            <Card>
              <CardHeader>
                <CardTitle>AI Validation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Face Recognition</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                      Online
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Member Lookup</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Eligibility Check</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                      Running
                    </Badge>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center">
                    <Bot className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">AI Status</p>
                      <p className="text-xs text-blue-600 dark:text-blue-300">Processing validation in real-time</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    // Export attendance functionality
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
                  onClick={() => setLocation("/analytics")}
                >
                  <BarChart className="h-4 w-4 mr-3" />
                  View Analytics
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setLocation("/invitees")}
                >
                  <UsersRound className="h-4 w-4 mr-3" />
                  Manage Invitees
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setLocation("/settings")}
                >
                  <Settings className="h-4 w-4 mr-3" />
                  System Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
