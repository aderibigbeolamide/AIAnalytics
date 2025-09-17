import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { EventForm } from "@/components/event-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { getAuthHeaders } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Edit, QrCode, Users, Download, BarChart3, Eye, UserCheck, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EventImage } from "@/lib/event-utils";
import QRCode from "qrcode";

export default function Events() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/events`);
      const data = await response.json();
      console.log('Fetching events:', data.length, 'received');
      
      // Extract clean data from MongoDB objects
      const cleanEvents = data.map((event: any) => {
        // Check if this is a MongoDB document with _doc property
        let eventData = event;
        
        if (event._doc) {
          eventData = event._doc;
        }
        
        return {
          ...eventData, // Preserve all original fields
          id: eventData._id?.toString() || event.id,
          name: eventData.name || 'Unnamed Event',
          description: eventData.description || '',
          location: eventData.location || 'TBD',
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          eventImage: eventData.eventImage,
          eventType: eventData.eventType || 'registration',
          status: eventData.status || 'active',
          organizationId: eventData.organizationId?.toString(),
          totalRegistrations: event.totalRegistrations || eventData.totalRegistrations || 0,
          memberRegistrations: event.memberRegistrations || eventData.memberRegistrations || 0,
          guestRegistrations: event.guestRegistrations || eventData.guestRegistrations || 0,
          inviteeRegistrations: event.inviteeRegistrations || eventData.inviteeRegistrations || 0,
          attendanceRate: event.attendanceRate || eventData.attendanceRate || 0,
          maxAttendees: eventData.maxAttendees,
          allowGuests: eventData.allowGuests,
          allowInvitees: eventData.allowInvitees,
          ticketCategories: eventData.ticketCategories || [],
          paymentSettings: eventData.paymentSettings,
          // Ensure these essential fields are preserved
          registrationStartDate: eventData.registrationStartDate,
          registrationEndDate: eventData.registrationEndDate,
          eligibleAuxiliaryBodies: eventData.eligibleAuxiliaryBodies || [],
          customRegistrationFields: eventData.customRegistrationFields || [],
          invitations: eventData.invitations || [],
          reminderSettings: eventData.reminderSettings,
          faceRecognitionSettings: eventData.faceRecognitionSettings,
          createdAt: eventData.createdAt,
          updatedAt: eventData.updatedAt
        };
      });
      
      return cleanEvents;
    },
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  const exportAttendance = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await apiRequest("GET", `/api/events/${eventId}/export-attendance`);
      
      if (!response.ok) {
        throw new Error("Failed to export attendance");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Create and download the file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.event.name}_attendance.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Attendance data has been downloaded.",
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Failed to export attendance data.",
        variant: "destructive",
      });
    },
  });

  const getEventStatus = (event: any) => {
    const now = new Date();
    const start = new Date(event.startDate);
    
    // If start date is invalid, return a default status
    if (isNaN(start.getTime())) return 'upcoming';
    
    // Check if event is cancelled
    if (event.status === 'cancelled') return 'cancelled';
    
    // For events with end date
    if (event.endDate) {
      const end = new Date(event.endDate);
      if (isNaN(end.getTime())) {
        // Invalid end date, treat as single day event
        const eventEndTime = new Date(start);
        eventEndTime.setHours(23, 59, 59, 999); // End of start day
        
        if (now < start) return 'upcoming';
        if (now >= start && now <= eventEndTime) return 'ongoing';
        return 'ended';
      }
      
      // Set end time to end of day if no time specified
      if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0) {
        end.setHours(23, 59, 59, 999);
      }
      
      if (now < start) return 'upcoming';
      if (now >= start && now <= end) return 'ongoing';
      return 'ended';
    }
    
    // For events without end date (single-day events)
    const eventEndTime = new Date(start);
    eventEndTime.setHours(23, 59, 59, 999); // End of day
    
    if (now < start) return 'upcoming';
    if (now >= start && now <= eventEndTime) return 'ongoing';
    return 'ended';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      "upcoming": "bg-blue-100 text-blue-800",
      "ongoing": "bg-green-100 text-green-800",
      "ended": "bg-gray-100 text-gray-800",
      "cancelled": "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const filteredEvents = events.filter((event: any) => {
    const matchesSearch = (event.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || getEventStatus(event) === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleShowQR = async (eventId: number, eventName: string) => {
    try {
      const qrData = `${window.location.origin}/register/${eventId}`;
      const qrImage = await QRCode.toDataURL(qrData);
      
      // Create modal to show QR
      const qrWindow = window.open('', '_blank', 'width=400,height=500');
      if (qrWindow) {
        qrWindow.document.write(`
          <html>
            <head><title>Event QR Code - ${eventName}</title></head>
            <body style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
              <h2>${eventName}</h2>
              <p>Scan this QR code to register for the event</p>
              <img src="${qrImage}" alt="Event QR Code" style="max-width: 300px;" />
              <p><small>Registration URL: ${qrData}</small></p>
            </body>
          </html>
        `);
      }
    } catch (error) {
      toast({
        title: "QR Code Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Management</h1>
          <p className="text-gray-600">Create and manage events with detailed analytics</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Ongoing Events</p>
                <p className="text-2xl font-bold text-gray-900">
                  {events.filter((e: any) => getEventStatus(e) === 'ongoing').length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Registrations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {events.reduce((sum: number, e: any) => sum + (e.totalRegistrations || 0), 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Attendance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {events.reduce((sum: number, e: any) => sum + (e.totalAttendance || 0), 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                All Events
              </CardTitle>
              <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Calendar className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingEvent ? "Edit Event" : "Create New Event"}
                    </DialogTitle>
                  </DialogHeader>
                  <EventForm 
                    onClose={() => {
                      setIsEventModalOpen(false);
                      setEditingEvent(null);
                    }} 
                    event={editingEvent}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading events...</p>
                </div>
              </div>
            )}

            {/* No Events Message */}
            {!isLoading && filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria.' 
                    : 'Get started by creating your first event.'
                  }
                </p>
                <Button onClick={() => setIsEventModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </div>
            )}

            {/* Events Grid */}
            {!isLoading && filteredEvents.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredEvents.map((event: any) => (
                <Card key={event.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                  {/* Event Image */}
                  <div className="h-48 overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center relative">
                    {event.eventImage ? (
                      <img 
                        src={event.eventImage} 
                        alt={event.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          console.log('Image failed to load:', event.eventImage);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-white text-center p-4">
                        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-70" />
                        <p className="text-sm font-medium opacity-90">{event.name}</p>
                      </div>
                    )}
                  </div>
                  
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg truncate">{event.name}</CardTitle>
                      <div className="flex space-x-2 ml-2">
                        {event.eventType === "ticket" && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                            Ticket Event
                          </Badge>
                        )}
                        <Badge className={getStatusBadge(getEventStatus(event))}>
                          {getEventStatus(event)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <p className="text-gray-600 text-sm line-clamp-2">{event.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Location:</span>
                          <span className="font-medium">{event.location}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Date:</span>
                          <span className="font-medium">
                            {(() => {
                              try {
                                const date = new Date(event.startDate);
                                if (!isNaN(date.getTime())) {
                                  return date.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  });
                                }
                                return 'No Date Set';
                              } catch (error) {
                                console.log('Date parsing error for event:', event.name, 'startDate:', event.startDate);
                                return 'Invalid Date';
                              }
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Registration Stats */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Total Registrations:</span>
                          <span className="font-bold text-blue-600">
                            {event.totalRegistrations !== undefined ? event.totalRegistrations : 0}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <div className="font-medium text-green-600">
                              {event.memberRegistrations !== undefined ? event.memberRegistrations : 0}
                            </div>
                            <div className="text-gray-500">Members</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-blue-600">
                              {event.guestRegistrations !== undefined ? event.guestRegistrations : 0}
                            </div>
                            <div className="text-gray-500">Guests</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-purple-600">
                              {event.inviteeRegistrations !== undefined ? event.inviteeRegistrations : 0}
                            </div>
                            <div className="text-gray-500">Invitees</div>
                          </div>
                        </div>

                        {/* Attendance Rate */}
                        {event.totalRegistrations > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Attendance Rate:</span>
                              <span className="font-medium">{event.attendanceRate?.toFixed(1)}%</span>
                            </div>
                            <Progress value={event.attendanceRate || 0} className="h-2" />
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {event.eventType === "ticket" ? (
                          // Ticket Event Actions
                          <>
                            <Link href={`/buy-ticket/${event.id}`}>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="bg-purple-50 hover:bg-purple-100 text-purple-700"
                              >
                                <Ticket className="h-3 w-3 mr-1" />
                                Buy Tickets
                              </Button>
                            </Link>
                            <Link href={`/events/${event.id}/scan-tickets`}>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="bg-green-50 hover:bg-green-100 text-green-700"
                                onClick={() => {
                                  console.log('Scan Tickets clicked for event:', event.id);
                                  console.log('Navigating to:', `/events/${event.id}/scan-tickets`);
                                }}
                              >
                                <QrCode className="h-3 w-3 mr-1" />
                                Scan Tickets
                              </Button>
                            </Link>
                            <Link href={`/events/${event.id}/tickets`}>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditingEvent(event);
                                setIsEventModalOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </>
                        ) : (
                          // Traditional Registration Event Actions
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleShowQR(event.id, event.name)}
                            >
                              <QrCode className="h-3 w-3 mr-1" />
                              QR
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditingEvent(event);
                                setIsEventModalOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => exportAttendance.mutate(event.id)}
                              disabled={exportAttendance.isPending}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Export
                            </Button>
                            <Link href={`/events/${event.id}`}>
                              <Button 
                                variant="outline" 
                                size="sm"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}