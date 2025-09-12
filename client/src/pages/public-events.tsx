import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users, Search, Filter, ArrowRight, ArrowLeft, Brain, Sparkles, TrendingUp, Star, X, AlertCircle, Info } from "lucide-react";
import { EventImage } from "@/lib/event-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartRecommendations } from "@/components/smart-recommendations";
import { useAuthStore } from "@/stores/auth-store";

interface Event {
  id: string;
  name: string;
  description?: string;
  location: string;
  startDate: string;
  endDate?: string;
  eventType: 'registration' | 'ticket';
  maxAttendees?: number;
  eventImage?: string;
  aiInsights?: {
    textAnalysis?: {
      sentiment: {
        sentiment: string;
        positiveScore: number;
        negativeScore: number;
        neutralScore: number;
      };
      keyPhrases: Array<{ text: string; confidence: number }>;
      entities: Array<{ text: string; type: string; confidence: number }>;
    };
    imageAnalysis?: {
      labels: Array<{ name: string; confidence: number; categories: string[] }>;
      moderation: {
        isAppropriate: boolean;
        flags: Array<{ name: string; confidence: number }>;
      };
    };
    aiTags: string[];
    vibeScore: number;
    recommendationReason: string;
  };
}

export default function PublicEventsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const { user } = useAuthStore();

  // Track interaction mutation
  const trackInteractionMutation = useMutation({
    mutationFn: async (data: {
      eventId: string;
      interactionType: 'view' | 'click' | 'search';
      timeSpent?: number;
      searchQuery?: string;
    }) => {
      await fetch('/api/events/track-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          sessionId,
          eventId: parseInt(data.eventId),
          interactionType: data.interactionType,
          timeSpent: data.timeSpent,
          source: data.searchQuery ? 'search' : 'browse',
          searchQuery: data.searchQuery,
          deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop'
        }),
      });
    },
  });

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/public", { search: searchTerm, includeAI: aiEnabled ? 'true' : 'false', userId: user?.id, sessionId }],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, { search: string; includeAI: string; userId?: number; sessionId: string }];
      const searchParams = new URLSearchParams();
      
      if (params.search && params.search.trim()) {
        searchParams.append('search', params.search.trim());
      }
      if (params.includeAI) {
        searchParams.append('includeAI', params.includeAI);
      }
      if (params.userId) {
        searchParams.append('userId', params.userId.toString());
      }
      if (params.sessionId) {
        searchParams.append('sessionId', params.sessionId);
      }
      
      const fullUrl = searchParams.toString() ? `${url}?${searchParams.toString()}` : url;
      console.log('Fetching events with URL:', fullUrl);
      
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds to show new events
    staleTime: 0, // Always refetch when search changes
  });

  // Track search behavior when search term changes
  useEffect(() => {
    if (searchTerm.trim()) {
      const timeoutId = setTimeout(() => {
        trackInteractionMutation.mutate({
          eventId: '0', // Generic search tracking
          interactionType: 'search',
          searchQuery: searchTerm.trim()
        });
      }, 1000); // Debounce search tracking

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm]);

  // Filter events based on type (search is handled by backend AI)
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesType = eventTypeFilter === "all" || event.eventType === eventTypeFilter;
      return matchesType;
    });
  }, [events, eventTypeFilter]);

  // Get AI-powered recommendations
  const recommendedEvents = useMemo(() => {
    if (!aiEnabled) return [];
    return filteredEvents
      .filter(event => event.aiInsights?.vibeScore && event.aiInsights.vibeScore > 0.7)
      .sort((a, b) => (b.aiInsights?.vibeScore || 0) - (a.aiInsights?.vibeScore || 0))
      .slice(0, 3);
  }, [filteredEvents, aiEnabled]);

  // Render vibe score indicator
  const renderVibeScore = (score: number) => {
    const percentage = Math.round(score * 100);
    const color = score > 0.8 ? "bg-green-500" : score > 0.6 ? "bg-yellow-500" : "bg-gray-500";
    
    return (
      <div className="flex items-center gap-1">
        <Sparkles className="h-3 w-3 text-yellow-500" />
        <div className="text-xs font-medium">{percentage}% Vibe</div>
        <div className="w-8 bg-gray-200 rounded-full h-1.5">
          <div className={`${color} h-1.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  {searchTerm.trim() ? `Search: "${searchTerm}"` : "All Events"}
                </h1>
                {aiEnabled && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0">
                    <Brain className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                )}
              </div>
              <p className="text-gray-600 mt-2">
                {searchTerm.trim() 
                  ? `Showing AI-enhanced search results for "${searchTerm}"` 
                  : (aiEnabled ? "AI-enhanced discovery with smart insights and recommendations" : "Discover and register for upcoming events")
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={aiEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setAiEnabled(!aiEnabled)}
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                {aiEnabled ? "AI On" : "AI Off"}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/landing'}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Smart AI-Powered Recommendations */}
        {aiEnabled && (
          <div className="mb-8">
            <SmartRecommendations 
              onEventClick={(eventId) => {
                trackInteractionMutation.mutate({
                  eventId,
                  interactionType: 'click'
                });
                window.location.href = `/event-view/${eventId}`;
              }}
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={aiEnabled ? "Try natural language: 'music events this weekend'" : "Search events by name, description, or location..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {aiEnabled && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Brain className="h-4 w-4 text-purple-500" />
                  </div>
                )}
              </div>
            </div>
            <div className="md:w-48">
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="registration">Registration</SelectItem>
                  <SelectItem value="ticket">Ticketed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Search Results Header */}
        {searchTerm.trim() ? (
          <div className="mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full">
                    <Search className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-blue-900">
                      Search Results for "{searchTerm}"
                    </h2>
                    <p className="text-blue-700 text-sm">
                      Found {filteredEvents.length} matching event{filteredEvents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="text-blue-600 border-blue-300 hover:bg-blue-100"
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Search
                </Button>
              </div>
              {filteredEvents.length === 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-yellow-800 font-medium">No events found</p>
                  </div>
                  <p className="text-yellow-700 text-sm mt-1">
                    Try adjusting your search terms or browse all events below.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="text-yellow-600 p-0 h-auto mt-2"
                    data-testid="button-browse-all-events"
                  >
                    Browse all events →
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <p className="text-gray-600">
                Showing all {filteredEvents.length} available events
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Info className="h-4 w-4" />
                Use the search bar above to find specific events
              </div>
            </div>
          </div>
        )}

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4 w-2/3"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event, index) => (
              <Card 
                key={event.id} 
                className="group hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-0 shadow-lg bg-white overflow-hidden cursor-pointer transform hover:scale-[1.02]"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => {
                  trackInteractionMutation.mutate({
                    eventId: event.id,
                    interactionType: 'click',
                    searchQuery: searchTerm || undefined
                  });
                  window.location.href = `/event-view/${event.id}`;
                }}
              >
                <div className="relative h-48 overflow-hidden">
                  <EventImage 
                    event={event} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute top-4 right-4 space-y-2">
                    {(() => {
                      const now = new Date();
                      const startDate = new Date(event.startDate);
                      const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + (24 * 60 * 60 * 1000));
                      
                      if (now >= startDate && now <= endDate) {
                        return (
                          <Badge className="bg-green-500/90 text-white border-0 animate-pulse">
                            Live Now
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge className="bg-blue-500/90 text-white border-0">
                            Upcoming
                          </Badge>
                        );
                      }
                    })()}
                    <Badge className="bg-white/90 text-gray-800 border-0 block">
                      {event.eventType === 'ticket' ? 'Ticketed' : 'Registration'}
                    </Badge>
                    {aiEnabled && event.aiInsights?.vibeScore && event.aiInsights.vibeScore > 0.8 && (
                      <Badge className="bg-yellow-500/90 text-white border-0 block">
                        <Sparkles className="h-3 w-3 mr-1" />
                        High Vibe
                      </Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-6 group-hover:bg-gradient-to-br group-hover:from-blue-50 group-hover:to-purple-50 transition-all duration-300">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {event.name}
                  </h3>
                  {event.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      {event.location}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {new Date(event.startDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {event.maxAttendees && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2 text-gray-400" />
                        Max {event.maxAttendees} attendees
                      </div>
                    )}
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
                    onClick={() => window.location.href = `/event-view/${event.id}`}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    View Details & Register
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-gray-100 rounded-full p-8 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-600 mb-2">No Events Found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? `No events match "${searchTerm}"` : "No events available at the moment"}
            </p>
            {searchTerm && (
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm("")}
              >
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}