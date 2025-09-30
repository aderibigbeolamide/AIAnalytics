import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Joyride, { STATUS, CallBackProps, Step, ACTIONS, EVENTS } from "react-joyride";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
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
  HelpCircle,
  Shield,
  Lock,
  ChevronRight,
  ToggleLeft
} from "lucide-react";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { StatusBadge } from "@/components/ui/status-badge";
import SeatHeatmap from "@/components/seat-heatmap";
import EventRecommendations from "@/components/event-recommendations";
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell
} from "recharts";

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
  const [currentView, setCurrentView] = useState<"overview" | "events" | "members" | "analytics" | "validation">("overview");
  const [runTour, setRunTour] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const queryClient = useQueryClient();

  const tourSteps: Step[] = [
    {
      target: 'body',
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
      target: 'body',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Explore More Features! 🚀</h3>
          <p>Try clicking on different tabs (Events, Members) to explore more features. You can always click the Help button again to restart this tour. Happy event managing!</p>
        </div>
      ),
      placement: 'center',
    }
  ];

  const handleTourCallback = (data: CallBackProps) => {
    const { status, index, type, action } = data;
    console.log('Tour callback:', { status, index, type, action });
    
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      console.log('Tour finished or skipped');
      setRunTour(false);
      setTourStepIndex(0);
      localStorage.setItem('dashboard-tour-seen', 'true');
    } else if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        console.log('Moving to next step');
        setTourStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        console.log('Moving to previous step');
        setTourStepIndex(index - 1);
      }
    }
  };

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('dashboard-tour-seen');
    if (!hasSeenTour) {
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

  // Prepare analytics data from actual events
  const getWeeklyAttendance = () => {
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    return last7Days.map((date) => {
      const dayEvents = events.filter((event: any) => {
        const eventDate = new Date(event.startDate);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === date.getTime();
      });
      
      const attendees = dayEvents.reduce((sum: number, event: any) => 
        sum + (event.totalRegistrations || 0), 0
      );
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      return { day: dayName, attendees, target: 50 };
    });
  };

  const getSecurityValidationData = () => {
    const baseScans = stats?.scansToday || 100;
    const hours = 12;
    const avgPerHour = baseScans / hours;
    
    const validationData = Array.from({ length: hours }, (_, i) => ({
      time: i.toString(),
      scans: Math.max(0, Math.floor(avgPerHour + (Math.random() - 0.5) * avgPerHour * 0.5))
    }));
    return validationData;
  };

  const attendanceData = getWeeklyAttendance();
  const securityValidationData = getSecurityValidationData();

  const eventTypeData = [
    { name: 'Completed', value: events.filter((e: any) => e.status === 'completed').length },
    { name: 'Ongoing', value: events.filter((e: any) => e.status === 'ongoing').length },
    { name: 'Upcoming', value: events.filter((e: any) => e.status === 'upcoming').length }
  ];

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981'];

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

  const totalAttendance = events.reduce((sum: number, event: any) => sum + (event.totalRegistrations || 0), 0);
  const validationRate = stats?.validationRate || 0;
  const eventManagementProgress = events.length > 0 ? (events.filter((e: any) => e.status === 'completed').length / events.length * 100) : 0;
  const attendanceRate = events.length > 0 ? (totalAttendance / events.length) : 0;

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Real Time Analytics
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Monitor your events and track performance in real-time
              </p>
            </div>
            
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
                onClick={() => {
                  console.log('Help button clicked, starting tour...');
                  localStorage.removeItem('dashboard-tour-seen');
                  setTourStepIndex(0);
                  setRunTour(true);
                }} 
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
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-2 mb-6 tour-navigation-tabs">
          <div className="flex gap-1">
            {[
              { id: "overview", label: "Analytics", icon: BarChart },
              { id: "events", label: "Events", icon: Calendar },
              { id: "members", label: "Members", icon: Users }
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={currentView === id ? "default" : "ghost"}
                onClick={() => setCurrentView(id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm ${
                  currentView === id 
                    ? "bg-blue-600 text-white dark:bg-blue-500" 
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Analytics Overview View */}
        {currentView === "overview" && (
          <>
            {/* Top Stats with Gradient Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 tour-stats-overview">
              {/* Attendance Card */}
              <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-purple-100 text-sm mb-1">Attendance</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold">{attendanceRate.toFixed(0)}</h3>
                        <span className="text-sm text-purple-200">avg/event</span>
                      </div>
                      <p className="text-xs text-purple-200 mt-1">{totalAttendance} total registrations</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-lg">
                      <Lock className="h-8 w-8" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Select defaultValue="analytics">
                      <SelectTrigger className="bg-white/20 border-white/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="analytics">Analytics</SelectItem>
                        <SelectItem value="reports">Reports</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Security Validation Card */}
              <Card className="bg-white dark:bg-slate-800 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Security Validation</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.scansToday || 0}</h3>
                        <span className="text-sm text-gray-500">scans</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Interventions</p>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                      <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Select defaultValue="realtime">
                      <SelectTrigger className="border-gray-200 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Realtime</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Event Management Card */}
              <Card className="bg-white dark:bg-slate-800 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Event Management</h3>
                  <div className="flex items-center justify-between">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          className="text-gray-200 dark:text-slate-700"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - eventManagementProgress / 100)}`}
                          className="text-blue-600 dark:text-blue-500"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(eventManagementProgress)}%</span>
                      </div>
                    </div>
                    <div className="flex-1 ml-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Total Events</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{events.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Completed</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{events.filter((e: any) => e.status === 'completed').length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Ongoing</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{events.filter((e: any) => e.status === 'ongoing').length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Attendee Analytics */}
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Attendee</CardTitle>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold text-purple-600">{totalAttendance}</span>
                        <span className="text-sm text-gray-500">total</span>
                      </div>
                      <p className="text-xs text-gray-500">Weekly attendance trend</p>
                    </div>
                    <Select defaultValue="weekly">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsBarChart data={attendanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="attendees" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Security Validation Chart */}
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Security Validation</CardTitle>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold text-blue-600">{stats?.scansToday || 0}</span>
                        <span className="text-sm text-gray-500">scans today</span>
                      </div>
                      <p className="text-xs text-gray-500">{validationRate.toFixed(1)}% validation rate</p>
                    </div>
                    <Select defaultValue="today">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={securityValidationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="scans" stroke="#3b82f6" fill="#93c5fd" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Attendance Trend and Event Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Attendance Trend */}
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">Attendance</CardTitle>
                    <Select defaultValue="7days">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7days">7 days</SelectItem>
                        <SelectItem value="30days">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsBarChart data={attendanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="attendees" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      <Line type="monotone" dataKey="target" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Event Management List */}
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">Event Management</CardTitle>
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {events.slice(0, 4).map((event: any, index: number) => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            event.status === 'ongoing' ? 'bg-green-500' : 
                            event.status === 'upcoming' ? 'bg-blue-500' : 'bg-gray-400'
                          }`}></div>
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-white">{event.name}</p>
                            <p className="text-xs text-gray-500">{event.totalRegistrations || 0} attendees</p>
                          </div>
                        </div>
                        <ToggleLeft className={`h-5 w-5 ${
                          event.status === 'ongoing' ? 'text-green-500' : 'text-gray-400'
                        }`} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats Row */}
            {stats?.auxiliaryBodyStats && Object.keys(stats.auxiliaryBodyStats).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Auxiliary Body Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(stats.auxiliaryBodyStats).slice(0, 4).map(([auxBody, bodyStats]: [string, any]) => (
                    <Card key={auxBody} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{auxBody}</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{bodyStats.totalMembers || 0}</p>
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

        {/* Events View */}
        {currentView === "events" && (
          <Card className="tour-events-section shadow-lg">
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
                  <div key={event.id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{event.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Eligible: {event.eligibleAuxiliaryBodies?.join(", ")} • {new Date(event.startDate).toLocaleDateString()}
                        </p>
                        <div className="flex items-center mt-2 space-x-4">
                          <Badge className={getStatusBadge(event.status)}>
                            {event.status}
                          </Badge>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Location: {event.location}</span>
                        </div>
                        <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600 dark:text-gray-400">
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

        {/* Members View */}
        {currentView === "members" && (
          <Card className="shadow-lg">
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
                  <thead className="bg-muted dark:bg-slate-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Auxiliary Body</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card dark:bg-slate-900 divide-y divide-border">
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
      </div>

      {/* Modals */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>
          <QRScanner onClose={() => setIsScannerOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Tour */}
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        callback={handleTourCallback}
        stepIndex={tourStepIndex}
        styles={{
          options: {
            primaryColor: '#2563eb',
            zIndex: 10000,
          },
        }}
      />
    </SidebarLayout>
  );
}
