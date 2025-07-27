import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Clock
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

  // Fetch platform statistics
  const { data: statistics } = useQuery<PlatformStatistics>({
    queryKey: ["/api/super-admin/statistics"],
  });

  // Fetch users
  const { data: usersData, refetch: refetchUsers } = useQuery<{
    users: User[];
    pagination: any;
  }>({
    queryKey: ["/api/super-admin/users", { search: userSearch, role: userRole }],
  });

  // Fetch events
  const { data: eventsData } = useQuery<{
    events: Event[];
    pagination: any;
  }>({
    queryKey: ["/api/super-admin/events", { status: eventStatus }],
  });

  // Fetch pending organizations
  const { data: pendingOrganizations, refetch: refetchPendingOrgs } = useQuery<{
    organizations: PendingOrganization[];
    total: number;
  }>({
    queryKey: ["/api/super-admin/pending-organizations"],
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform oversight and organization management
          </p>
        </div>
        <Badge variant="outline" className="text-purple-600 border-purple-200">
          <Shield className="w-4 h-4 mr-2" />
          Super Admin
        </Badge>
      </div>

      {/* Platform Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Event Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
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
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="events">Event Oversight</TabsTrigger>
          <TabsTrigger value="organizations">
            Organization Approvals
            {pendingOrganizations && pendingOrganizations.total > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingOrganizations.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">Platform Analytics</TabsTrigger>
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
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={userRole} onValueChange={setUserRole}>
                  <SelectTrigger className="max-w-sm">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
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
              <div className="flex gap-4 mb-4">
                <Select value={eventStatus} onValueChange={setEventStatus}>
                  <SelectTrigger className="max-w-sm">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registrations</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Created</TableHead>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Admin User</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrganizations.organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div className="font-medium">{org.organizationName}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {org.adminUser.firstName} {org.adminUser.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              @{org.adminUser.username}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{org.contactEmail}</div>
                            {org.contactPhone && (
                              <div className="text-sm text-muted-foreground">
                                {org.contactPhone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(org.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleOrganizationApproval(org.adminUser.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUserStatusUpdate(org.adminUser.id, 'suspended')}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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