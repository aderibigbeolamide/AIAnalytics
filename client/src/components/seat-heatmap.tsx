import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MapPin, Clock, AlertCircle, CheckCircle, XCircle, Zap } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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
      try {
        const response = await apiRequest('GET', `/api/events/${eventId}/seat-availability`);
        return await response.json() as SeatAvailability;
      } catch (error) {
        console.error('Seat availability fetch error:', error);
        throw error;
      }
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: 2000,
    enabled: !!eventId,
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
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <MapPin className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">Seat Availability</span>
          </CardTitle>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <Zap className="h-4 w-4" />
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-gray-600">
          <span>Updated: {new Date(seatData.lastUpdated).toLocaleTimeString()}</span>
          <Badge className={`${getOccupancyColor(occupancyLevel)} text-xs`}>
            {occupancyRate}% Occupied
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Occupancy Overview - Mobile Optimized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="text-center p-2 md:p-3 bg-white rounded-lg shadow-sm">
            <div className="text-xl md:text-2xl font-bold text-green-600">{seatData.availableSeats}</div>
            <div className="text-xs md:text-sm text-gray-600">Available</div>
          </div>
          <div className="text-center p-2 md:p-3 bg-white rounded-lg shadow-sm">
            <div className="text-xl md:text-2xl font-bold text-yellow-600">
              {seatData.seatMap.sections.reduce((total, section) => 
                total + section.seats.filter(seat => seat.status === 'reserved').length, 0
              )}
            </div>
            <div className="text-xs md:text-sm text-gray-600">Reserved</div>
          </div>
          <div className="text-center p-2 md:p-3 bg-white rounded-lg shadow-sm">
            <div className="text-xl md:text-2xl font-bold text-red-600">
              {seatData.seatMap.sections.reduce((total, section) => 
                total + section.seats.filter(seat => seat.status === 'occupied').length, 0
              )}
            </div>
            <div className="text-xs md:text-sm text-gray-600">Occupied</div>
          </div>
          <div className="text-center p-2 md:p-3 bg-white rounded-lg shadow-sm">
            <div className="text-xl md:text-2xl font-bold text-gray-600">{seatData.totalSeats}</div>
            <div className="text-xs md:text-sm text-gray-600">Total</div>
          </div>
        </div>

        {/* User Guide and Legend - Mobile Optimized */}
        <div className="mb-6 space-y-4">
          <div className="p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2 text-sm md:text-base">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              How to Check Seat Availability
            </h3>
            <div className="text-xs md:text-sm text-blue-800 space-y-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
                <p>• <strong>Green</strong> = Available</p>
                <p>• <strong>Yellow</strong> = Reserved</p>
                <p>• <strong>Red</strong> = Occupied</p>
                <p>• <strong>Gray</strong> = Blocked</p>
              </div>
              <p className="mt-2">• Tap "Show Details" to see individual seats</p>
              <p>• Tap seats for pricing and booking options</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded shadow-sm"></div>
              <span className="text-sm font-medium">Available ({seatData.availableSeats})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded shadow-sm"></div>
              <span className="text-sm font-medium">Reserved ({seatData.seatMap.sections.reduce((total, section) => 
                total + section.seats.filter(seat => seat.status === 'reserved').length, 0
              )})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded shadow-sm"></div>
              <span className="text-sm font-medium">Occupied ({seatData.seatMap.sections.reduce((total, section) => 
                total + section.seats.filter(seat => seat.status === 'occupied').length, 0
              )})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded shadow-sm"></div>
              <span className="text-sm font-medium">Blocked ({seatData.seatMap.sections.reduce((total, section) => 
                total + section.seats.filter(seat => seat.status === 'blocked').length, 0
              )})</span>
            </div>
          </div>
        </div>

        {/* Seat Map - Mobile Optimized */}
        <div className="space-y-4 md:space-y-6">
          {seatData.seatMap.sections.map((section) => (
            <div key={section.id} className="border rounded-lg p-3 md:p-4 bg-white shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="font-medium text-base md:text-lg text-gray-900">{section.name}</h3>
                <Button
                  variant={selectedSection === section.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSection(
                    selectedSection === section.id ? null : section.id
                  )}
                  className="self-start sm:self-auto"
                >
                  {selectedSection === section.id ? 'Hide Details' : 'Show Details'}
                </Button>
              </div>

              {/* Section Overview - Mobile Optimized */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 text-xs md:text-sm">
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-bold text-green-600 text-sm md:text-base">
                    {section.seats.filter(seat => seat.status === 'available').length}
                  </div>
                  <div className="text-gray-600">Available</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="font-bold text-yellow-600 text-sm md:text-base">
                    {section.seats.filter(seat => seat.status === 'reserved').length}
                  </div>
                  <div className="text-gray-600">Reserved</div>
                </div>
                <div className="text-center p-2 bg-red-50 rounded">
                  <div className="font-bold text-red-600 text-sm md:text-base">
                    {section.seats.filter(seat => seat.status === 'occupied').length}
                  </div>
                  <div className="text-gray-600">Occupied</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-bold text-gray-600 text-sm md:text-base">{section.seats.length}</div>
                  <div className="text-gray-600">Total</div>
                </div>
              </div>

              {/* Detailed Seat Grid - Mobile Optimized */}
              {selectedSection === section.id && (
                <div className="space-y-4">
                  <div className="text-xs md:text-sm text-gray-600 px-2 md:px-4 bg-blue-50 p-2 rounded">
                    💡 <strong>Tip:</strong> Tap seats to see pricing and booking options. Green seats are available!
                  </div>
                  <div className="grid grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1 md:gap-2 p-3 md:p-4 bg-gray-50 rounded overflow-x-auto">
                    {section.seats.map((seat) => (
                      <div
                        key={seat.id}
                        className={`
                          w-7 h-7 md:w-8 md:h-8 rounded text-xs flex items-center justify-center text-white font-medium
                          cursor-pointer transition-all duration-200 transform active:scale-95 md:hover:scale-110 hover:shadow-lg
                          ${getSeatStatusColor(seat.status)}
                          ${seat.status === 'available' ? 'ring-2 ring-green-300 ring-opacity-50' : ''}
                        `}
                        title={`Row ${seat.row}, Seat ${seat.number}
Status: ${seat.status.toUpperCase()}
${seat.price ? `Price: ₦${seat.price.toLocaleString()}` : ''}
${seat.category ? `Category: ${seat.category}` : ''}
${seat.status === 'available' ? '✅ Tap to select' : seat.status === 'occupied' ? '❌ Already taken' : seat.status === 'reserved' ? '⏳ Temporarily held' : '🚫 Not available'}`}
                        onClick={() => {
                          if (seat.status === 'available') {
                            const message = `Seat ${seat.row}${seat.number} Selected!

Price: ₦${seat.price?.toLocaleString() || 'N/A'}
Category: ${seat.category || 'Standard'}
Status: Available for booking

Ready to proceed with booking?`;
                            
                            if (confirm(message)) {
                              alert('In a real booking system, you would now be redirected to the secure payment page.');
                            }
                          } else {
                            alert(`Seat ${seat.row}${seat.number} is ${seat.status}. Please select an available (green) seat.`);
                          }
                        }}
                      >
                        {seat.number}
                      </div>
                    ))}
                  </div>
                  <div className="text-center text-xs md:text-sm text-gray-500 bg-white p-2 rounded">
                    <span className="font-medium text-green-600">
                      {section.seats.filter(s => s.status === 'available').length}
                    </span> seats available in this section
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Refresh Note - Mobile Optimized */}
        <div className="mt-6 text-center text-xs md:text-sm text-gray-500 bg-white p-3 rounded-lg border">
          {autoRefresh ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live updates every {refreshInterval / 1000}s</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>Auto-refresh paused. Tap "Live" to resume.</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SeatHeatmap;