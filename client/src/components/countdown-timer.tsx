import React, { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface CountdownTimerProps {
  event: {
    id: number;
    name: string;
    location: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  registration?: {
    id: number;
    registrationType: string;
    status: string;
  };
  showEventDetails?: boolean;
  size?: 'compact' | 'normal' | 'large';
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function CountdownTimer({ 
  event, 
  registration, 
  showEventDetails = true, 
  size = 'normal' 
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0
  });
  const [eventStatus, setEventStatus] = useState<'upcoming' | 'live' | 'ended'>('upcoming');

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const startTime = new Date(event.startDate).getTime();
      const endTime = new Date(event.endDate).getTime();
      
      if (now < startTime) {
        // Event hasn't started
        const distance = startTime - now;
        setEventStatus('upcoming');
        setTimeRemaining({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
          total: distance
        });
      } else if (now >= startTime && now < endTime) {
        // Event is live
        const distance = endTime - now;
        setEventStatus('live');
        setTimeRemaining({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
          total: distance
        });
      } else {
        // Event has ended
        setEventStatus('ended');
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0
        });
      }
    };

    calculateTimeRemaining();
    const timer = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(timer);
  }, [event.startDate, event.endDate]);

  const getStatusBadge = () => {
    switch (eventStatus) {
      case 'upcoming':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Upcoming</Badge>;
      case 'live':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 animate-pulse">Live Now</Badge>;
      case 'ended':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Ended</Badge>;
    }
  };

  const getCountdownMessage = () => {
    switch (eventStatus) {
      case 'upcoming':
        return 'Event starts in:';
      case 'live':
        return 'Event ends in:';
      case 'ended':
        return 'Event has ended';
    }
  };

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  if (size === 'compact') {
    return (
      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
        <Clock className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-800">
          {eventStatus === 'ended' ? 'Event ended' : 
           eventStatus === 'live' ? 'Live now' :
           `${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m`}
        </span>
        {eventStatus === 'live' && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
      </div>
    );
  }

  return (
    <Card className={`${eventStatus === 'live' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-lg flex items-center gap-2 ${
            eventStatus === 'live' ? 'text-green-800' : 'text-blue-800'
          }`}>
            <Clock className="h-5 w-5" />
            {showEventDetails ? event.name : 'Your Event'}
          </CardTitle>
          {getStatusBadge()}
        </div>
        {showEventDetails && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(event.startDate).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {event.location}
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="text-center">
          <p className={`text-sm font-medium mb-4 ${
            eventStatus === 'live' ? 'text-green-700' : 'text-blue-700'
          }`}>
            {getCountdownMessage()}
          </p>
          
          {eventStatus !== 'ended' && (
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  eventStatus === 'live' ? 'text-green-800' : 'text-blue-800'
                }`}>
                  {formatTime(timeRemaining.days)}
                </div>
                <div className="text-xs text-gray-600">Days</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  eventStatus === 'live' ? 'text-green-800' : 'text-blue-800'
                }`}>
                  {formatTime(timeRemaining.hours)}
                </div>
                <div className="text-xs text-gray-600">Hours</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  eventStatus === 'live' ? 'text-green-800' : 'text-blue-800'
                }`}>
                  {formatTime(timeRemaining.minutes)}
                </div>
                <div className="text-xs text-gray-600">Minutes</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  eventStatus === 'live' ? 'text-green-800' : 'text-blue-800'
                }`}>
                  {formatTime(timeRemaining.seconds)}
                </div>
                <div className="text-xs text-gray-600">Seconds</div>
              </div>
            </div>
          )}
          
          {registration && (
            <div className="mt-4 p-3 bg-white rounded-lg border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Registration Status:</span>
                <Badge variant={registration.status === 'attended' ? 'default' : 'outline'}>
                  {registration.status === 'attended' ? 'Attended' : 'Registered'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium capitalize">{registration.registrationType}</span>
              </div>
            </div>
          )}
          
          {eventStatus === 'live' && (
            <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
              <p className="text-sm text-green-800 font-medium">
                🎉 Event is happening now! Don't forget to check in.
              </p>
            </div>
          )}
          
          {eventStatus === 'ended' && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">
                This event has concluded. Thank you for participating!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}