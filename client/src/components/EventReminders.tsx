import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { 
  Bell, 
  Calendar, 
  Clock, 
  MapPin, 
  Send, 
  Users,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface EventRemindersProps {
  userRole?: string;
}

export default function EventReminders({ userRole }: EventRemindersProps) {
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [customTimeRemaining, setCustomTimeRemaining] = useState<string>('');
  const queryClient = useQueryClient();

  // Only show for admin and super admin
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return null;
  }

  // Fetch upcoming events for reminders
  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/events/upcoming-reminders'],
  });

  // Fetch reminder statistics
  const { data: reminderStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/events/reminder-stats'],
  });

  // Send manual reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async ({ eventId, timeRemaining }: { eventId: string; timeRemaining: string }) => {
      const response = await fetch(`/api/events/${eventId}/send-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ timeRemaining })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reminder Sent",
        description: "Event reminder has been sent to all participants",
      });
      setSelectedEvent('');
      setCustomTimeRemaining('');
      queryClient.invalidateQueries({ queryKey: ['/api/events/reminder-stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Reminder",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Process all reminders mutation
  const processAllRemindersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/system/process-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-System-API-Key': 'your-system-api-key' // In production, this would be configured properly
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reminders Processed",
        description: "All pending event reminders have been processed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events/reminder-stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSendReminder = () => {
    if (!selectedEvent || !customTimeRemaining) {
      toast({
        title: "Missing Information",
        description: "Please select an event and specify time remaining",
        variant: "destructive",
      });
      return;
    }

    sendReminderMutation.mutate({
      eventId: selectedEvent,
      timeRemaining: customTimeRemaining
    });
  };

  const handleProcessAllReminders = () => {
    processAllRemindersMutation.mutate();
  };

  if (eventsLoading || statsLoading) {
    return (
      <Card data-testid="event-reminders-loading">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading reminder data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const events = upcomingEvents?.events || [];
  const stats = reminderStats?.stats || {};

  return (
    <div className="space-y-6" data-testid="event-reminders-container">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="stat-upcoming-events">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{stats.upcomingEvents || 0}</p>
                <p className="text-sm text-muted-foreground">Upcoming Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-events-24h">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{stats.eventsIn24Hours || 0}</p>
                <p className="text-sm text-muted-foreground">Within 24 Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-events-week">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{stats.eventsInWeek || 0}</p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-event-types">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-muted-foreground">Event Types</p>
                <div className="flex gap-2 mt-1">
                  {stats.eventsByType && Object.entries(stats.eventsByType).map(([type, count]: [string, unknown]) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}: {count as number}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Reminder Sending */}
      <Card data-testid="manual-reminder-section">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Send Manual Reminder
          </CardTitle>
          <CardDescription>
            Send a custom reminder to all participants of a specific event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-select">Select Event</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger data-testid="select-event">
                  <SelectValue placeholder="Choose an event..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event: any) => (
                    <SelectItem key={event.id} value={event.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{event.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(event.startDate).toLocaleDateString()} - {event.location}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="time-remaining">Time Remaining Description</Label>
              <Select value={customTimeRemaining} onValueChange={setCustomTimeRemaining}>
                <SelectTrigger data-testid="select-time-remaining">
                  <SelectValue placeholder="Select time frame..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7 days">7 days</SelectItem>
                  <SelectItem value="3 days">3 days</SelectItem>
                  <SelectItem value="1 day">1 day</SelectItem>
                  <SelectItem value="24 hours">24 hours</SelectItem>
                  <SelectItem value="12 hours">12 hours</SelectItem>
                  <SelectItem value="6 hours">6 hours</SelectItem>
                  <SelectItem value="2 hours">2 hours</SelectItem>
                  <SelectItem value="1 hour">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSendReminder}
              disabled={sendReminderMutation.isPending || !selectedEvent || !customTimeRemaining}
              data-testid="button-send-reminder"
            >
              {sendReminderMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminder
                </>
              )}
            </Button>

            <Button 
              variant="outline"
              onClick={handleProcessAllReminders}
              disabled={processAllRemindersMutation.isPending}
              data-testid="button-process-all"
            >
              {processAllRemindersMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Process All Reminders
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events List */}
      <Card data-testid="upcoming-events-list">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Upcoming Events
          </CardTitle>
          <CardDescription>
            Events scheduled for the next 7 days that will receive automatic reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8" data-testid="no-upcoming-events">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">No upcoming events in the next 7 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event: any) => {
                const eventDate = new Date(event.startDate);
                const now = new Date();
                const timeDiff = eventDate.getTime() - now.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                const hoursDiff = Math.ceil(timeDiff / (1000 * 3600));

                return (
                  <div 
                    key={event.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    data-testid={`event-${event.id}`}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{event.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString()}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {event.location}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={daysDiff <= 1 ? "destructive" : daysDiff <= 3 ? "default" : "secondary"}
                        data-testid={`badge-time-${event.id}`}
                      >
                        {daysDiff > 0 ? `${daysDiff} day${daysDiff > 1 ? 's' : ''}` : `${hoursDiff} hour${hoursDiff > 1 ? 's' : ''}`}
                      </Badge>
                      
                      <Badge variant="outline" data-testid={`badge-type-${event.id}`}>
                        {event.eventType}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Schedule Info */}
      <Card data-testid="reminder-schedule-info">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Automatic Reminder Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Email & In-App Reminders</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• 7 days before event</li>
                <li>• 3 days before event</li>
                <li>• 1 day before event</li>
                <li>• 24 hours before event</li>
                <li>• 2 hours before event</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Reminder Features</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Event details and location</li>
                <li>• Check-in instructions</li>
                <li>• QR code for tickets</li>
                <li>• Contact information</li>
                <li>• Event updates</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}