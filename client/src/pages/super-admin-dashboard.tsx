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
  const { data: statsData } = useQuery({
    queryKey: ['/api/super-admin/statistics'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Organizations query
  const { data: organizationsData } = useQuery({
    queryKey: ['/api/super-admin/organizations'],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Organization analytics query
  const { data: orgAnalytics } = useQuery({
    queryKey: ['/api/super-admin/organization-analytics', selectedOrgAnalytics],
    enabled: !!selectedOrgAnalytics,
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive platform management and analytics
        </p>
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
              value={statsData?.overview?.totalUsers || 0}
              description={`${statsData?.users?.active || 0} active users`}
              icon={Users}
            />
            <StatCard
              title="Total Events"
              value={statsData?.overview?.totalEvents || 0}
              description={`${statsData?.events?.upcoming || 0} upcoming`}
              icon={Calendar}
            />
            <StatCard
              title="Total Organizations"
              value={statsData?.overview?.totalOrganizations || 0}
              description={`${statsData?.organizations?.approved || 0} approved`}
              icon={Building2}
            />
            <StatCard
              title="Total Revenue"
              value={statsData?.financial?.totalRevenue || 0}
              description={`₦${(statsData?.financial?.totalRevenue || 0).toLocaleString()}`}
              icon={DollarSign}
            />
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage platform users and their permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <p>User management functionality would go here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Management</CardTitle>
              <CardDescription>Overview of all platform events</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Event management functionality would go here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Management</CardTitle>
              <CardDescription>Manage platform organizations</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Organization management functionality would go here.</p>
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
                  value={statsData?.overview?.totalUsers || 0}
                  description={`${statsData?.users?.active || 0} active users`}
                  icon={Users}
                />
                <StatCard
                  title="Total Events"
                  value={statsData?.overview?.totalEvents || 0}
                  description={`${statsData?.events?.upcoming || 0} upcoming`}
                  icon={Calendar}
                />
                <StatCard
                  title="Total Organizations"
                  value={statsData?.overview?.totalOrganizations || 0}
                  description={`${statsData?.organizations?.approved || 0} approved`}
                  icon={Building2}
                />
                <StatCard
                  title="Total Revenue"
                  value={statsData?.financial?.totalRevenue || 0}
                  description={`₦${(statsData?.financial?.totalRevenue || 0).toLocaleString()}`}
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
                      className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/20"
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
              {selectedOrgAnalytics && orgAnalytics && (
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
                        {orgAnalytics.overview?.totalRegistrations > 0 ? 
                          Math.round(((orgAnalytics.registrations?.validated || 0) / orgAnalytics.overview.totalRegistrations) * 100) : 0}%
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