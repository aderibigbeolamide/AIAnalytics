import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users, Search, Filter, ArrowRight, ArrowLeft, Brain, Sparkles, TrendingUp, Star } from "lucide-react";
import { EventImage } from "@/lib/event-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/public", { search: searchTerm, includeAI: aiEnabled ? 'true' : 'false' }],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, { search: string; includeAI: string }];
      const searchParams = new URLSearchParams();
      
      if (params.search && params.search.trim()) {
        searchParams.append('search', params.search.trim());
      }
      if (params.includeAI) {
        searchParams.append('includeAI', params.includeAI);
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
                <h1 className="text-3xl font-bold text-gray-900">All Events</h1>
                {aiEnabled && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0">
                    <Brain className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                )}
              </div>
              <p className="text-gray-600 mt-2">
                {aiEnabled ? "AI-enhanced discovery with smart insights and recommendations" : "Discover and register for upcoming events"}
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
        {/* AI Recommendations (if AI enabled and we have recommendations) */}
        {aiEnabled && recommendedEvents.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-8 border border-purple-200">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">AI Recommendations</h2>
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                Top Picks for You
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendedEvents.map((event) => (
                <Card 
                  key={`rec-${event.id}`} 
                  className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-purple-200"
                  onClick={() => window.location.href = `/event-view/${event.id}`}
                >
                  <div className="relative h-32 overflow-hidden">
                    <EventImage 
                      event={event} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-purple-500 text-white border-0">
                        <Star className="h-3 w-3 mr-1" />
                        Recommended
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-2 line-clamp-1">{event.name}</h3>
                    {event.aiInsights?.vibeScore && renderVibeScore(event.aiInsights.vibeScore)}
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {event.aiInsights?.recommendationReason}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
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

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredEvents.length} of {events.length} events
            {searchTerm && (
              <span className="ml-2 font-medium">
                for "{searchTerm}"
              </span>
            )}
          </p>
        </div>

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