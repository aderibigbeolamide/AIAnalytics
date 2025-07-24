import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Ticket, CheckCircle, XCircle, Clock, User, Mail, Phone, Camera, Search, ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getAuthHeaders } from "@/lib/auth";
import { QRScanner } from "@/components/qr-scanner";

interface ValidationResult {
  success: boolean;
  message: string;
  ticket?: any;
  usedAt?: string;
  requiresPayment?: boolean;
  paymentStatus?: string;
  paymentMethod?: string;
}

export default function TicketScanner() {
  const { eventId } = useParams<{ eventId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [manualTicketId, setManualTicketId] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [scannerActive, setScannerActive] = useState(false);

  console.log('TicketScanner component mounted with eventId:', eventId);

  // Force execution of query with debugging
  const { data: event, isLoading, error, refetch } = useQuery<any>({
    queryKey: [`ticket-scanner-event-${eventId}`],
    queryFn: async () => {
      console.log('=== TICKET SCANNER QUERY EXECUTING ===');
      console.log('Fetching event with ID:', eventId);
      console.log('Auth headers:', getAuthHeaders());
      
      const response = await fetch(`/api/events/${eventId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      
      console.log('Event fetch response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response body:', errorText);
        throw new Error(`Failed to fetch event: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Event data received:', data);
      console.log('Event type from data:', data.eventType);
      console.log('=== END QUERY ===');
      return data;
    },
    enabled: true, // Always try to fetch
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Refetch event data when component mounts
  useEffect(() => {
    if (eventId) {
      refetch();
    }
  }, [eventId, refetch]);

  const validateTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const response = await fetch(`/api/tickets/${ticketId}/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        // Throw the entire result object so we can access payment details
        const error = new Error(result.message || "Validation failed");
        (error as any).details = result; // Attach the full response for error handling
        throw error;
      }

      return result;
    },
    onSuccess: (result) => {
      setValidationResult({
        success: true,
        message: result.message,
        ticket: result.ticket,
      });
      
      toast({
        title: "Ticket Validated!",
        description: result.message,
      });
      
      // Refresh event tickets
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "tickets"] });
    },
    onError: (error: any) => {
      // Get error details from the attached details object
      const errorDetails = (error as any).details || {};

      setValidationResult({
        success: false,
        message: error.message,
        requiresPayment: errorDetails.requiresPayment || false,
        paymentStatus: errorDetails.paymentStatus,
        paymentMethod: errorDetails.paymentMethod,
      });
      
      toast({
        title: errorDetails.requiresPayment ? "Payment Required" : "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleQRScan = (data: string) => {
    try {
      // Extract ticket ID from QR code data
      // This would need to match the QR code format from the ticket system
      const ticketId = data.split('/').pop() || data;
      validateTicketMutation.mutate(ticketId);
      setScannerActive(false);
    } catch (error) {
      toast({
        title: "Invalid QR Code",
        description: "Could not parse ticket information from QR code",
        variant: "destructive",
      });
    }
  };

  const handleManualValidation = () => {
    if (!manualTicketId.trim()) {
      toast({
        title: "Ticket ID Required",
        description: "Please enter a ticket ID",
        variant: "destructive",
      });
      return;
    }

    validateTicketMutation.mutate(manualTicketId.trim());
  };

  const clearResult = () => {
    setValidationResult(null);
    setManualTicketId("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Error loading event</p>
            <p className="text-center text-xs text-red-500 mt-2">
              {error.message}
            </p>
            <p className="text-center text-xs text-gray-500 mt-2">
              Event ID: {eventId}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Event not found</p>
            <p className="text-center text-xs text-gray-500 mt-2">
              Event ID: {eventId}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }



  if (event.eventType !== "ticket") {
    console.log('Event type check failed:', {
      eventType: event.eventType,
      fullEvent: event,
      eventId,
      error
    });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              This is not a ticket-based event
            </p>
            <p className="text-center text-xs text-gray-500 mt-2">
              Event Type: {event.eventType || 'undefined'}
            </p>
            <p className="text-center text-xs text-gray-500">
              Event ID: {eventId}
            </p>
            <p className="text-center text-xs text-red-500 mt-2">
              {error?.message || 'No error'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link href="/events">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Button>
          </Link>
        </div>

        {/* Event Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{event.name}</CardTitle>
                <CardDescription className="mt-2">Ticket Validation Scanner</CardDescription>
              </div>
              <Badge variant="secondary" className="ml-4">
                <Ticket className="h-4 w-4 mr-1" />
                Ticket Scanner
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Scan ticket QR codes or enter ticket IDs manually to validate entry
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="h-5 w-5" />
                <span>QR Code Scanner</span>
              </CardTitle>
              <CardDescription>
                Scan ticket QR codes with your camera
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scannerActive ? (
                <div className="space-y-4">
                  <QRScanner onClose={() => setScannerActive(false)} />
                  <Button 
                    variant="outline" 
                    onClick={() => setScannerActive(false)}
                    className="w-full"
                  >
                    Stop Scanner
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => setScannerActive(true)}
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Start QR Scanner
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Manual Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Manual Entry</span>
              </CardTitle>
              <CardDescription>
                Enter ticket ID manually for validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter ticket ID or number"
                  value={manualTicketId}
                  onChange={(e) => setManualTicketId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualValidation();
                    }
                  }}
                />
                <Button
                  onClick={handleManualValidation}
                  disabled={validateTicketMutation.isPending}
                >
                  {validateTicketMutation.isPending ? (
                    <LoadingSpinner />
                  ) : (
                    "Validate"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Validation Result */}
          {validationResult && (
            <div className="lg:col-span-2">
              <Card className={`border-2 ${
                validationResult.success 
                  ? "border-green-200 bg-green-50" 
                  : "border-red-200 bg-red-50"
              }`}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {validationResult.success ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                    <span className={validationResult.success ? "text-green-600" : "text-red-600"}>
                      {validationResult.success ? "Ticket Valid" : "Validation Failed"}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {validationResult.message}
                    {validationResult.requiresPayment && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800 font-medium">
                          💳 Payment Status: {validationResult.paymentStatus || 'pending'}
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Method: {validationResult.paymentMethod === 'paystack' ? 'Online Payment' : 'Manual Payment'}
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Please complete payment before entry is allowed.
                        </p>
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                
                {validationResult.success && validationResult.ticket && (
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Ticket className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{validationResult.ticket.ticketNumber}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{validationResult.ticket.ownerName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{validationResult.ticket.ownerEmail}</span>
                        </div>
                        {validationResult.ticket.ownerPhone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{validationResult.ticket.ownerPhone}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <span className="text-muted-foreground text-sm">Ticket Type:</span>
                          <p className="font-medium">{validationResult.ticket.ticketType}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-sm">Price:</span>
                          <p className="font-medium">
                            {validationResult.ticket.price} {validationResult.ticket.currency}
                          </p>
                        </div>
                        {validationResult.ticket.usedAt && (
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              Validated: {new Date(validationResult.ticket.usedAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
                
                <CardContent className="pt-0">
                  <Button variant="outline" onClick={clearResult}>
                    Scan Another Ticket
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}