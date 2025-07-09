import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/navbar";
import { CountdownTimer } from "@/components/countdown-timer";
import { getAuthHeaders } from "@/lib/auth";
import { useAuthStore } from "@/lib/auth";
import { Link } from "wouter";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  QrCode,
  Search,
  Filter
} from "lucide-react";

export default function MyEvents() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all, upcoming, live, ended

  // Get user's registrations (supports both authenticated and unauthenticated access)
  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["/api/my-registrations", user?.id],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      
      // Add auth headers if user is logged in
      if (user) {
        Object.assign(headers, getAuthHeaders());
      }
      
      const response = await fetch("/api/my-registrations", {
        headers,
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch registrations");
      }
      return response.json();
    },
  });

  const getEventStatus = (event: any) => {
    const now = new Date();
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    
    if (now < start) return 'upcoming';
    if (now >= start && now < end) return 'live';
    return 'ended';
  };

  const filteredRegistrations = registrations.filter((registration: any) => {
    const eventStatus = getEventStatus(registration.event);
    const matchesSearch = search === "" || 
      registration.event.name.toLowerCase().includes(search.toLowerCase()) ||
      registration.event.location.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || eventStatus === filter;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Upcoming</Badge>;
      case 'live':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 animate-pulse">Live Now</Badge>;
      case 'ended':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Ended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRegistrationBadge = (status: string) => {
    switch (status) {
      case 'attended':
        return <Badge className="bg-green-100 text-green-800">Attended</Badge>;
      case 'registered':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Registered</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Events</h1>
          <p className="text-gray-600">Track your registered events and upcoming activities</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{registrations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {registrations.filter((r: any) => getEventStatus(r.event) === 'upcoming').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Attended</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {registrations.filter((r: any) => r.status === 'attended').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <QrCode className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Live Events</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {registrations.filter((r: any) => getEventStatus(r.event) === 'live').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              size="sm"
            >
              All
            </Button>
            <Button
              variant={filter === "upcoming" ? "default" : "outline"}
              onClick={() => setFilter("upcoming")}
              size="sm"
            >
              Upcoming
            </Button>
            <Button
              variant={filter === "live" ? "default" : "outline"}
              onClick={() => setFilter("live")}
              size="sm"
            >
              Live
            </Button>
            <Button
              variant={filter === "ended" ? "default" : "outline"}
              onClick={() => setFilter("ended")}
              size="sm"
            >
              Ended
            </Button>
          </div>
        </div>

        {/* Events Grid */}
        {filteredRegistrations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600">
                {search || filter !== "all" 
                  ? "Try adjusting your search or filter criteria." 
                  : "You haven't registered for any events yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRegistrations.map((registration: any) => {
              const eventStatus = getEventStatus(registration.event);
              return (
                <div key={registration.id} className="space-y-4">
                  {/* Countdown Timer */}
                  {(eventStatus === 'upcoming' || eventStatus === 'live') && (
                    <CountdownTimer
                      event={registration.event}
                      registration={registration}
                      showEventDetails={true}
                      size="normal"
                    />
                  )}
                  
                  {/* Event Details Card */}
                  <Card className={eventStatus === 'live' ? 'border-green-200 bg-green-50' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{registration.event.name}</CardTitle>
                        {getStatusBadge(eventStatus)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(registration.event.startDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {registration.event.location}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-gray-700">{registration.event.description}</p>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Registration Status</p>
                            {getRegistrationBadge(registration.status)}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Type</p>
                            <Badge variant="outline" className="capitalize">
                              {registration.registrationType}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Unique ID</p>
                            <p className="font-mono text-sm font-bold">{registration.uniqueId}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Link href={`/events/${registration.event.id}`}>
                            <Button variant="outline" size="sm" className="flex-1">
                              View Details
                            </Button>
                          </Link>
                          {eventStatus === 'live' && (
                            <Button size="sm" className="flex-1">
                              <QrCode className="h-4 w-4 mr-1" />
                              Check In
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}