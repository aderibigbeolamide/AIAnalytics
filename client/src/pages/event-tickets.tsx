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

interface TicketData {
  id: string;
  ticketNumber: string;
  ownerEmail: string;
  ownerPhone?: string;
  ownerName?: string;
  category: string;
  price: string;
  currency: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  validatedAt?: string;
  createdAt: string;
  transferHistory: any[];
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

  // Fetch tickets for this event
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<TicketData[]>({
    queryKey: [`/api/events/${eventId}/tickets`],
    enabled: !!eventId,
    staleTime: 0, // Force fresh data
    gcTime: 0, // Don't cache this query (TanStack Query v5)
  });

  // Filter tickets based on search and status
  const filteredTickets = tickets.filter((ticket) => {
    if (!ticket) return false;
    
    const matchesSearch = 
      (ticket.ticketNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.ownerEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.ownerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.category || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Group tickets by category
  const ticketsByCategory = filteredTickets.reduce((acc, ticket) => {
    const category = ticket.category || 'Standard Tickets';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(ticket);
    return acc;
  }, {} as Record<string, TicketData[]>);
  
  console.log('Tickets data:', tickets);
  console.log('Filtered tickets:', filteredTickets);
  console.log('Tickets by category:', ticketsByCategory);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'used':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusIcon = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'refunded':
        return <XCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (eventLoading || ticketsLoading) {
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
              <h1 className="text-2xl font-bold">{(event as any)?.name} - Tickets</h1>
              <p className="text-gray-600">Manage and view event tickets</p>
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
                <div className="text-2xl font-bold text-blue-600">{tickets.length}</div>
                <div className="text-sm text-gray-600">Total Tickets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {tickets.filter(t => t.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {tickets.filter(t => t.status === 'used').length}
                </div>
                <div className="text-sm text-gray-600">Used</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(ticketsByCategory).length}
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
                  placeholder="Search by ticket number, email, or owner name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-tickets"
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
                All ({tickets.length})
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
                data-testid="button-filter-active"
              >
                Active ({tickets.filter(t => t.status === 'active').length})
              </Button>
              <Button
                variant={statusFilter === "used" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("used")}
                data-testid="button-filter-used"
              >
                Used ({tickets.filter(t => t.status === 'used').length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets by Category */}
      {Object.keys(ticketsByCategory).length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Tickets Found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== "all" 
                ? "No tickets match your current filters." 
                : "No tickets have been purchased for this event yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(ticketsByCategory).map(([category, categoryTickets]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Ticket className="h-5 w-5 mr-2 text-purple-600" />
                    {category}
                  </span>
                  <Badge variant="outline">
                    {categoryTickets.length} ticket{categoryTickets.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(categoryTickets as TicketData[]).map((ticket) => (
                    <div 
                      key={ticket.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50"
                      data-testid={`ticket-card-${ticket.ticketNumber}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="font-mono text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                            {ticket.ticketNumber}
                          </div>
                          <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                            {ticket.category}
                          </Badge>
                          <Badge className={getStatusBadge(ticket.status)}>
                            {ticket.status === 'active' ? 'Active' : ticket.status === 'used' ? 'Used' : ticket.status}
                          </Badge>
                          <div className="flex items-center">
                            {getPaymentStatusIcon(ticket.paymentStatus)}
                            <span className="ml-1 text-sm text-gray-600">
                              {ticket.paymentStatus}
                            </span>
                          </div>
                        </div>
                        {ticket.price && (
                          <div className="flex items-center text-sm text-gray-600">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {ticket.price} {ticket.currency}
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-medium">{ticket.ownerName || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          <span data-testid={`text-email-${ticket.ticketNumber}`}>
                            {ticket.ownerEmail}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-sm">{ticket.ownerPhone || 'Not provided'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Purchased: {format(new Date(ticket.createdAt), 'PPp')}
                        </div>
                        {ticket.status === 'used' && ticket.validatedAt && (
                          <div className="flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                            Used: {format(new Date(ticket.validatedAt), 'PPp')}
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