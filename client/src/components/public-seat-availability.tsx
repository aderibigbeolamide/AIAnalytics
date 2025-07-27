import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Users, Zap, AlertCircle } from 'lucide-react';

interface PublicSeatAvailabilityProps {
  eventId: number;
}

export function PublicSeatAvailability({ eventId }: PublicSeatAvailabilityProps) {
  const { data: seatData, isLoading } = useQuery({
    queryKey: ['/api/events', eventId, 'seat-availability-public'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/seat-availability-public`);
        if (!response.ok) return null;
        return await response.json();
      } catch (error) {
        return null;
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: false,
  });

  if (isLoading || !seatData) {
    return null;
  }

  const occupancyRate = Math.round(((seatData.totalSeats - seatData.availableSeats) / seatData.totalSeats) * 100);
  
  const getAvailabilityColor = () => {
    if (seatData.availableSeats > seatData.totalSeats * 0.5) return 'text-green-600 bg-green-50 border-green-200';
    if (seatData.availableSeats > seatData.totalSeats * 0.2) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getAvailabilityIcon = () => {
    if (seatData.availableSeats > seatData.totalSeats * 0.5) return <Zap className="h-3 w-3" />;
    if (seatData.availableSeats > seatData.totalSeats * 0.2) return <Users className="h-3 w-3" />;
    return <AlertCircle className="h-3 w-3" />;
  };

  const getAvailabilityText = () => {
    if (seatData.availableSeats > seatData.totalSeats * 0.5) return 'High Availability';
    if (seatData.availableSeats > seatData.totalSeats * 0.2) return 'Limited Seats';
    return 'Almost Full';
  };

  return (
    <div className="border-t pt-3 mt-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{seatData.availableSeats}</span> of <span className="font-medium">{seatData.totalSeats}</span> seats available
        </div>
        <Badge 
          variant="outline" 
          className={`text-xs ${getAvailabilityColor()} flex items-center gap-1`}
        >
          {getAvailabilityIcon()}
          {getAvailabilityText()}
        </Badge>
      </div>
      
      {/* Progress bar */}
      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            occupancyRate > 80 ? 'bg-red-500' : 
            occupancyRate > 50 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${occupancyRate}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {occupancyRate}% filled • Updates every 10 seconds
      </div>
    </div>
  );
}