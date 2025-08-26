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

  const { data: rawEvents = [] } = useQuery({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/events`);
      const data = await response.json();
      console.log('Raw events data received:', data);
      if (data.length > 0) {
        console.log('Sample event _doc data:', data[0]._doc);
        console.log('Sample event properties:', Object.keys(data[0]));
      }
      
      // Extract clean data from MongoDB objects
      const cleanEvents = data.map((event: any) => {
        // If it's a MongoDB object, extract from _doc
        const eventData = event._doc || event;
        return {
          id: eventData._id?.toString() || event.id,
          name: eventData.name,
          description: eventData.description,
          location: eventData.location,
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          eventImage: eventData.eventImage,
          eventType: eventData.eventType,
          status: eventData.status,
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
          createdAt: eventData.createdAt,
          updatedAt: eventData.updatedAt
        };
      });
      
      console.log('Processed clean events:', cleanEvents);
      if (cleanEvents.length > 0) {
        console.log('Sample clean event:', cleanEvents[0]);
      }
      
      return cleanEvents;
    },
  });

  // Use the processed events
  const events = rawEvents;

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
    const end = event.endDate ? new Date(event.endDate) : new Date(event.startDate);
    
    // If dates are invalid, return a default status
    if (isNaN(start.getTime())) return 'upcoming';
    
    // Check if event is cancelled
    if (event.status === 'cancelled') return 'cancelled';
    
    // For events without end date, consider them as single-day events
    if (!event.endDate) {
      const eventDate = new Date(start);
      eventDate.setHours(23, 59, 59); // End of day
      if (now < start) return 'upcoming';
      if (now >= start && now <= eventDate) return 'ongoing';
      return 'ended';
    }
    
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
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

            {/* Events Grid */}
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
            
            {filteredEvents.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No events found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}