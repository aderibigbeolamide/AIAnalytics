import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, QrCode, ArrowLeft, MapPin, Clock, Users, Ticket } from 'lucide-react';
import { CountdownTimer } from '@/components/countdown-timer';
import { Link } from 'wouter';

export default function GuestLookup() {
  const [searchType, setSearchType] = useState<'email' | 'uniqueId'>('email');
  const [searchValue, setSearchValue] = useState('');
  const [shouldSearch, setShouldSearch] = useState(false);

  // Get all public events (visible to everyone)
  const { data: allEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/events/public'],
    queryFn: async () => {
      const response = await fetch('/api/events/public');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json();
    },
  });

  // Get user's specific registrations (only when searching)
  const { data: registrations = [], isLoading: registrationsLoading, error } = useQuery({
    queryKey: ['/api/my-registrations', searchType, searchValue],
    queryFn: async () => {
      if (!searchValue.trim()) return [];
      
      const params = new URLSearchParams();
      params.append(searchType, searchValue.trim());
      
      const response = await fetch(`/api/my-registrations?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to find registrations');
      }
      return response.json();
    },
    enabled: shouldSearch && !!searchValue.trim(),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      setShouldSearch(true);
    }
  };

  const getEventStatus = (event: any) => {
    const now = new Date();
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    
    if (now < start) return 'upcoming';
    if (now >= start && now < end) return 'live';
    return 'ended';
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with Back Navigation */}
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Find My Events</h1>
            <p className="text-gray-600">
              Browse all events or search with your email/ID to see your registrations
            </p>
          </div>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Event Lookup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-4 mb-4">
                <Button
                  type="button"
                  variant={searchType === 'email' ? 'default' : 'outline'}
                  onClick={() => setSearchType('email')}
                  size="sm"
                >
                  Search by Email
                </Button>
                <Button
                  type="button"
                  variant={searchType === 'uniqueId' ? 'default' : 'outline'}
                  onClick={() => setSearchType('uniqueId')}
                  size="sm"
                >
                  Search by Registration ID
                </Button>
              </div>
              
              <div>
                <Label htmlFor="search">
                  {searchType === 'email' ? 'Email Address' : 'Registration ID'}
                </Label>
                <Input
                  id="search"
                  type={searchType === 'email' ? 'email' : 'text'}
                  placeholder={
                    searchType === 'email' 
                      ? 'Enter your email address' 
                      : 'Enter your 6-character registration ID (e.g., ABC123)'
                  }
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <Button type="submit" disabled={!searchValue.trim() || registrationsLoading}>
                {registrationsLoading ? 'Searching...' : 'Find My Events'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* All Events Section (visible to everyone) */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">All Events</h2>
          
          {eventsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading events...</p>
            </div>
          ) : allEvents.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Available</h3>
                <p className="text-gray-600">No events are currently scheduled.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {allEvents.map((event: any) => {
                const eventStatus = getEventStatus(event);
                return (
                  <Card key={event.id} className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{event.name}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        </div>
                        {getStatusBadge(eventStatus)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{new Date(event.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span>{event.auxiliaryBodies?.join(', ') || 'All Members'}</span>
                        </div>
                        {event.requiresPayment && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-green-600">
                              ${event.paymentAmount}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {eventStatus === 'upcoming' && (
                        <CountdownTimer
                          event={event}
                          registration={undefined}
                          showEventDetails={false}
                          size="compact"
                        />
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        {event.eventType === "ticket" ? (
                          <Link href={`/buy-ticket/${event.id}`}>
                            <Button variant="outline" size="sm" className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700">
                              <Ticket className="h-4 w-4 mr-2" />
                              Buy Tickets
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/register/${event.id}`}>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Calendar className="h-4 w-4 mr-2" />
                              Register
                            </Button>
                          </Link>
                        )}
                        <Link href={`/event-view/${event.id}`}>
                          <Button variant="ghost" size="sm" className="flex-1">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Personal Registration Search Results */}
        {error && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <p className="text-red-600">
                {error.message || 'Failed to find registrations. Please check your information and try again.'}
              </p>
            </CardContent>
          </Card>
        )}

        {shouldSearch && !registrationsLoading && registrations.length === 0 && !error && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Found</h3>
              <p className="text-gray-600">
                No event registrations found for the provided {searchType === 'email' ? 'email address' : 'registration ID'}.
                Please check your information and try again.
              </p>
            </CardContent>
          </Card>
        )}

        {registrations.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Personal Registrations</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {registrations.map((registration: any) => {
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
                    
                    {/* Registration Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">{registration.event.name}</CardTitle>
                        <p className="text-sm text-gray-600">{registration.event.description}</p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-600">Registration ID</p>
                            <p className="font-mono font-bold">{registration.uniqueId}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-600">Type</p>
                            <p className="capitalize">{registration.registrationType}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-600">Name</p>
                            <p>{registration.guestName}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-600">Status</p>
                            <p className="capitalize">{registration.status}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 pt-3">
                          <Link href={`/event-view/${registration.event.id}`}>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Calendar className="h-4 w-4 mr-2" />
                              View Event
                            </Button>
                          </Link>
                          {eventStatus === 'live' && (
                            <Button size="sm" className="flex-1">
                              <QrCode className="h-4 w-4 mr-2" />
                              Event Live
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}