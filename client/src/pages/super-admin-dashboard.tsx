import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Calendar, 
  Building2, 
  DollarSign, 
  TrendingUp,
  BarChart3,
  Activity,
  UserCheck
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="org-analytics">Org Analytics</TabsTrigger>
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
                        <div>
                          <h4 className="font-medium">{org.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {org.adminCount} admins • Created: {new Date(org.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={org.status === 'approved' ? 'default' : 
                                      org.status === 'pending' ? 'secondary' : 'destructive'}>
                          {org.status}
                        </Badge>
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
      </Tabs>
    </div>
  );
}