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
import { Calendar, Edit, QrCode, Users, Download, BarChart3, Eye, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

export default function Events() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ["/api/events", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const response = await fetch(`/api/events?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      return response.json();
    },
  });

  const exportAttendance = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await fetch(`/api/events/${eventId}/export-attendance`, {
        headers: getAuthHeaders(),
      });
      
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      "upcoming": "bg-blue-100 text-blue-800",
      "active": "bg-green-100 text-green-800",
      "completed": "bg-gray-100 text-gray-800",
      "cancelled": "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const filteredEvents = events.filter((event: any) => 
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <p className="text-sm font-medium text-gray-600">Active Events</p>
                <p className="text-2xl font-bold text-gray-900">
                  {events.filter((e: any) => e.status === 'active').length}
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredEvents.map((event: any) => (
                <Card key={event.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{event.name}</CardTitle>
                      <Badge className={getStatusBadge(event.status)}>
                        {event.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
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
                            {new Date(event.startDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Registration Stats */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Total Registrations:</span>
                          <span className="font-bold text-blue-600">{event.totalRegistrations || 0}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <div className="font-medium text-green-600">{event.memberRegistrations || 0}</div>
                            <div className="text-gray-500">Members</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-blue-600">{event.guestRegistrations || 0}</div>
                            <div className="text-gray-500">Guests</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-purple-600">{event.inviteeRegistrations || 0}</div>
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