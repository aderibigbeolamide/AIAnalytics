import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, TrendingUp, Users, Calendar, BarChart3, PieChart } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlatformRevenue {
  totalRevenue: number;
  monthlyRevenue: number;
  totalTransactions: number;
  monthlyTransactions: number;
  averageFeePercentage: number;
  topOrganizers: Array<{
    organizationName: string;
    totalRevenue: number;
    transactionCount: number;
    averageFeePercentage: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    transactions: number;
  }>;
  recentTransactions: Array<{
    id: string;
    organizationName: string;
    eventName: string;
    amount: number;
    platformFee: number;
    feePercentage: number;
    date: string;
    status: string;
  }>;
}

export default function PlatformAnalytics() {
  const [, setLocation] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Fetch platform revenue analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/platform/analytics', selectedPeriod],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/platform/analytics?period=${selectedPeriod}`);
      return await response.json() as PlatformRevenue;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Revenue Analytics</h1>
        <p className="text-gray-600">
          Track your platform revenue and monitor transaction performance across all organizations
        </p>
      </div>

      {/* Period Selection */}
      <div className="flex gap-2 mb-6">
        {[
          { key: '7d', label: 'Last 7 Days' },
          { key: '30d', label: 'Last 30 Days' },
          { key: '90d', label: 'Last 90 Days' },
          { key: '1y', label: 'Last Year' },
        ].map((period) => (
          <Button
            key={period.key}
            variant={selectedPeriod === period.key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPeriod(period.key as any)}
          >
            {period.label}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Details</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Platform Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(analytics?.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(analytics?.monthlyRevenue || 0)} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analytics?.totalTransactions || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(analytics?.monthlyTransactions || 0).toLocaleString()} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Platform Fee</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPercentage(analytics?.averageFeePercentage || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all organizations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Organizations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.topOrganizers?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Generating revenue
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Revenue Trend ({selectedPeriod})
              </CardTitle>
              <CardDescription>
                Platform fee revenue over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Revenue chart visualization</p>
                  <p className="text-sm text-gray-400">Chart implementation ready for integration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
              <CardDescription>
                Detailed platform fee revenue analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.revenueByMonth?.map((month, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{month.month}</div>
                      <div className="text-sm text-gray-500">{month.transactions} transactions</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">{formatCurrency(month.revenue)}</div>
                      <div className="text-sm text-gray-500">Platform fees</div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    No revenue data available for the selected period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Organizations by Revenue</CardTitle>
              <CardDescription>
                Organizations generating the most platform fees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.topOrganizers?.map((org, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-semibold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{org.organizationName}</div>
                        <div className="text-sm text-gray-500">{org.transactionCount} transactions</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">{formatCurrency(org.totalRevenue)}</div>
                      <Badge variant="secondary">{formatPercentage(org.averageFeePercentage)} avg fee</Badge>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    No organization data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Platform Fee Transactions</CardTitle>
              <CardDescription>
                Latest transactions generating platform revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.recentTransactions?.map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="font-medium">{transaction.eventName}</div>
                        <div className="text-sm text-gray-500">{transaction.organizationName}</div>
                        <div className="text-xs text-gray-400">{new Date(transaction.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(transaction.amount)}</div>
                      <div className="text-sm text-green-600">+{formatCurrency(transaction.platformFee)} fee</div>
                      <Badge variant="outline" className="text-xs">{formatPercentage(transaction.feePercentage)}</Badge>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    No recent transactions available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}