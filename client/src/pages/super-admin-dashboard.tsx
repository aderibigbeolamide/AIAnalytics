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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  Building,
  Building2,
  UserCheck,
  BarChart3,
  Clock,
  ArrowLeft,
  Home,
  Send,
  Bell,
  MessageSquare,
  Megaphone,
  FileText,
  Ban,
  DollarSign,
  Settings,
  PieChart,
  TrendingDown,
  Target,
  CreditCard,
  Receipt,
  Download,
  Share
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

// Platform Fee Schema
const platformFeeSchema = z.object({
  platformFee: z.number()
    .min(0, "Platform fee must be at least 0%")
    .max(20, "Platform fee cannot exceed 20%")
});

type PlatformFeeFormData = z.infer<typeof platformFeeSchema>;



interface PlatformStatistics {
  overview: {
    totalUsers: number;
    totalAdmins: number;
    totalSuperAdmins: number;
    totalEvents: number;
    totalRegistrations: number;
    totalMembers: number;
    totalOrganizations: number;
    activeUsers: number;
    approvedOrganizations: number;
    upcomingEvents: number;
    activeMembers: number;
  };
  financial: {
    totalRevenue: number;
    totalTransactions: number;
    platformFeesEarned: number;
    ticketsSold: number;
    totalTicketRevenue: number;
    paidRegistrations: number;
    averageTransactionValue: number;
  };
  growth: {
    newUsersLast7Days: number;
    newUsersLast30Days: number;
    newEventsLast7Days: number;
    newEventsLast30Days: number;
    newOrgsLast7Days: number;
    newOrgsLast30Days: number;
    userGrowthRate: number;
    eventGrowthRate: number;
  };
  events: {
    upcoming: number;
    past: number;
    cancelled: number;
    total: number;
    registrationBased: number;
    ticketBased: number;
  };
  users: {
    active: number;
    pending: number;
    suspended: number;
    admins: number;
    superAdmins: number;
    members: number;
  };
  organizations: {
    approved: number;
    pending: number;
    suspended: number;
    total: number;
  };
  engagement: {
    totalRegistrations: number;
    paidRegistrations: number;
    freeRegistrations: number;
    conversionRate: number;
    averageRegistrationsPerEvent: number;
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
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  description?: string;
  website?: string;
  address?: string;
  status: string;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  description?: string;
  status: string;
  subscriptionPlan?: string;
  adminCount: number;
  createdAt: string;
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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs md:text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl md:text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs md:text-sm text-muted-foreground">
          {description}
          {trend && <span className="text-green-600 ml-1 bg-green-50 px-2 py-1 rounded-full">{trend}</span>}
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
  const [reviewOrgDialogOpen, setReviewOrgDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<PendingOrganization | null>(null);
  const [platformFeeDialogOpen, setPlatformFeeDialogOpen] = useState(false);
  
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

  // Platform fee form
  const platformFeeForm = useForm<PlatformFeeFormData>({
    resolver: zodResolver(platformFeeSchema),
    defaultValues: {
      platformFee: 2,
    }
  });

  // Fetch platform statistics
  const { data: statistics } = useQuery<PlatformStatistics>({
    queryKey: ["/api/super-admin/statistics"],
  });

  // Fetch platform fee data
  const { data: platformFeeData } = useQuery<{ platformFee: number }>({
    queryKey: ["/api/super-admin/platform-fee"],
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



  // Organization approval mutation
  const approveOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      return apiRequest('POST', `/api/super-admin/organizations/${orgId}/approve`, {});
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Organization approved successfully"
      });
      
      // Trigger user status sync after approval
      try {
        await apiRequest('POST', '/api/super-admin/sync-user-statuses', {});
        console.log('User statuses synced after organization approval');
      } catch (error) {
        console.error('Failed to sync user statuses:', error);
      }
      
      refetchPendingOrgs();
      refetchUsers(); // Refresh user list to show updated statuses
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/statistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/pending-organizations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve organization",
        variant: "destructive"
      });
    }
  });

  // Organization rejection mutation
  const rejectOrgMutation = useMutation({
    mutationFn: async ({ orgId, reason }: { orgId: string; reason: string }) => {
      return apiRequest('POST', `/api/super-admin/organizations/${orgId}/reject`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization rejected successfully"
      });
      refetchPendingOrgs();
      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/statistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/pending-organizations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject organization",
        variant: "destructive"
      });
    }
  });

  const handleOrganizationApproval = (orgId: string) => {
    approveOrgMutation.mutate(orgId);
  };

  const handleOrganizationRejection = (orgId: string, reason: string) => {
    rejectOrgMutation.mutate({ orgId, reason });
  };

  // Organization status update mutation (suspend/activate)
  const updateOrgStatusMutation = useMutation({
    mutationFn: async ({ orgId, status }: { orgId: string; status: string }) => {
      return apiRequest('PATCH', `/api/super-admin/organizations/${orgId}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization status updated successfully"
      });
      refetchPendingOrgs();
      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/statistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/pending-organizations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization status",
        variant: "destructive"
      });
    }
  });

  const handleOrganizationStatusUpdate = (orgId: string, status: string) => {
    updateOrgStatusMutation.mutate({ orgId, status });
  };

  // User status update mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      return apiRequest('PATCH', `/api/super-admin/users/${userId}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User status updated successfully"
      });
      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/statistics"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive"
      });
    }
  });

  const handleUserStatusUpdate = (userId: string, status: string) => {
    updateUserStatusMutation.mutate({ userId, status });
  };

  // Platform fee update mutation
  const updatePlatformFeeMutation = useMutation({
    mutationFn: async (data: PlatformFeeFormData) => {
      return apiRequest('PUT', '/api/super-admin/platform-fee', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Platform fee updated successfully"
      });
      setPlatformFeeDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/platform-fee"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update platform fee",
        variant: "destructive"
      });
    }
  });

  const handleReviewOrganization = (org: PendingOrganization) => {
    setSelectedOrg(org);
    setReviewOrgDialogOpen(true);
  };

  const handleApproveFromReview = () => {
    if (selectedOrg) {
      handleOrganizationApproval(selectedOrg.id);
      setReviewOrgDialogOpen(false);
      setSelectedOrg(null);
    }
  };

  const handleRejectFromReview = () => {
    if (selectedOrg) {
      handleOrganizationRejection(selectedOrg.id, 'Rejected after review');
      setReviewOrgDialogOpen(false);
      setSelectedOrg(null);
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
    <div className="container mx-auto py-4 md:py-6 space-y-4 md:space-y-6 px-4">
      {/* Mobile-optimized header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <Badge variant="outline" className="text-purple-600 border-purple-200">
            <Shield className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Super Admin</span>
            <span className="sm:hidden">Admin</span>
          </Badge>
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Platform oversight and organization management
          </p>
        </div>
      </div>

      {/* Comprehensive Platform Statistics */}
      <div className="space-y-6">
        {/* Financial Overview */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Financial Overview
          </h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Revenue"
              value={`₦${statistics?.financial?.totalRevenue?.toLocaleString() || "0"}`}
              description="Platform revenue"
              icon={DollarSign}
              trend={`${statistics?.financial?.totalTransactions || 0} transactions`}
            />
            <StatCard
              title="Platform Fees"
              value={`₦${statistics?.financial?.platformFeesEarned?.toLocaleString() || "0"}`}
              description="Fees earned"
              icon={Receipt}
            />
            <StatCard
              title="Tickets Sold"
              value={statistics?.financial?.ticketsSold || 0}
              description="Paid tickets"
              icon={CreditCard}
            />
            <StatCard
              title="Paid Registrations"
              value={statistics?.financial?.paidRegistrations || 0}
              description="Registration payments"
              icon={UserCheck}
            />
          </div>
        </div>

        {/* Growth Metrics */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Growth Analytics
          </h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="User Growth (7d)"
              value={statistics?.growth?.newUsersLast7Days || 0}
              description={`${statistics?.growth?.userGrowthRate || 0}% vs prev week`}
              icon={Users}
              trend={statistics?.growth?.userGrowthRate > 0 ? "positive" : "neutral"}
            />
            <StatCard
              title="Event Growth (7d)"
              value={statistics?.growth?.newEventsLast7Days || 0}
              description={`${statistics?.growth?.eventGrowthRate || 0}% vs prev week`}
              icon={Calendar}
              trend={statistics?.growth?.eventGrowthRate > 0 ? "positive" : "neutral"}
            />
            <StatCard
              title="Organizations (7d)"
              value={statistics?.growth?.newOrgsLast7Days || 0}
              description="New organizations"
              icon={Building2}
            />
            <StatCard
              title="Conversion Rate"
              value={`${statistics?.engagement?.conversionRate || 0}%`}
              description="Paid vs free registrations"
              icon={Target}
            />
          </div>
        </div>

        {/* Platform Overview */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Platform Overview
          </h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Users"
              value={statistics?.overview?.totalUsers || 0}
              description={`${statistics?.users?.active || 0} active users`}
              icon={Users}
            />
            <StatCard
              title="Organizations"
              value={statistics?.overview?.totalOrganizations || 0}
              description={`${statistics?.organizations?.approved || 0} approved`}
              icon={Building2}
            />
            <StatCard
              title="Total Events"
              value={statistics?.overview?.totalEvents || 0}
              description={`${statistics?.events?.upcoming || 0} upcoming`}
              icon={Calendar}
            />
            <StatCard
              title="Total Registrations"
              value={statistics?.overview?.totalRegistrations || 0}
              description={`${statistics?.engagement?.averageRegistrationsPerEvent || 0} avg per event`}
              icon={UserCheck}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        {/* Mobile-friendly tab navigation */}
        <div className="w-full overflow-x-auto">
          <TabsList className="grid grid-cols-5 lg:grid-cols-8 gap-1 h-auto min-w-max lg:min-w-full">
            <TabsTrigger value="users" className="flex flex-col items-center gap-1 py-3 text-xs">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Users</span>
              <span className="sm:hidden text-xs">Users</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex flex-col items-center gap-1 py-3 text-xs">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Events</span>
              <span className="sm:hidden text-xs">Events</span>
            </TabsTrigger>
            <TabsTrigger value="organizations" className="flex flex-col items-center gap-1 py-3 text-xs relative">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Approvals</span>
              <span className="sm:hidden text-xs">Approval</span>
              {pendingOrganizations && pendingOrganizations.organizations && pendingOrganizations.organizations.length > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 py-0 text-xs min-w-5 h-5 flex items-center justify-center">
                  {pendingOrganizations.organizations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="org-management" className="flex flex-col items-center gap-1 py-3 text-xs">
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Org Mgmt</span>
              <span className="sm:hidden text-xs">Manage</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="flex flex-col items-center gap-1 py-3 text-xs relative">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Support</span>
              <span className="sm:hidden text-xs">Support</span>
              {chatSessions && chatSessions.length > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 py-0 text-xs min-w-5 h-5 flex items-center justify-center">
                  {chatSessions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex flex-col items-center gap-1 py-3 text-xs">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Notifications</span>
              <span className="sm:hidden text-xs">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex flex-col items-center gap-1 py-3 text-xs">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Analytics</span>
              <span className="sm:hidden text-xs">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex flex-col items-center gap-1 py-3 text-xs">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Settings</span>
              <span className="sm:hidden text-xs">Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>

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
                        <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                          {user.status === 'active' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUserStatusUpdate(user.id, 'suspended')}
                              className="w-full sm:w-auto text-xs"
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Suspend
                            </Button>
                          )}
                          {user.status === 'suspended' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUserStatusUpdate(user.id, 'active')}
                              className="w-full sm:w-auto text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Activate
                            </Button>
                          )}
                          {user.status === 'pending_approval' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUserStatusUpdate(user.id, 'active')}
                              className="w-full sm:w-auto text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                          )}
                          {updateUserStatusMutation.isPending && (
                            <div className="flex items-center justify-center py-1">
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
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
                      <TableCell className="hidden md:table-cell">
                        <div>
                          <div className="font-medium">
                            {(event as any).organizationName || 'Unknown Organization'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {(event as any).creatorName || 'Unknown User'}
                          </div>
                        </div>
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
                      <TableCell className="hidden sm:table-cell">
                        {event.registrationCount || 0}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {(event as any).attendanceCount || event.attendedCount || 0}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
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
                {pendingOrganizations && pendingOrganizations.organizations && pendingOrganizations.organizations.length > 0 && (
                  <Badge variant="destructive">
                    {pendingOrganizations.organizations.length} pending
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
                        <TableHead className="hidden md:table-cell">Details</TableHead>
                        <TableHead className="hidden sm:table-cell">Contact</TableHead>
                        <TableHead className="hidden lg:table-cell">Registered</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {pendingOrganizations.organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div className="font-medium">
                            <Button
                              variant="link"
                              className="p-0 h-auto font-medium text-left"
                              onClick={() => handleReviewOrganization(org)}
                            >
                              {org.name}
                            </Button>
                          </div>
                          <Badge variant="outline" className="mt-1">
                            {org.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div>
                            {org.description && (
                              <div className="text-sm text-muted-foreground mb-1">
                                {org.description.substring(0, 100)}...
                              </div>
                            )}
                            {org.website && (
                              <div className="text-xs text-blue-600">
                                {org.website}
                              </div>
                            )}
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
                              variant="outline"
                              onClick={() => handleReviewOrganization(org)}
                              className="w-full sm:w-auto"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Review</span>
                              <span className="sm:hidden">👁</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleOrganizationApproval(org.id)}
                              disabled={approveOrgMutation.isPending}
                              className="w-full sm:w-auto"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">
                                {approveOrgMutation.isPending ? 'Approving...' : 'Approve'}
                              </span>
                              <span className="sm:hidden">✓</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOrganizationRejection(org.id, 'Rejected by super admin')}
                              disabled={rejectOrgMutation.isPending}
                              className="w-full sm:w-auto"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">
                                {rejectOrgMutation.isPending ? 'Rejecting...' : 'Reject'}
                              </span>
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

          {/* Organization Review Dialog */}
          <Dialog open={reviewOrgDialogOpen} onOpenChange={setReviewOrgDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Review Organization Application</DialogTitle>
                <DialogDescription>
                  Review the organization details before making an approval decision
                </DialogDescription>
              </DialogHeader>
              
              {selectedOrg && (
                <div className="space-y-6">
                  {/* Organization Basic Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{selectedOrg.name}</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Status: </span>
                          <Badge variant="outline">{selectedOrg.status}</Badge>
                        </div>
                        <div>
                          <span className="font-medium">Registered: </span>
                          {new Date(selectedOrg.createdAt).toLocaleDateString()} at {new Date(selectedOrg.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Contact Email: </span>
                        <span className="text-blue-600">{selectedOrg.contactEmail}</span>
                      </div>
                      {selectedOrg.contactPhone && (
                        <div>
                          <span className="font-medium">Phone: </span>
                          {selectedOrg.contactPhone}
                        </div>
                      )}
                      {selectedOrg.website && (
                        <div>
                          <span className="font-medium">Website: </span>
                          <a href={selectedOrg.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {selectedOrg.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {selectedOrg.description && (
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                        {selectedOrg.description || "No description provided"}
                      </p>
                    </div>
                  )}

                  {/* Address */}
                  {selectedOrg.address && (
                    <div>
                      <h4 className="font-medium mb-2">Address</h4>
                      <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                        {selectedOrg.address}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <Button
                      onClick={handleApproveFromReview}
                      disabled={approveOrgMutation.isPending}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveOrgMutation.isPending ? 'Approving...' : 'Approve Organization'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRejectFromReview}
                      disabled={rejectOrgMutation.isPending}
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {rejectOrgMutation.isPending ? 'Rejecting...' : 'Reject Organization'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setReviewOrgDialogOpen(false)}
                      className="flex-1 sm:flex-none"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
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

        <TabsContent value="org-management" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Organization Management
              </CardTitle>
              <CardDescription>
                Manage organization statuses - suspend or activate organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Organization</TableHead>
                      <TableHead className="hidden md:table-cell">Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Plan</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizationsData?.organizations?.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {org.description || 'No description'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div>
                            <div className="text-sm">{org.contactEmail}</div>
                            {org.contactPhone && (
                              <div className="text-xs text-muted-foreground">
                                {org.contactPhone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              org.status === 'approved' ? 'default' :
                              org.status === 'suspended' ? 'destructive' :
                              org.status === 'rejected' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {org.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">
                            {org.subscriptionPlan}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                            {org.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleOrganizationStatusUpdate(org.id, 'suspended')}
                                disabled={updateOrgStatusMutation.isPending}
                                className="w-full sm:w-auto text-xs"
                              >
                                <Ban className="w-3 h-3 mr-1" />
                                <span className="hidden sm:inline">Suspend</span>
                                <span className="sm:hidden">Suspend</span>
                              </Button>
                            )}
                            {org.status === 'suspended' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOrganizationStatusUpdate(org.id, 'approved')}
                                disabled={updateOrgStatusMutation.isPending}
                                className="w-full sm:w-auto text-xs"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                <span>Activate</span>
                              </Button>
                            )}
                            {org.status === 'rejected' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOrganizationStatusUpdate(org.id, 'approved')}
                                disabled={updateOrgStatusMutation.isPending}
                                className="w-full sm:w-auto text-xs"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                <span>Reactivate</span>
                              </Button>
                            )}
                            {updateOrgStatusMutation.isPending && (
                              <div className="flex items-center justify-center py-1">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {(!organizationsData?.organizations || organizationsData.organizations.length === 0) && (
                <div className="text-center py-8">
                  <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No organizations found</h3>
                  <p className="text-muted-foreground">
                    No organizations have been registered yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platform Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Platform Settings
              </CardTitle>
              <CardDescription>
                Configure platform-wide settings and fees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Platform Fee Management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Platform Fee</h4>
                    <p className="text-sm text-muted-foreground">
                      Current platform fee: {platformFeeData?.platformFee || 2}%
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      platformFeeForm.setValue('platformFee', platformFeeData?.platformFee || 2);
                      setPlatformFeeDialogOpen(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Update Fee
                  </Button>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Current Fee</div>
                      <div className="text-muted-foreground">{platformFeeData?.platformFee || 2}%</div>
                    </div>
                    <div>
                      <div className="font-medium">Estimated Monthly Revenue</div>
                      <div className="text-muted-foreground">₦{Math.round((statistics?.financial?.totalRevenue || 0) * 0.1).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="font-medium">Total Fees Earned</div>
                      <div className="text-muted-foreground">₦{statistics?.financial?.platformFeesEarned?.toLocaleString() || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Platform Analytics & Insights
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const statsData = JSON.stringify(statistics, null, 2);
                      navigator.clipboard.writeText(statsData);
                      toast({ title: "Success", description: "Statistics copied to clipboard" });
                    }}
                    className="flex items-center gap-2"
                  >
                    <Share className="w-4 h-4" />
                    Share Stats
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const csvData = [
                        ['Metric', 'Value'],
                        ['Total Users', statistics?.overview?.totalUsers || 0],
                        ['Total Organizations', statistics?.overview?.totalOrganizations || 0],
                        ['Total Events', statistics?.overview?.totalEvents || 0],
                        ['Total Revenue', `₦${statistics?.financial?.totalRevenue || 0}`],
                        ['Platform Fees Earned', `₦${statistics?.financial?.platformFeesEarned || 0}`],
                        ['Conversion Rate', `${statistics?.engagement?.conversionRate || 0}%`],
                      ].map(row => row.join(',')).join('\n');
                      
                      const blob = new Blob([csvData], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `platform-analytics-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      
                      toast({ title: "Success", description: "Analytics exported to CSV" });
                    }}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Comprehensive platform analytics for stakeholder reports and growth tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Key Performance Indicators */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  Key Performance Indicators (KPIs)
                </h4>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ₦{statistics?.financial?.totalRevenue?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Platform Revenue</div>
                    <div className="text-xs text-green-600 mt-1">
                      +{statistics?.growth?.newEventsLast7Days || 0} events this week
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {((statistics?.users?.active || 0) / (statistics?.overview?.totalUsers || 1) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">User Engagement Rate</div>
                    <div className="text-xs text-blue-600 mt-1">
                      {statistics?.users?.active || 0} of {statistics?.overview?.totalUsers || 0} users active
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {statistics?.engagement?.conversionRate || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Payment Conversion</div>
                    <div className="text-xs text-purple-600 mt-1">
                      {statistics?.financial?.paidRegistrations || 0} paid registrations
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {statistics?.growth?.userGrowthRate || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Weekly Growth Rate</div>
                    <div className="text-xs text-orange-600 mt-1">
                      +{statistics?.growth?.newUsersLast7Days || 0} new users
                    </div>
                  </div>
                </div>
              </div>

              {/* Growth Trends */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Growth Trends & Insights
                </h4>
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="font-medium">User Acquisition</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Last 7 days</span>
                        <span className="font-medium">{statistics?.growth?.newUsersLast7Days || 0} users</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Last 30 days</span>
                        <span className="font-medium">{statistics?.growth?.newUsersLast30Days || 0} users</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Growth rate</span>
                        <span className={`font-medium ${(statistics?.growth?.userGrowthRate || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(statistics?.growth?.userGrowthRate || 0) >= 0 ? '+' : ''}{statistics?.growth?.userGrowthRate || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="font-medium">Event Creation</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Last 7 days</span>
                        <span className="font-medium">{statistics?.growth?.newEventsLast7Days || 0} events</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Last 30 days</span>
                        <span className="font-medium">{statistics?.growth?.newEventsLast30Days || 0} events</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Growth rate</span>
                        <span className={`font-medium ${(statistics?.growth?.eventGrowthRate || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(statistics?.growth?.eventGrowthRate || 0) >= 0 ? '+' : ''}{statistics?.growth?.eventGrowthRate || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Health */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Platform Health Metrics
                </h4>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="font-medium text-green-600 mb-2">Active Organizations</div>
                    <div className="text-2xl font-bold">{statistics?.organizations?.approved || 0}</div>
                    <div className="text-sm text-muted-foreground">
                      {statistics?.organizations?.pending || 0} pending approval
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="font-medium text-blue-600 mb-2">Event Success Rate</div>
                    <div className="text-2xl font-bold">
                      {statistics?.overview?.totalEvents > 0 ? 
                        Math.round(((statistics?.events?.past || 0) / statistics.overview.totalEvents) * 100) : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {statistics?.events?.past || 0} completed events
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="font-medium text-purple-600 mb-2">Revenue per Event</div>
                    <div className="text-2xl font-bold">
                      ₦{statistics?.overview?.totalEvents > 0 ? 
                        Math.round((statistics?.financial?.totalRevenue || 0) / statistics.overview.totalEvents).toLocaleString() : 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Average revenue generation
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Platform Fee Update Dialog */}
      <Dialog open={platformFeeDialogOpen} onOpenChange={setPlatformFeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Platform Fee</DialogTitle>
            <DialogDescription>
              Set the platform fee percentage (0-20%). This affects all new transactions.
            </DialogDescription>
          </DialogHeader>
          <Form {...platformFeeForm}>
            <form onSubmit={platformFeeForm.handleSubmit((data) => updatePlatformFeeMutation.mutate(data))} className="space-y-4">
              <FormField
                control={platformFeeForm.control}
                name="platformFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform Fee (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Current fee: {platformFeeData?.platformFee || 2}%. Enter a value between 0 and 20.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPlatformFeeDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePlatformFeeMutation.isPending}>
                  {updatePlatformFeeMutation.isPending ? "Updating..." : "Update Fee"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}