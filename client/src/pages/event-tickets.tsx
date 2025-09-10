import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Search, 
  Ticket, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Download
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface RegistrationData {
  id: string;
  eventId: string;
  registrationType: string;
  firstName: string;
  lastName: string;
  email: string;
  auxiliaryBody: string;
  status: 'registered' | 'validated' | 'cancelled';
  paymentStatus: 'not_required' | 'pending' | 'completed' | 'failed';
  paymentAmount?: number;
  paymentReceiptUrl?: string;
  uniqueId: string;
  qrCode?: string;
  customData: any;
  createdAt: string;
  memberId?: string;
}

export default function EventTickets() {
  const [, params] = useRoute("/events/:eventId/tickets");
  const eventId = params?.eventId;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch event details
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  // Fetch registrations for this event
  const { data: registrations = [], isLoading: registrationsLoading } = useQuery<RegistrationData[]>({
    queryKey: [`/api/events/${eventId}/registrations`],
    enabled: !!eventId,
    staleTime: 0, // Force fresh data
    gcTime: 0, // Don't cache this query (TanStack Query v5)
  });

  // Filter registrations based on search and status
  const filteredRegistrations = registrations.filter((registration) => {
    if (!registration) return false;
    
    const fullName = `${registration.firstName} ${registration.lastName}`;
    const matchesSearch = 
      (registration.uniqueId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (registration.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (registration.auxiliaryBody || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || registration.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Group registrations by auxiliary body
  const registrationsByCategory = filteredRegistrations.reduce((acc, registration) => {
    const category = registration.auxiliaryBody || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(registration);
    return acc;
  }, {} as Record<string, RegistrationData[]>);
  
  console.log('Registrations data:', registrations);
  console.log('Filtered registrations:', filteredRegistrations);
  console.log('Registrations by category:', registrationsByCategory);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return 'bg-green-100 text-green-800';
      case 'validated':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusIcon = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'not_required':
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (eventLoading || registrationsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Event Not Found</h1>
        <Link href="/events">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link href="/events">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Events
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{(event as any)?.name} - Registrations</h1>
              <p className="text-gray-600">Manage and view event registrations</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            <Ticket className="h-3 w-3 mr-1" />
            Ticket Event
          </Badge>
        </div>

        {/* Event Info Card */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{registrations.length}</div>
                <div className="text-sm text-gray-600">Total Registrations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {registrations.filter(r => r.status === 'registered').length}
                </div>
                <div className="text-sm text-gray-600">Registered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {registrations.filter(r => r.status === 'validated').length}
                </div>
                <div className="text-sm text-gray-600">Checked In</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(registrationsByCategory).length}
                </div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search by ID, email, name, or auxiliary body..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-registrations"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                data-testid="button-filter-all"
              >
                All ({registrations.length})
              </Button>
              <Button
                variant={statusFilter === "registered" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("registered")}
                data-testid="button-filter-registered"
              >
                Registered ({registrations.filter(r => r.status === 'registered').length})
              </Button>
              <Button
                variant={statusFilter === "validated" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("validated")}
                data-testid="button-filter-validated"
              >
                Checked In ({registrations.filter(r => r.status === 'validated').length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registrations by Category */}
      {Object.keys(registrationsByCategory).length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Registrations Found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== "all" 
                ? "No registrations match your current filters." 
                : "No registrations have been made for this event yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(registrationsByCategory).map(([category, categoryRegistrations]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Ticket className="h-5 w-5 mr-2 text-purple-600" />
                    {category}
                  </span>
                  <Badge variant="outline">
                    {categoryRegistrations.length} registration{categoryRegistrations.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(categoryRegistrations as RegistrationData[]).map((registration) => (
                    <div 
                      key={registration.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50"
                      data-testid={`registration-card-${registration.uniqueId}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="font-mono text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                            {registration.uniqueId}
                          </div>
                          <Badge className={getStatusBadge(registration.status)}>
                            {registration.status === 'registered' ? 'Registered' : registration.status === 'validated' ? 'Checked In' : registration.status}
                          </Badge>
                          <div className="flex items-center">
                            {getPaymentStatusIcon(registration.paymentStatus)}
                            <span className="ml-1 text-sm text-gray-600">
                              {registration.paymentStatus === 'not_required' ? 'Free' : registration.paymentStatus}
                            </span>
                          </div>
                        </div>
                        {registration.paymentAmount && (
                          <div className="flex items-center text-sm text-gray-600">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {registration.paymentAmount} NGN
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-medium">{registration.firstName} {registration.lastName}</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          <span data-testid={`text-email-${registration.uniqueId}`}>
                            {registration.email}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{registration.registrationType}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Registered: {format(new Date(registration.createdAt), 'PPp')}
                        </div>
                        {registration.status === 'validated' && (
                          <div className="flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                            Checked In
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}