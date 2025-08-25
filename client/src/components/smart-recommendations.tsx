import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  MapPin, 
  Calendar, 
  ThumbsUp, 
  ThumbsDown, 
  Heart,
  X,
  ArrowRight,
  Lightbulb
} from "lucide-react";
import { format } from "date-fns";
import { EventImage } from "@/lib/event-utils";
import { useAuthStore } from "@/stores/auth-store";

interface RecommendationEvent {
  id: string;
  name: string;
  description?: string;
  location: string;
  startDate: string;
  eventImage?: string;
}

interface Recommendation {
  userId: number;
  eventId: number;
  score: number;
  reasons: string[];
  status: string;
  event?: RecommendationEvent;
}

interface SmartRecommendationsProps {
  onEventClick?: (eventId: string) => void;
}

export function SmartRecommendations({ onEventClick }: SmartRecommendationsProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [dismissedRecs, setDismissedRecs] = useState<Set<number>>(new Set());

  // Fetch personalized recommendations
  const { data: recommendationsData, isLoading } = useQuery({
    queryKey: ["/api/events/recommendations", user?.id || sessionId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.id) {
        params.append('userId', user.id.toString());
      } else {
        params.append('sessionId', sessionId);
      }
      params.append('limit', '8');

      const response = await fetch(`/api/events/recommendations?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });

  // Track interaction mutation
  const trackInteractionMutation = useMutation({
    mutationFn: async (data: {
      eventId: string;
      interactionType: 'view' | 'click' | 'like' | 'dislike';
      source?: string;
    }) => {
      await fetch('/api/events/track-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          sessionId,
          eventId: parseInt(data.eventId),
          interactionType: data.interactionType,
          source: data.source || 'recommendation',
          deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop'
        }),
      });
    },
  });

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async (data: {
      eventId: string;
      feedbackType: 'like' | 'dislike' | 'not_interested';
      feedbackReason?: string;
    }) => {
      if (!user?.id) return;
      
      await fetch('/api/events/recommendation-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          eventId: parseInt(data.eventId),
          feedbackType: data.feedbackType,
          feedbackReason: data.feedbackReason
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events/recommendations"] });
    }
  });

  const handleEventClick = (eventId: string) => {
    trackInteractionMutation.mutate({ eventId, interactionType: 'click' });
    onEventClick?.(eventId);
  };

  const handleFeedback = (eventId: string, type: 'like' | 'dislike') => {
    trackInteractionMutation.mutate({ eventId, interactionType: type });
    if (user?.id) {
      feedbackMutation.mutate({ eventId, feedbackType: type });
    }
    
    if (type === 'dislike') {
      setDismissedRecs(prev => new Set([...prev, parseInt(eventId)]));
    }
  };

  const handleDismiss = (eventId: string) => {
    trackInteractionMutation.mutate({ eventId, interactionType: 'dislike' });
    setDismissedRecs(prev => new Set([...prev, parseInt(eventId)]));
  };

  if (isLoading || !recommendationsData) {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-none shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-purple-600" />
            <Sparkles className="w-4 h-4 text-blue-500" />
            Loading Smart Recommendations...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recommendations = recommendationsData.recommendations || [];
  const visibleRecommendations = recommendations.filter((rec: any) => 
    !dismissedRecs.has(rec.eventId || rec.id)
  );

  if (visibleRecommendations.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-none shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            Discover Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm">
            Start exploring events to get personalized recommendations based on your interests!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-none shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-purple-600" />
          <Sparkles className="w-4 h-4 text-blue-500" />
          {recommendationsData.type === 'personalized' ? 'Recommended for You' : 'Trending Events'}
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          {recommendationsData.type === 'personalized' 
            ? 'Based on your interests and activity'
            : 'Popular events you might enjoy'
          }
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {visibleRecommendations.slice(0, 4).map((rec: any) => {
            const event = rec.event || rec;
            return (
              <Card 
                key={rec.eventId || event.id} 
                className="group cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-purple-200"
                onClick={() => handleEventClick(event.id)}
              >
                <div className="relative">
                  <EventImage 
                    event={event} 
                    className="w-full h-24 object-cover rounded-t-lg"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 p-1 h-auto w-auto bg-white/80 hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(event.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  {rec.score && (
                    <Badge 
                      variant="secondary" 
                      className="absolute bottom-1 left-1 text-xs bg-purple-100 text-purple-700"
                    >
                      {rec.score}% match
                    </Badge>
                  )}
                </div>
                <CardContent className="p-3">
                  <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {event.name}
                  </h4>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(event.startDate), 'MMM d')}</span>
                  </div>
                  
                  {rec.reasons && rec.reasons.length > 0 && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {rec.reasons[0]}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-auto w-auto hover:bg-green-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFeedback(event.id, 'like');
                        }}
                      >
                        <ThumbsUp className="w-3 h-3 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-auto w-auto hover:bg-red-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFeedback(event.id, 'dislike');
                        }}
                      >
                        <ThumbsDown className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                    <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-purple-600 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {visibleRecommendations.length > 4 && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" className="text-purple-600 border-purple-200 hover:bg-purple-50">
              <TrendingUp className="w-4 h-4 mr-2" />
              See More Recommendations
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}