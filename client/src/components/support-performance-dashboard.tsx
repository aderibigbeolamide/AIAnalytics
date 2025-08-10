import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  MessageCircle, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  Star,
  Timer,
  Target,
  Award,
  Activity
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface PerformanceMetrics {
  totalChats: number;
  resolvedChats: number;
  avgResponseTime: number; // in seconds
  avgResolutionTime: number; // in minutes
  customerSatisfaction: number; // rating out of 5
  activeChatsToday: number;
  messagesExchanged: number;
  onlineTime: number; // in hours
}

interface SupportPerformanceDashboardProps {
  className?: string;
}

export default function SupportPerformanceDashboard({ className }: SupportPerformanceDashboardProps) {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalChats: 0,
    resolvedChats: 0,
    avgResponseTime: 0,
    avgResolutionTime: 0,
    customerSatisfaction: 0,
    activeChatsToday: 0,
    messagesExchanged: 0,
    onlineTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPerformanceMetrics();
  }, [user?.id]);

  const loadPerformanceMetrics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/performance-metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else {
        // Mock data for demonstration if API doesn't exist yet
        setMetrics({
          totalChats: 47,
          resolvedChats: 42,
          avgResponseTime: 45, // 45 seconds
          avgResolutionTime: 12, // 12 minutes
          customerSatisfaction: 4.6,
          activeChatsToday: 8,
          messagesExchanged: 156,
          onlineTime: 6.5
        });
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
      // Mock data for demonstration
      setMetrics({
        totalChats: 47,
        resolvedChats: 42,
        avgResponseTime: 45,
        avgResolutionTime: 12,
        customerSatisfaction: 4.6,
        activeChatsToday: 8,
        messagesExchanged: 156,
        onlineTime: 6.5
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const resolutionRate = metrics.totalChats > 0 ? (metrics.resolvedChats / metrics.totalChats) * 100 : 0;
  const satisfactionPercentage = (metrics.customerSatisfaction / 5) * 100;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Performance Dashboard
          <Badge variant="outline" className="ml-auto">Today</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-2xl font-bold">{metrics.activeChatsToday}</span>
            </div>
            <p className="text-xs text-muted-foreground">Active Chats</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-2xl font-bold">{metrics.resolvedChats}</span>
            </div>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center">
              <Clock className="h-4 w-4 text-orange-500 mr-1" />
              <span className="text-2xl font-bold">{formatTime(metrics.avgResponseTime)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Avg Response</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-2xl font-bold">{metrics.customerSatisfaction.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Resolution Rate</span>
              <span className="text-sm text-muted-foreground">{resolutionRate.toFixed(1)}%</span>
            </div>
            <Progress 
              value={resolutionRate} 
              className={cn(
                "h-2",
                resolutionRate >= 90 ? "bg-green-100" : resolutionRate >= 70 ? "bg-yellow-100" : "bg-red-100"
              )}
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Customer Satisfaction</span>
              <span className="text-sm text-muted-foreground">{satisfactionPercentage.toFixed(1)}%</span>
            </div>
            <Progress 
              value={satisfactionPercentage} 
              className={cn(
                "h-2",
                satisfactionPercentage >= 90 ? "bg-green-100" : satisfactionPercentage >= 70 ? "bg-yellow-100" : "bg-red-100"
              )}
            />
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-lg font-semibold">{metrics.messagesExchanged}</div>
            <p className="text-xs text-muted-foreground">Messages</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Timer className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-lg font-semibold">{metrics.avgResolutionTime}m</div>
            <p className="text-xs text-muted-foreground">Avg Resolution</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-lg font-semibold">{metrics.onlineTime.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">Online Time</p>
          </div>
        </div>

        {/* Performance Badges */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {resolutionRate >= 90 && (
            <Badge variant="default" className="bg-green-500">
              <Award className="h-3 w-3 mr-1" />
              High Resolver
            </Badge>
          )}
          {metrics.avgResponseTime <= 30 && (
            <Badge variant="default" className="bg-blue-500">
              <Target className="h-3 w-3 mr-1" />
              Quick Responder
            </Badge>
          )}
          {metrics.customerSatisfaction >= 4.5 && (
            <Badge variant="default" className="bg-yellow-500">
              <Star className="h-3 w-3 mr-1" />
              Customer Favorite
            </Badge>
          )}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadPerformanceMetrics}
          className="w-full mt-4"
        >
          Refresh Metrics
        </Button>
      </CardContent>
    </Card>
  );
}