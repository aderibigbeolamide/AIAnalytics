import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Calendar, QrCode } from 'lucide-react';
import { CountdownTimer } from '@/components/countdown-timer';
import { Link } from 'wouter';

export default function GuestLookup() {
  const [searchType, setSearchType] = useState<'email' | 'uniqueId'>('email');
  const [searchValue, setSearchValue] = useState('');
  const [shouldSearch, setShouldSearch] = useState(false);

  const { data: registrations = [], isLoading, error } = useQuery({
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find My Events</h1>
          <p className="text-gray-600">
            Enter your email address or unique registration ID to view your registered events
          </p>
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
              
              <Button type="submit" disabled={!searchValue.trim() || isLoading}>
                {isLoading ? 'Searching...' : 'Find My Events'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {error && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <p className="text-red-600">
                {error.message || 'Failed to find registrations. Please check your information and try again.'}
              </p>
            </CardContent>
          </Card>
        )}

        {shouldSearch && !isLoading && registrations.length === 0 && !error && (
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
            <h2 className="text-2xl font-bold text-gray-900">Your Registered Events</h2>
            
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