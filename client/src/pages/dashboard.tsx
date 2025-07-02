import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Navbar } from "@/components/navbar";
import { MemberForm } from "@/components/member-form";
import { EventForm } from "@/components/event-form";
import { QRScanner } from "@/components/qr-scanner";
import { getAuthHeaders } from "@/lib/auth";
import { Link } from "wouter";
import { 
  Users, 
  Calendar, 
  QrCode, 
  CheckCircle, 
  Plus, 
  UserPlus, 
  Edit, 
  Download,
  BarChart,
  UsersRound,
  Settings,
  Camera,
  Bot
} from "lucide-react";

export default function Dashboard() {
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState("all");
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats", {
        headers: getAuthHeaders(),
      });
      return response.json();
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const response = await fetch("/api/events", {
        headers: getAuthHeaders(),
      });
      return response.json();
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["/api/members", memberFilter, memberSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (memberFilter !== "all") params.append("auxiliaryBody", memberFilter);
      if (memberSearch) params.append("search", memberSearch);
      
      const response = await fetch(`/api/members?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      return response.json();
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: "bg-green-100 text-green-800",
      upcoming: "bg-blue-100 text-blue-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return statusMap[status as keyof typeof statusMap] || "bg-gray-100 text-gray-800";
  };

  const getAuxiliaryBodyBadge = (auxiliaryBody: string) => {
    const auxiliaryMap = {
      Atfal: "bg-green-100 text-green-800",
      Khuddam: "bg-blue-100 text-blue-800",
      Lajna: "bg-pink-100 text-pink-800",
      Ansarullah: "bg-purple-100 text-purple-800",
    };
    return auxiliaryMap[auxiliaryBody as keyof typeof auxiliaryMap] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Management Dashboard</h1>
          <p className="text-gray-600">Manage members, events, and track attendance with AI-powered validation</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalMembers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Events</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.activeEvents || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <QrCode className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">QR Scans Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.scansToday || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Validation Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.validationRate?.toFixed(1) || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Events */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Events</CardTitle>
                  <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Event
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
                      </DialogHeader>
                      <EventForm 
                        event={editingEvent}
                        onClose={() => {
                          setIsEventModalOpen(false);
                          setEditingEvent(null);
                        }} 
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.map((event: any) => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{event.name}</h3>
                          <p className="text-sm text-gray-600">
                            Eligible: {event.eligibleAuxiliaryBodies?.join(", ")} • {new Date(event.startDate).toLocaleDateString()}
                          </p>
                          <div className="flex items-center mt-2 space-x-4">
                            <Badge className={getStatusBadge(event.status)}>
                              {event.status}
                            </Badge>
                            <span className="text-sm text-gray-600">Location: {event.location}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Link href={`/events/${event.id}`}>
                            <Button variant="outline" size="sm">
                              View Event
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm">
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingEvent(event);
                              setIsEventModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Member Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Member Management</CardTitle>
                  <Dialog open={isMemberModalOpen} onOpenChange={setIsMemberModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-green-600 hover:bg-green-700">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add New Member</DialogTitle>
                      </DialogHeader>
                      <MemberForm onClose={() => setIsMemberModalOpen(false)} />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search members..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                      />
                    </div>
                    <Select value={memberFilter} onValueChange={setMemberFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by auxiliary body" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Auxiliary Bodies</SelectItem>
                        <SelectItem value="Atfal">Atfal</SelectItem>
                        <SelectItem value="Khuddam">Khuddam</SelectItem>
                        <SelectItem value="Lajna">Lajna</SelectItem>
                        <SelectItem value="Ansarullah">Ansarullah</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auxiliary Body</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chanda #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {members.map((member: any) => (
                        <tr key={member.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {member.firstName?.[0]}{member.lastName?.[0]}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {member.firstName} {member.lastName}
                                </div>
                                <div className="text-sm text-gray-500">{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getAuxiliaryBodyBadge(member.auxiliaryBody)}>
                              {member.auxiliaryBody}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.chandaNumber || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusBadge(member.status)}>
                              {member.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button variant="ghost" size="sm" className="mr-2">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <QrCode className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* QR Scanner */}
            <Card>
              <CardHeader>
                <CardTitle>QR Code Scanner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="bg-gray-100 rounded-lg p-8 mb-4">
                    <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600">Camera will activate when scanning</p>
                  </div>
                  <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <Camera className="h-4 w-4 mr-2" />
                        Start Scanning
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>QR Code Scanner</DialogTitle>
                      </DialogHeader>
                      <QRScanner onClose={() => setIsScannerOpen(false)} />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* AI Validation Status */}
            <Card>
              <CardHeader>
                <CardTitle>AI Validation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Face Recognition</span>
                    <Badge className="bg-green-100 text-green-800">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                      Online
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Member Lookup</span>
                    <Badge className="bg-green-100 text-green-800">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Eligibility Check</span>
                    <Badge className="bg-green-100 text-green-800">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                      Running
                    </Badge>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center">
                    <Bot className="h-5 w-5 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">AI Status</p>
                      <p className="text-xs text-blue-600">Processing validation in real-time</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-3" />
                  Export Attendance
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart className="h-4 w-4 mr-3" />
                  View Analytics
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <UsersRound className="h-4 w-4 mr-3" />
                  Manage Invitees
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-3" />
                  System Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
