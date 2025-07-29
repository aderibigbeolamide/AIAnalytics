import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Activity, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Building2,
  UserCheck,
  BarChart3,
  Clock,
  ArrowLeft,
  Home,
  Send,
  Bell,
  MessageSquare,
  Megaphone
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

interface PlatformStatistics {
  overview: {
    totalUsers: number;
    totalAdmins: number;
    totalSuperAdmins: number;
    totalEvents: number;
    totalRegistrations: number;
    totalMembers: number;
  };
  events: {
    active: number;
    completed: number;
    cancelled: number;
    draft: number;
  };
  registrations: {
    pending: number;
    attended: number;
    validationRate: number;
  };
  recent: {
    newUsers: number;
    newEvents: number;
    newRegistrations: number;
  };
}

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  businessName?: string;
  businessEmail?: string;
  lastLogin?: string;
  createdAt: string;
}

interface Event {
  id: number;
  name: string;
  status: string;
  startDate: string;
  endDate?: string;
  creator?: {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    businessName?: string;
  };
  registrationCount: number;
  attendedCount: number;
  createdAt: string;
}

interface PendingOrganization {
  id: number;
  organizationName: string;
  contactEmail: string;
  contactPhone?: string;
  adminUser: {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  contactEmail: string;
  status: string;
  adminCount: number;
}

interface ChatSession {
  id: string;
  userEmail?: string;
  isEscalated: boolean;
  adminId?: string;
  status: 'active' | 'resolved' | 'pending_admin';
  messages: any[];
  createdAt: string;
  lastActivity: string;
}

// Notification schemas
const broadcastMessageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  expirationDays: z.number().min(1).max(365).default(30)
});

