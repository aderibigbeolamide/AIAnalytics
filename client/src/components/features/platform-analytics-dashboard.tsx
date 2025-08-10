import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Building, 
  Calendar,
  Activity,
  RefreshCw,
  Download,
  Eye,
  CreditCard
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface PlatformAnalytics {
  overview: {
    totalRevenue: number;
    platformFees: number;
    totalTransactions: number;
    totalOrganizations: number;
    totalUsers: number;
    totalEvents: number;
    revenueGrowthRate: number;
    last30DaysRevenue: number;
  };
  revenue: {
    total: number;
    registrationRevenue: number;
    ticketRevenue: number;
    platformFees: number;
    monthlyData: Array<{
      month: string;
      totalRevenue: number;
      registrationRevenue: number;
      ticketRevenue: number;
      transactions: number;
      platformFees: number;
    }>;
    dailyData: Array<{
      date: string;
      revenue: number;
      transactions: number;
    }>;
  };
  transactions: {
    total: number;
    registrations: number;
    tickets: number;
    averageTransactionValue: number;
  };
  organizations: {
    total: number;
    approved: number;
    pending: number;
    suspended: number;
  };
  users: {
    total: number;
    admins: number;
    superAdmins: number;
    active: number;
  };
  events: {
    total: number;
    upcoming: number;
    past: number;
  };
  metadata: {
    lastUpdated: string;
    dataRange: {
      from: string;
      to: string;
    };
    currency: string;
  };
}

interface RevenueMetrics {
  today: {
    revenue: number;
    transactions: number;
    growth: number;
  };
  yesterday: {
    revenue: number;
    transactions: number;
  };
  thisMonth: {
    revenue: number;
    transactions: number;
  };
  lastUpdated: string;
}

/**
 * Platform Analytics Dashboard
 * 
 * Comprehensive revenue analytics with real-time synchronization and interactive charts
 */
export function PlatformAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  // Fetch platform analytics
  const { 
    data: analytics, 
    isLoading: analyticsLoading, 
    error: analyticsError,
    refetch: refetchAnalytics 
  } = useQuery<{ success: boolean; data: PlatformAnalytics }>({
    queryKey: ['platform-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/platform-analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds
    staleTime: 25000, // Consider data stale after 25 seconds
  });

  // Fetch real-time metrics
  const { 
    data: metrics, 
    isLoading: metricsLoading,
    refetch: refetchMetrics 
  } = useQuery<{ success: boolean; data: RevenueMetrics }>({
    queryKey: ['revenue-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/revenue-metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? 10000 : false, // Auto-refresh every 10 seconds
    staleTime: 8000,
  });

  // Handle manual refresh
  const handleRefresh = async () => {
    try {
      await Promise.all([refetchAnalytics(), refetchMetrics()]);
      toast({
        title: "Data refreshed",
        description: "Analytics data has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh analytics data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Chart colors
  const chartColors = {
    primary: '#0ea5e9',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444'
  };

  const pieChartColors = [chartColors.primary, chartColors.secondary, chartColors.success, chartColors.warning];

  if (analyticsError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Failed to load analytics data</p>
            <Button onClick={handleRefresh}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = analytics?.data;
  const realtimeData = metrics?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Platform Analytics</h2>
          <p className="text-muted-foreground">
            Real-time revenue and performance insights
            {data?.metadata.lastUpdated && (
              <span className="ml-2 text-xs">
                Updated: {new Date(data.metadata.lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={autoRefresh ? "default" : "outline"}>
            {autoRefresh ? "Auto-sync ON" : "Auto-sync OFF"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="w-4 h-4 mr-1" />
            {autoRefresh ? "Disable" : "Enable"} Auto-sync
          </Button>
          <Button
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={analyticsLoading || metricsLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-1", (analyticsLoading || metricsLoading) && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Metrics Cards */}
      {realtimeData && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(realtimeData.today.revenue)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {realtimeData.today.growth >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                )}
                {formatPercentage(realtimeData.today.growth)} vs yesterday
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {realtimeData.today.transactions} transactions
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(realtimeData.thisMonth.revenue)}</div>
              <div className="text-xs text-muted-foreground">
                {realtimeData.thisMonth.transactions} transactions
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Status</CardTitle>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                <span className="text-xs text-green-500">Live</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">Auto-sync enabled</div>
              <div className="text-xs text-muted-foreground">
                Last update: {new Date(realtimeData.lastUpdated).toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics */}
      {data && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="platform">Platform</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data.overview.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">
                    Platform fees: {formatCurrency(data.overview.platformFees)}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.overview.totalOrganizations}</div>
                  <p className="text-xs text-muted-foreground">
                    {data.organizations.approved} approved
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.overview.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {data.users.active} active
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.overview.totalEvents}</div>
                  <p className="text-xs text-muted-foreground">
                    {data.events.upcoming} upcoming
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend (12 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={data.revenue.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), "Revenue"]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalRevenue"
                      stroke={chartColors.primary}
                      fill={`${chartColors.primary}20`}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Revenue Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Event Registrations</span>
                      <span className="font-mono">{formatCurrency(data.revenue.registrationRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Ticket Sales</span>
                      <span className="font-mono">{formatCurrency(data.revenue.ticketRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between font-bold border-t pt-2">
                      <span>Total Revenue</span>
                      <span className="font-mono">{formatCurrency(data.revenue.total)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-green-600">
                      <span>Platform Fees (3%)</span>
                      <span className="font-mono">{formatCurrency(data.revenue.platformFees)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Registrations', value: data.revenue.registrationRevenue },
                          { name: 'Tickets', value: data.revenue.ticketRevenue },
                          { name: 'Platform Fees', value: data.revenue.platformFees }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {[0, 1, 2].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={pieChartColors[index]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Daily Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.revenue.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), "Revenue"]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Bar dataKey="revenue" fill={chartColors.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.transactions.total.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Avg: {formatCurrency(data.transactions.averageTransactionValue)}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Registrations</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.transactions.registrations.toLocaleString()}</div>
                  <Progress 
                    value={(data.transactions.registrations / data.transactions.total) * 100} 
                    className="mt-2" 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ticket Sales</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.transactions.tickets.toLocaleString()}</div>
                  <Progress 
                    value={(data.transactions.tickets / data.transactions.total) * 100} 
                    className="mt-2" 
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="platform" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Organizations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Approved</span>
                    <Badge variant="default">{data.organizations.approved}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending</span>
                    <Badge variant="secondary">{data.organizations.pending}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Suspended</span>
                    <Badge variant="destructive">{data.organizations.suspended}</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Users</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Active</span>
                    <Badge variant="default">{data.users.active}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Admins</span>
                    <Badge variant="secondary">{data.users.admins}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Super Admins</span>
                    <Badge variant="outline">{data.users.superAdmins}</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Events</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Upcoming</span>
                    <Badge variant="default">{data.events.upcoming}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Past</span>
                    <Badge variant="secondary">{data.events.past}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total</span>
                    <Badge variant="outline">{data.events.total}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {(analyticsLoading || metricsLoading) && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading analytics data...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}