import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  Calendar, 
  Building2, 
  DollarSign, 
  TrendingUp,
  BarChart3,
  Activity,
  UserCheck,
  Settings,
  Bell,
  CheckCircle,
  XCircle,
  Ban,
  Play,
  MessageSquare,
  AlertTriangle
} from "lucide-react";

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

interface OrganizationAnalytics {
  organization: {
    id: string;
    name: string;
    status: string;
    createdAt: Date;
  };
  overview: {
    totalUsers: number;
    totalEvents: number;
    totalRegistrations: number;
    activeUsers: number;
    upcomingEvents: number;
  };
  financial: {
    totalRevenue: number;
    totalTransactions: number;
    ticketsSold: number;
    totalTicketRevenue: number;
    paidRegistrations: number;
    averageEventRevenue: number;
    averageTransactionValue: number;
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
    members: number;
  };
  registrations: {
    total: number;
    paid: number;
    validated: number;
    free: number;
  };
  engagement: {
    totalRegistrations: number;
    paidRegistrations: number;
    freeRegistrations: number;
    conversionRate: number;
    validationRate: number;
    averageRegistrationsPerEvent: number;
  };
}

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: any;
  trend?: string;
}

function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
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
  const [selectedOrgAnalytics, setSelectedOrgAnalytics] = useState<string | null>(null);
  const [platformFeeRate, setPlatformFeeRate] = useState<number>(5);
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const { toast } = useToast();

  // Statistics query
  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery<{ success: boolean; statistics: PlatformStatistics }>({
    queryKey: ['/api/super-admin/statistics'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Organizations query
  const { data: organizationsData, isLoading: orgsLoading } = useQuery<{ organizations: any[] }>({
    queryKey: ['/api/super-admin/organizations'],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Organization analytics query
  const { data: orgAnalytics, isLoading: analyticsLoading } = useQuery<OrganizationAnalytics>({
    queryKey: [`/api/super-admin/organization-analytics?orgId=${selectedOrgAnalytics}`, selectedOrgAnalytics],
    enabled: !!selectedOrgAnalytics,
    staleTime: 2 * 60 * 1000,
  });

  // Organization status mutation
  const updateOrgStatusMutation = useMutation({
    mutationFn: async ({ orgId, status }: { orgId: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/super-admin/organizations/${orgId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/organizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/statistics'] });
      toast({ title: "Success", description: "Organization status updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update organization status", variant: "destructive" });
    }
  });

  // Platform fee mutation
  const updatePlatformFeeMutation = useMutation({
    mutationFn: async ({ rate }: { rate: number }) => {
      const response = await apiRequest('PATCH', '/api/super-admin/platform-settings', { platformFeeRate: rate });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Platform fee rate updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update platform fee rate", variant: "destructive" });
    }
  });

  // Notification broadcast mutation
  const broadcastNotificationMutation = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      const response = await apiRequest('POST', '/api/super-admin/notifications/broadcast', { message });
      return response.json();
    },
    onSuccess: () => {
      setNotificationMessage('');
      toast({ title: "Success", description: "Notification broadcasted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to broadcast notification", variant: "destructive" });
    }
  });

  // Debug logging
  console.log('Stats Data:', statsData);
  console.log('Organizations Data:', organizationsData);
  console.log('Selected Org Analytics:', selectedOrgAnalytics, orgAnalytics);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive platform management and analytics
        </p>
        {statsLoading && (
          <div className="text-sm text-blue-600">Loading statistics...</div>
        )}
        {statsError && (
          <div className="text-sm text-red-600">Error loading data. Please refresh the page.</div>
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="flex flex-col space-y-4">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="org-analytics">Org Analytics</TabsTrigger>
            <TabsTrigger value="platform-settings">Settings</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Total Users"
              value={statsData?.statistics?.overview?.totalUsers || 0}
              description={`${statsData?.statistics?.users?.active || 0} active users`}
              icon={Users}
            />
            <StatCard
              title="Total Events"
              value={statsData?.statistics?.overview?.totalEvents || 0}
              description={`${statsData?.statistics?.events?.upcoming || 0} upcoming`}
              icon={Calendar}
            />
            <StatCard
              title="Total Organizations"
              value={statsData?.statistics?.overview?.totalOrganizations || 0}
              description={`${statsData?.statistics?.organizations?.approved || 0} approved`}
              icon={Building2}
            />
            <StatCard
              title="Total Revenue"
              value={statsData?.statistics?.financial?.totalRevenue || 0}
              description={`₦${(statsData?.statistics?.financial?.totalRevenue || 0).toLocaleString()}`}
              icon={DollarSign}
            />
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Statistics</CardTitle>
              <CardDescription>Platform user metrics and demographics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {statsData?.statistics?.overview?.totalUsers || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {statsData?.statistics?.users?.active || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {statsData?.statistics?.users?.admins || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Admin Users</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {statsData?.statistics?.users?.members || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Member Users</div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">User Growth</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-lg font-semibold text-blue-900">New Users (7 days)</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {statsData?.statistics?.growth?.newUsersLast7Days || 0}
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-900">New Users (30 days)</div>
                    <div className="text-2xl font-bold text-green-600">
                      {statsData?.statistics?.growth?.newUsersLast30Days || 0}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Statistics</CardTitle>
              <CardDescription>Platform event metrics and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {statsData?.statistics?.overview?.totalEvents || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Events</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {statsData?.statistics?.events?.upcoming || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Upcoming Events</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {statsData?.statistics?.events?.past || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Past Events</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {statsData?.statistics?.overview?.totalRegistrations || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Registrations</div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Event Types</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-lg font-semibold text-blue-900">Registration Events</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {statsData?.statistics?.events?.registrationBased || 0}
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-900">Ticket Events</div>
                    <div className="text-2xl font-bold text-green-600">
                      {statsData?.statistics?.events?.ticketBased || 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Financial Performance</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-900">Total Revenue</div>
                    <div className="text-2xl font-bold text-green-600">
                      ₦{statsData?.statistics?.financial?.totalRevenue || 0}
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-lg font-semibold text-blue-900">Paid Registrations</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {statsData?.statistics?.financial?.paidRegistrations || 0}
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-lg font-semibold text-purple-900">Tickets Sold</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {statsData?.statistics?.financial?.ticketsSold || 0}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Statistics</CardTitle>
              <CardDescription>Platform organization metrics and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {statsData?.statistics?.overview?.totalOrganizations || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Organizations</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {statsData?.statistics?.organizations?.approved || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Approved</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {statsData?.statistics?.organizations?.pending || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending Approval</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {statsData?.statistics?.organizations?.suspended || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Suspended</div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Organization List</h3>
                <div className="space-y-4">
                  {orgsLoading && (
                    <div className="text-center py-4">
                      <div className="text-sm text-muted-foreground">Loading organizations...</div>
                    </div>
                  )}
                  {organizationsData?.organizations?.map((org: any) => (
                    <div key={org.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{org.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {org.contactEmail} • Created: {new Date(org.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Plan: {org.subscriptionPlan} • Max Events: {org.maxEvents}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={org.status === 'approved' ? 'default' : 
                                        org.status === 'pending' ? 'secondary' : 'destructive'} 
                                 data-testid={`badge-org-status-${org.id}`}>
                            {org.status}
                          </Badge>
                          <div className="flex gap-1">
                            {org.status === 'pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-green-600 hover:bg-green-50"
                                  onClick={() => updateOrgStatusMutation.mutate({ orgId: org.id, status: 'approved' })}
                                  disabled={updateOrgStatusMutation.isPending}
                                  data-testid={`button-approve-${org.id}`}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => updateOrgStatusMutation.mutate({ orgId: org.id, status: 'rejected' })}
                                  disabled={updateOrgStatusMutation.isPending}
                                  data-testid={`button-reject-${org.id}`}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {org.status === 'approved' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-orange-600 hover:bg-orange-50"
                                onClick={() => updateOrgStatusMutation.mutate({ orgId: org.id, status: 'suspended' })}
                                disabled={updateOrgStatusMutation.isPending}
                                data-testid={`button-suspend-${org.id}`}
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                            {org.status === 'suspended' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-600 hover:bg-green-50"
                                onClick={() => updateOrgStatusMutation.mutate({ orgId: org.id, status: 'approved' })}
                                disabled={updateOrgStatusMutation.isPending}
                                data-testid={`button-reactivate-${org.id}`}
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Platform Analytics
              </CardTitle>
              <CardDescription>
                Comprehensive platform insights and statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Users"
                  value={statsData?.statistics?.overview?.totalUsers || 0}
                  description={`${statsData?.statistics?.users?.active || 0} active users`}
                  icon={Users}
                />
                <StatCard
                  title="Total Events"
                  value={statsData?.statistics?.overview?.totalEvents || 0}
                  description={`${statsData?.statistics?.events?.upcoming || 0} upcoming`}
                  icon={Calendar}
                />
                <StatCard
                  title="Total Organizations"
                  value={statsData?.statistics?.overview?.totalOrganizations || 0}
                  description={`${statsData?.statistics?.organizations?.approved || 0} approved`}
                  icon={Building2}
                />
                <StatCard
                  title="Total Revenue"
                  value={statsData?.statistics?.financial?.totalRevenue || 0}
                  description={`₦${(statsData?.statistics?.financial?.totalRevenue || 0).toLocaleString()}`}
                  icon={DollarSign}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Analytics Tab */}
        <TabsContent value="org-analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Organization-Specific Analytics
              </CardTitle>
              <CardDescription>
                View detailed performance metrics for each organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Organization Selector */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {organizationsData?.organizations?.map((org: any) => (
                    <Card 
                      key={org.id} 
                      className={`cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/20 ${
                        selectedOrgAnalytics === org.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedOrgAnalytics(org.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{org.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {org.status === 'approved' ? '✓ Active' : org.status}
                            </p>
                          </div>
                          <Badge variant={org.status === 'approved' ? 'default' : 'secondary'}>
                            {org.adminCount} admins
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Selected Organization Analytics */}
              {selectedOrgAnalytics && analyticsLoading && (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">Loading organization analytics...</div>
                </div>
              )}
              {selectedOrgAnalytics && orgAnalytics && !analyticsLoading && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Building2 className="w-5 h-5" />
                    {orgAnalytics.organization?.name} Analytics
                  </div>

                  {/* Organization Overview Cards */}
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {orgAnalytics.overview?.totalUsers || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Users</div>
                      <div className="text-xs text-blue-600 mt-1">
                        {orgAnalytics.overview?.activeUsers || 0} active
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {orgAnalytics.overview?.totalEvents || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Events</div>
                      <div className="text-xs text-green-600 mt-1">
                        {orgAnalytics.events?.upcoming || 0} upcoming
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {orgAnalytics.overview?.totalRegistrations || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Registrations</div>
                      <div className="text-xs text-purple-600 mt-1">
                        {orgAnalytics.registrations?.validated || 0} validated
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        ₦{orgAnalytics.financial?.totalRevenue || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                      <div className="text-xs text-orange-600 mt-1">
                        ₦{Math.round(orgAnalytics.financial?.averageEventRevenue || 0)} avg/event
                      </div>
                    </div>
                  </div>

                  {/* Detailed Metrics */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">User Engagement</h4>
                      <div className="text-2xl font-bold text-blue-600">
                        {orgAnalytics.overview?.totalUsers > 0 ? 
                          Math.round(((orgAnalytics.overview?.activeUsers || 0) / orgAnalytics.overview.totalUsers) * 100) : 0}%
                      </div>
                      <p className="text-sm text-muted-foreground">Active user ratio</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Event Success Rate</h4>
                      <div className="text-2xl font-bold text-green-600">
                        {orgAnalytics.overview?.totalEvents > 0 ? 
                          Math.round(((orgAnalytics.events?.past || 0) / orgAnalytics.overview.totalEvents) * 100) : 0}%
                      </div>
                      <p className="text-sm text-muted-foreground">Completed events</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Validation Rate</h4>
                      <div className="text-2xl font-bold text-purple-600">
                        {orgAnalytics.engagement?.validationRate || 0}%
                      </div>
                      <p className="text-sm text-muted-foreground">Validated registrations</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Revenue per User</h4>
                      <div className="text-2xl font-bold text-orange-600">
                        ₦{orgAnalytics.overview?.totalUsers > 0 ? 
                          Math.round((orgAnalytics.financial?.totalRevenue || 0) / orgAnalytics.overview.totalUsers).toLocaleString() : 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Average per user</p>
                    </div>
                  </div>

                  {/* Additional Analytics Charts */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Event Types Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Registration Events</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{
                                    width: `${orgAnalytics.events?.total > 0 ? 
                                      ((orgAnalytics.events?.registrationBased || 0) / orgAnalytics.events.total) * 100 : 0}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{orgAnalytics.events?.registrationBased || 0}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Ticket Events</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{
                                    width: `${orgAnalytics.events?.total > 0 ? 
                                      ((orgAnalytics.events?.ticketBased || 0) / orgAnalytics.events.total) * 100 : 0}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{orgAnalytics.events?.ticketBased || 0}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Payment Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Paid</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{
                                    width: `${orgAnalytics.overview?.totalRegistrations > 0 ? 
                                      ((orgAnalytics.registrations?.paid || 0) / orgAnalytics.overview.totalRegistrations) * 100 : 0}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{orgAnalytics.registrations?.paid || 0}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Free</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{
                                    width: `${orgAnalytics.overview?.totalRegistrations > 0 ? 
                                      ((orgAnalytics.registrations?.free || 0) / orgAnalytics.overview.totalRegistrations) * 100 : 0}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{orgAnalytics.registrations?.free || 0}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Summary Insights */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Key Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-lg font-semibold text-blue-900">
                            Conversion Rate
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {orgAnalytics.engagement?.conversionRate || 0}%
                          </div>
                          <p className="text-sm text-blue-700">
                            Registration to payment conversion
                          </p>
                        </div>
                        
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="text-lg font-semibold text-green-900">
                            Event Completion
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            {orgAnalytics.events?.past || 0}
                          </div>
                          <p className="text-sm text-green-700">
                            Successfully completed events
                          </p>
                        </div>
                        
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <div className="text-lg font-semibold text-purple-900">
                            Avg. Registrations
                          </div>
                          <div className="text-2xl font-bold text-purple-600">
                            {orgAnalytics.engagement?.averageRegistrationsPerEvent || 0}
                          </div>
                          <p className="text-sm text-purple-700">
                            Registrations per event
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!selectedOrgAnalytics && (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select an organization above to view detailed analytics
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platform Settings Tab */}
        <TabsContent value="platform-settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Platform Fee Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Platform Fee Management
                </CardTitle>
                <CardDescription>
                  Configure platform-wide fee rates and revenue settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="platform-fee-rate">Platform Fee Rate (%)</Label>
                  <Input
                    id="platform-fee-rate"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={platformFeeRate}
                    onChange={(e) => setPlatformFeeRate(Number(e.target.value))}
                    data-testid="input-platform-fee-rate"
                  />
                  <p className="text-xs text-muted-foreground">
                    Current fee earned: ₦{statsData?.statistics?.financial?.platformFeesEarned || 0}
                  </p>
                </div>
                <Button 
                  onClick={() => updatePlatformFeeMutation.mutate({ rate: platformFeeRate })}
                  disabled={updatePlatformFeeMutation.isPending}
                  data-testid="button-update-platform-fee"
                >
                  {updatePlatformFeeMutation.isPending ? 'Updating...' : 'Update Fee Rate'}
                </Button>
              </CardContent>
            </Card>

            {/* Customer Support Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Customer Support
                </CardTitle>
                <CardDescription>
                  Real-time support and communication settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Support Chat</div>
                      <div className="text-sm text-muted-foreground">Live chat with users</div>
                    </div>
                    <Badge variant="outline" className="text-green-600">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Auto-responses</div>
                      <div className="text-sm text-muted-foreground">Automated support replies</div>
                    </div>
                    <Badge variant="outline" className="text-blue-600">Enabled</Badge>
                  </div>
                  <Button variant="outline" className="w-full" data-testid="button-support-dashboard">
                    Open Support Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Monitoring */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  System Health
                </CardTitle>
                <CardDescription>
                  Platform performance and monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Response Time</span>
                    <Badge variant="outline" className="text-green-600">Normal</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Performance</span>
                    <Badge variant="outline" className="text-green-600">Optimal</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Storage Usage</span>
                    <Badge variant="outline" className="text-blue-600">75%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Connections</span>
                    <Badge variant="outline" className="text-blue-600">{statsData?.statistics?.overview?.activeUsers || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest platform actions and alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm p-2 bg-green-50 rounded border-l-4 border-green-500">
                    New organization "Sysbeams" approved
                  </div>
                  <div className="text-sm p-2 bg-blue-50 rounded border-l-4 border-blue-500">
                    {statsData?.statistics?.growth?.newEventsLast7Days || 0} new events this week
                  </div>
                  <div className="text-sm p-2 bg-orange-50 rounded border-l-4 border-orange-500">
                    Platform fees earned: ₦{statsData?.statistics?.financial?.platformFeesEarned || 0}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Broadcast Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Broadcast Notifications
                </CardTitle>
                <CardDescription>
                  Send notifications to all users or specific organizations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notification-message">Message</Label>
                  <Textarea
                    id="notification-message"
                    placeholder="Enter your notification message..."
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    rows={4}
                    data-testid="textarea-notification-message"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => broadcastNotificationMutation.mutate({ message: notificationMessage })}
                    disabled={!notificationMessage.trim() || broadcastNotificationMutation.isPending}
                    data-testid="button-broadcast-notification"
                  >
                    {broadcastNotificationMutation.isPending ? 'Sending...' : 'Broadcast to All'}
                  </Button>
                  <Button variant="outline" data-testid="button-preview-notification">
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notification Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Notification Statistics</CardTitle>
                <CardDescription>
                  Track notification engagement and delivery
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 grid-cols-2">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">24</div>
                      <div className="text-sm text-muted-foreground">Sent Today</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">89%</div>
                      <div className="text-sm text-muted-foreground">Delivery Rate</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Email notifications</span>
                      <span className="text-green-600">18 delivered</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>In-app notifications</span>
                      <span className="text-blue-600">24 delivered</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Failed deliveries</span>
                      <span className="text-red-600">2 failed</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Templates</CardTitle>
                <CardDescription>
                  Pre-defined notification templates for common scenarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setNotificationMessage("🎉 Welcome to EventValidate! Start creating amazing events today.")}
                    data-testid="button-template-welcome"
                  >
                    Welcome Message
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setNotificationMessage("🔧 Scheduled maintenance will occur tonight from 2-4 AM. Plan accordingly.")}
                    data-testid="button-template-maintenance"
                  >
                    Maintenance Alert
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setNotificationMessage("🚀 New features available! Check out our latest updates in your dashboard.")}
                    data-testid="button-template-feature"
                  >
                    Feature Update
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setNotificationMessage("⚠️ Important: Please verify your account details to continue using our services.")}
                    data-testid="button-template-verification"
                  >
                    Verification Reminder
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
                <CardDescription>
                  History of sent notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium">System Maintenance</div>
                        <div className="text-xs text-muted-foreground">
                          Sent 2 hours ago • 24 recipients
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600">Delivered</Badge>
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium">Welcome New Users</div>
                        <div className="text-xs text-muted-foreground">
                          Sent 1 day ago • 12 recipients
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600">Delivered</Badge>
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium">Feature Update</div>
                        <div className="text-xs text-muted-foreground">
                          Sent 3 days ago • 45 recipients
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600">Delivered</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}