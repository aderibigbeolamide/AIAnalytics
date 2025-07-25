import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MapPin, Clock, AlertCircle, CheckCircle, XCircle, Zap } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SeatSection {
  id: string;
  name: string;
  seats: Array<{
    id: string;
    row: string;
    number: string;
    status: 'available' | 'reserved' | 'occupied' | 'blocked';
    price?: number;
    category?: string;
  }>;
}

interface SeatAvailability {
  eventId: number;
  totalSeats: number;
  availableSeats: number;
  seatMap: {
    sections: SeatSection[];
  };
  lastUpdated: string;
}

interface SeatHeatmapProps {
  eventId: number;
  refreshInterval?: number;
}

const SeatHeatmap: React.FC<SeatHeatmapProps> = ({ eventId, refreshInterval = 5000 }) => {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();

  const { data: seatData, isLoading, error } = useQuery({
    queryKey: ['/api/events', eventId, 'seat-availability'],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/seat-availability`);
      if (!response.ok) throw new Error('Failed to fetch seat availability');
      return response.json() as SeatAvailability;
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchIntervalInBackground: true,
  });

  const getSeatStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500 hover:bg-green-600';
      case 'reserved': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'occupied': return 'bg-red-500 hover:bg-red-600';
      case 'blocked': return 'bg-gray-400 hover:bg-gray-500';
      default: return 'bg-gray-300';
    }
  };

  const getSeatStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-3 w-3" />;
      case 'reserved': return <Clock className="h-3 w-3" />;
      case 'occupied': return <Users className="h-3 w-3" />;
      case 'blocked': return <XCircle className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getOccupancyLevel = () => {
    if (!seatData) return 'low';
    const occupancyRate = ((seatData.totalSeats - seatData.availableSeats) / seatData.totalSeats) * 100;
    if (occupancyRate >= 90) return 'critical';
    if (occupancyRate >= 70) return 'high';
    if (occupancyRate >= 40) return 'medium';
    return 'low';
  };

  const getOccupancyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Real-time Seat Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !seatData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Real-time Seat Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Seat map not available for this event</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const occupancyLevel = getOccupancyLevel();
  const occupancyRate = Math.round(((seatData.totalSeats - seatData.availableSeats) / seatData.totalSeats) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Real-time Seat Availability
          </CardTitle>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Last updated: {new Date(seatData.lastUpdated).toLocaleTimeString()}</span>
          <Badge className={getOccupancyColor(occupancyLevel)}>
            {occupancyRate}% Occupied
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Occupancy Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{seatData.availableSeats}</div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {seatData.seatMap.sections.reduce((total, section) => 
                total + section.seats.filter(seat => seat.status === 'reserved').length, 0
              )}
            </div>
            <div className="text-sm text-gray-600">Reserved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {seatData.seatMap.sections.reduce((total, section) => 
                total + section.seats.filter(seat => seat.status === 'occupied').length, 0
              )}
            </div>
            <div className="text-sm text-gray-600">Occupied</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{seatData.totalSeats}</div>
            <div className="text-sm text-gray-600">Total Seats</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm">Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span className="text-sm">Blocked</span>
          </div>
        </div>

        {/* Seat Map */}
        <div className="space-y-6">
          {seatData.seatMap.sections.map((section) => (
            <div key={section.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-lg">{section.name}</h3>
                <Button
                  variant={selectedSection === section.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSection(
                    selectedSection === section.id ? null : section.id
                  )}
                >
                  {selectedSection === section.id ? 'Hide Details' : 'Show Details'}
                </Button>
              </div>

              {/* Section Overview */}
              <div className="grid grid-cols-4 gap-2 mb-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-green-600">
                    {section.seats.filter(seat => seat.status === 'available').length}
                  </div>
                  <div className="text-gray-600">Available</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-yellow-600">
                    {section.seats.filter(seat => seat.status === 'reserved').length}
                  </div>
                  <div className="text-gray-600">Reserved</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-red-600">
                    {section.seats.filter(seat => seat.status === 'occupied').length}
                  </div>
                  <div className="text-gray-600">Occupied</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-600">{section.seats.length}</div>
                  <div className="text-gray-600">Total</div>
                </div>
              </div>

              {/* Detailed Seat Grid */}
              {selectedSection === section.id && (
                <div className="grid grid-cols-10 gap-1 p-4 bg-gray-50 rounded">
                  {section.seats.map((seat) => (
                    <div
                      key={seat.id}
                      className={`
                        w-8 h-8 rounded text-xs flex items-center justify-center text-white font-medium
                        cursor-pointer transition-colors duration-200
                        ${getSeatStatusColor(seat.status)}
                      `}
                      title={`Row ${seat.row}, Seat ${seat.number} - ${seat.status}${seat.price ? ` - $${seat.price}` : ''}`}
                    >
                      {seat.number}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Refresh Note */}
        <div className="mt-6 text-center text-sm text-gray-500">
          {autoRefresh ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Auto-refreshing every {refreshInterval / 1000} seconds
            </span>
          ) : (
            <span>Auto-refresh is paused. Click refresh button to update manually.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SeatHeatmap;