const organizationMessageSchema = z.object({
  organizationId: z.string().min(1, "Organization is required"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium")
});

function StatCard({ title, value, description, icon: Icon, trend }: {
  title: string;
  value: number;
  description: string;
  icon: any;
  trend?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">
          {description}
          {trend && <span className="text-green-600 ml-1">{trend}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboard() {
  const [, setLocation] = useLocation();
  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [eventStatus, setEventStatus] = useState<string>("");
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [orgMessageDialogOpen, setOrgMessageDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for broadcast messages
  const broadcastForm = useForm<z.infer<typeof broadcastMessageSchema>>({
    resolver: zodResolver(broadcastMessageSchema),
    defaultValues: {
      title: "",
      message: "",
      priority: "medium",
      expirationDays: 30
    }
  });

  // Form for organization messages
  const orgMessageForm = useForm<z.infer<typeof organizationMessageSchema>>({
    resolver: zodResolver(organizationMessageSchema),
    defaultValues: {
      organizationId: "",
      title: "",
      message: "",
      priority: "medium"
    }
  });

  // Fetch platform statistics
  const { data: statistics } = useQuery<PlatformStatistics>({
    queryKey: ["/api/super-admin/statistics"],
  });

  // Fetch users
  const { data: usersData, refetch: refetchUsers } = useQuery<{
    users: User[];
    pagination: any;
  }>({
    queryKey: ["/api/super-admin/users", { 
      search: userSearch, 
      role: userRole === "all_roles" ? "" : userRole 
    }],
  });

  // Fetch events
  const { data: eventsData } = useQuery<{
    events: Event[];
    pagination: any;
  }>({
    queryKey: ["/api/super-admin/events", { 
      status: eventStatus === "all_statuses" ? "" : eventStatus 
    }],
  });

  // Fetch pending organizations
  const { data: pendingOrganizations, refetch: refetchPendingOrgs } = useQuery<{
    organizations: PendingOrganization[];
    total: number;
  }>({
    queryKey: ["/api/super-admin/pending-organizations"],
  });

  // Fetch all organizations for notification sending
  const { data: organizationsData } = useQuery<{
    organizations: Organization[];
  }>({
    queryKey: ["/api/super-admin/organizations"],
  });

  // Fetch active chat sessions
  const { data: chatSessions, refetch: refetchChatSessions } = useQuery<ChatSession[]>({
    queryKey: ["/api/admin/chat-sessions"],
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  // Broadcast message mutation
  const broadcastMutation = useMutation({
    mutationFn: async (data: z.infer<typeof broadcastMessageSchema>) => {
      return apiRequest('POST', '/api/super-admin/broadcast-message', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Broadcast message sent to all organizations"
      });
      setBroadcastDialogOpen(false);
      broadcastForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send broadcast message",
        variant: "destructive"
      });
    }
  });

  // Organization message mutation
  const orgMessageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof organizationMessageSchema>) => {
      return apiRequest('POST', '/api/super-admin/send-message', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Message sent to organization successfully"
      });
      setOrgMessageDialogOpen(false);
      orgMessageForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  });

  const handleUserStatusUpdate = async (userId: number, status: string) => {
    try {
      const response = await fetch(`/api/super-admin/users/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        refetchUsers();
      }
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const handleOrganizationApproval = async (userId: number) => {
    try {
      const response = await fetch(`/api/super-admin/organizations/${userId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        refetchPendingOrgs();
        refetchUsers();
      }
    } catch (error) {
      console.error("Error approving organization:", error);
    }
  };

  if (!statistics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading super admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Mobile-friendly header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2 self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Platform oversight and organization management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Main Dashboard</span>
            <span className="sm:hidden">Main</span>
          </Button>
          <Badge variant="outline" className="text-purple-600 border-purple-200">
            <Shield className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Super Admin</span>
            <span className="sm:hidden">Admin</span>
          </Badge>
        </div>
      </div>

      {/* Platform Statistics - Mobile responsive grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={statistics.overview.totalUsers}
          description={`${statistics.recent.newUsers} new this month`}
          icon={Users}
          trend={statistics.recent.newUsers > 0 ? `+${statistics.recent.newUsers}` : ""}
        />
        <StatCard
          title="Organizations"
          value={statistics.overview.totalAdmins}
          description="Active admin accounts"
          icon={Building2}
        />
        <StatCard
          title="Total Events"
          value={statistics.overview.totalEvents}
          description={`${statistics.recent.newEvents} new this month`}
          icon={Calendar}
          trend={statistics.recent.newEvents > 0 ? `+${statistics.recent.newEvents}` : ""}
        />
        <StatCard
          title="Registrations"
          value={statistics.overview.totalRegistrations}
          description={`${statistics.registrations.validationRate}% validation rate`}
          icon={UserCheck}
        />
      </div>

      {/* Event Statistics - Mobile responsive */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard
          title="Active Events"
          value={statistics.events.active}
          description="Currently running"
          icon={Activity}
        />
        <StatCard
          title="Completed Events"
          value={statistics.events.completed}
          description="Successfully finished"
          icon={CheckCircle}
        />
        <StatCard
          title="Cancelled Events"
          value={statistics.events.cancelled}
          description="Cancelled by organizers"
          icon={XCircle}
        />
        <StatCard
          title="Draft Events"
          value={statistics.events.draft}
          description="Being prepared"
          icon={Clock}
        />
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1">
          <TabsTrigger value="users" className="text-xs md:text-sm">
            <span className="hidden sm:inline">User Management</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs md:text-sm">
            <span className="hidden sm:inline">Event Oversight</span>
            <span className="sm:hidden">Events</span>
          </TabsTrigger>
          <TabsTrigger value="organizations" className="relative text-xs md:text-sm">
            <span className="hidden sm:inline">Organization Approvals</span>
            <span className="sm:hidden">Orgs</span>
            {pendingOrganizations && pendingOrganizations.total > 0 && (
              <Badge variant="destructive" className="ml-1 md:ml-2 px-1 md:px-1.5 py-0.5 text-xs">
                {pendingOrganizations.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="support" className="relative text-xs md:text-sm">
            <MessageSquare className="w-4 h-4 lg:mr-2" />
            <span className="hidden lg:inline">Customer Support</span>
            <span className="lg:hidden">Support</span>
            {chatSessions && chatSessions.length > 0 && (
              <Badge variant="destructive" className="ml-1 md:ml-2 px-1 md:px-1.5 py-0.5 text-xs">
                {chatSessions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs md:text-sm">
            <Bell className="w-4 h-4 lg:mr-2" />
            <span className="hidden lg:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs md:text-sm">
            <span className="hidden sm:inline">Platform Analytics</span>
            <span className="sm:hidden">Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage all platform users and organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Input
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full sm:max-w-sm"
                />
                <Select value={userRole} onValueChange={setUserRole}>
                  <SelectTrigger className="w-full sm:max-w-sm">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_roles">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">User</TableHead>
                      <TableHead className="hidden md:table-cell">Organization</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {usersData?.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-muted-foreground">
                            @{user.username} • {user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.businessName ? (
                          <div>
                            <div className="font-medium">{user.businessName}</div>
                            <div className="text-sm text-muted-foreground">{user.businessEmail}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            user.status === 'active' ? 'default' :
                            user.status === 'pending_approval' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {user.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUserStatusUpdate(user.id, 'suspended')}
                            >
                              Suspend
                            </Button>
                          )}
                          {user.status === 'suspended' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUserStatusUpdate(user.id, 'active')}
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Oversight</CardTitle>
              <CardDescription>
                Monitor all events across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Select value={eventStatus} onValueChange={setEventStatus}>
                  <SelectTrigger className="w-full sm:max-w-sm">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_statuses">All Statuses</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Event</TableHead>
                      <TableHead className="hidden md:table-cell">Organizer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Registrations</TableHead>
                      <TableHead className="hidden lg:table-cell">Attendance</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {eventsData?.events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{event.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(event.startDate).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.creator ? (
                          <div>
                            <div className="font-medium">
                              {event.creator.firstName} {event.creator.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {event.creator.businessName || `@${event.creator.username}`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            event.status === 'active' ? 'default' :
                            event.status === 'completed' ? 'secondary' :
                            event.status === 'cancelled' ? 'destructive' :
                            'outline'
                          }
                        >
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.registrationCount}</TableCell>
                      <TableCell>
                        {event.attendedCount} / {event.registrationCount}
                        {event.registrationCount > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {Math.round((event.attendedCount / event.registrationCount) * 100)}%
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(event.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Organization Approvals
                {pendingOrganizations && pendingOrganizations.total > 0 && (
                  <Badge variant="destructive">
                    {pendingOrganizations.total} pending
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review and approve new organization registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingOrganizations && pendingOrganizations.organizations.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Organization</TableHead>
                        <TableHead className="hidden md:table-cell">Admin User</TableHead>
                        <TableHead className="hidden sm:table-cell">Contact</TableHead>
                        <TableHead className="hidden lg:table-cell">Registered</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {pendingOrganizations.organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div className="font-medium">{org.organizationName}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div>
                            <div className="font-medium text-sm">
                              {org.adminUser.firstName} {org.adminUser.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              @{org.adminUser.username}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div>
                            <div className="text-sm">{org.contactEmail}</div>
                            {org.contactPhone && (
                              <div className="text-xs text-muted-foreground">
                                {org.contactPhone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleOrganizationApproval(org.adminUser.id)}
                              className="w-full sm:w-auto"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Approve</span>
                              <span className="sm:hidden">✓</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUserStatusUpdate(org.adminUser.id, 'suspended')}
                              className="w-full sm:w-auto"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Reject</span>
                              <span className="sm:hidden">✗</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No pending approvals</h3>
                  <p className="text-muted-foreground">
                    All organization registrations have been processed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Broadcast Message Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Broadcast Message
                </CardTitle>
                <CardDescription>
                  Send message to all organizations using the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Send className="w-4 h-4 mr-2" />
                      Send Broadcast Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Broadcast Message to All Organizations</DialogTitle>
                      <DialogDescription>
                        This message will be sent to all active organizations on the platform.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...broadcastForm}>
                      <form onSubmit={broadcastForm.handleSubmit((data) => broadcastMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={broadcastForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Message title..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={broadcastForm.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Your message to all organizations..." rows={4} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={broadcastForm.control}
                            name="priority"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={broadcastForm.control}
                            name="expirationDays"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Expires (days)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" max="365" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={broadcastMutation.isPending} className="flex-1">
                            {broadcastMutation.isPending ? "Sending..." : "Send to All Organizations"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setBroadcastDialogOpen(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Organization Message Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Organization Message
                </CardTitle>
                <CardDescription>
                  Send targeted message to specific organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={orgMessageDialogOpen} onOpenChange={setOrgMessageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Send className="w-4 h-4 mr-2" />
                      Send Organization Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Send Message to Organization</DialogTitle>
                      <DialogDescription>
                        Send a direct message to admins of a specific organization.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...orgMessageForm}>
                      <form onSubmit={orgMessageForm.handleSubmit((data) => orgMessageMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={orgMessageForm.control}
                          name="organizationId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select organization..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {organizationsData?.organizations.map((org) => (
                                    <SelectItem key={org.id} value={org.id}>
                                      {org.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={orgMessageForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Message title..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={orgMessageForm.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Your message to the organization..." rows={4} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={orgMessageForm.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Priority</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-2">
                          <Button type="submit" disabled={orgMessageMutation.isPending} className="flex-1">
                            {orgMessageMutation.isPending ? "Sending..." : "Send Message"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setOrgMessageDialogOpen(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Notification Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Statistics
              </CardTitle>
              <CardDescription>
                Platform-wide notification metrics and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {organizationsData?.organizations.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Active Organizations</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">Online</div>
                  <p className="text-sm text-muted-foreground">Notification System</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">Real-time</div>
                  <p className="text-sm text-muted-foreground">Delivery</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">Multi-tenant</div>
                  <p className="text-sm text-muted-foreground">Separation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Customer Support Chat Sessions
              </CardTitle>
              <CardDescription>
                Manage escalated user support requests and chat conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!chatSessions || chatSessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No Active Chat Sessions</h3>
                  <p>All support requests have been resolved or no users need assistance.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatSessions.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <div>
                            <div className="font-medium">
                              {session.userEmail || 'Anonymous User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              Started {new Date(session.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={session.status === 'active' ? 'default' : 'outline'}>
                            {session.status}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => setLocation(`/super-admin-chat/${session.id}`)}
                            className="ml-2"
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Messages:</strong> {session.messages.length}
                      </div>
                      
                      {session.messages.length > 0 && (
                        <div className="text-sm text-gray-500 italic bg-gray-50 p-2 rounded">
                          Last message: "{session.messages[session.messages.length - 1]?.text?.substring(0, 100)}..."
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Platform Analytics
              </CardTitle>
              <CardDescription>
                Comprehensive platform performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <h4 className="font-medium">User Growth</h4>
                  <div className="text-2xl font-bold">{statistics.overview.totalUsers}</div>
                  <p className="text-sm text-muted-foreground">
                    +{statistics.recent.newUsers} this month
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Event Activity</h4>
                  <div className="text-2xl font-bold">{statistics.overview.totalEvents}</div>
                  <p className="text-sm text-muted-foreground">
                    {statistics.events.active} currently active
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Validation Rate</h4>
                  <div className="text-2xl font-bold">{statistics.registrations.validationRate}%</div>
                  <p className="text-sm text-muted-foreground">
                    {statistics.registrations.attended} of {statistics.overview.totalRegistrations} attended
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <Button onClick={() => setLocation("/platform-analytics")}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Detailed Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}