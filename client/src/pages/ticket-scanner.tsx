import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Ticket, CheckCircle, XCircle, Clock, User, Mail, Phone, Camera, Search } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getAuthHeaders } from "@/lib/auth";
import { QRScanner } from "@/components/qr-scanner";

interface ValidationResult {
  success: boolean;
  message: string;
  ticket?: any;
  usedAt?: string;
}

export default function TicketScanner() {
  const { eventId } = useParams<{ eventId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [manualTicketId, setManualTicketId] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [scannerActive, setScannerActive] = useState(false);

  // Fetch event details
  const { data: event, isLoading } = useQuery<any>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

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
        throw new Error(result.message || "Validation failed");
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
      setValidationResult({
        success: false,
        message: error.message,
      });
      
      toast({
        title: "Validation Failed",
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

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Event not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (event.eventType !== "ticket") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              This is not a ticket-based event
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
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