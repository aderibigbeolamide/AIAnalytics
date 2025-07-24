import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Ticket, Calendar, MapPin, Users, Share2, Download, RefreshCw, User, Mail, Phone } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import QRCode from "qrcode";

const transferTicketSchema = z.object({
  toOwnerName: z.string().min(1, "Recipient name is required"),
  toOwnerEmail: z.string().email("Valid email is required"),
  toOwnerPhone: z.string().optional(),
  transferReason: z.string().optional(),
});

type TransferTicketData = z.infer<typeof transferTicketSchema>;

export default function TicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const form = useForm<TransferTicketData>({
    resolver: zodResolver(transferTicketSchema),
    defaultValues: {
      toOwnerName: "",
      toOwnerEmail: "",
      toOwnerPhone: "",
      transferReason: "",
    },
  });

  // Fetch ticket details
  const { data: ticket, isLoading } = useQuery<any>({
    queryKey: ["/api/tickets", ticketId],
    queryFn: async () => {
      const response = await fetch(`/api/tickets/${ticketId}`);
      if (!response.ok) {
        throw new Error("Ticket not found");
      }
      return response.json();
    },
    enabled: !!ticketId,
  });

  // Fetch event details
  const { data: event } = useQuery<any>({
    queryKey: ["/api/events", ticket?.eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${ticket.eventId}`);
      if (!response.ok) {
        throw new Error("Event not found");
      }
      return response.json();
    },
    enabled: !!ticket?.eventId,
  });

  // Generate QR code when ticket data is available
  useEffect(() => {
    if (ticket?.qrCode) {
      QRCode.toDataURL(ticket.qrCode, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error("Error generating QR code:", err));
    }
  }, [ticket?.qrCode]);

  const transferTicketMutation = useMutation({
    mutationFn: async (data: TransferTicketData) => {
      const response = await fetch(`/api/tickets/${ticketId}/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to transfer ticket");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      toast({
        title: "Transfer Successful!",
        description: "Ticket has been transferred to the new owner.",
      });
      setShowTransferForm(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onTransfer = (data: TransferTicketData) => {
    transferTicketMutation.mutate(data);
  };

  const downloadQRCode = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement("a");
      link.download = `ticket-${ticket?.ticketNumber}.png`;
      link.href = qrCodeDataUrl;
      link.click();
    }
  };

  const downloadFullTicket = () => {
    // Create a new window with ticket details for printing/saving
    const printWindow = window.open('', '_blank');
    if (printWindow && ticket && event) {
      const ticketHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ticket - ${ticket.ticketNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              max-width: 600px; 
              margin: 20px auto; 
              padding: 20px;
              line-height: 1.6;
            }
            .ticket-header { 
              text-align: center; 
              border-bottom: 2px solid #333; 
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .ticket-number { 
              font-size: 24px; 
              font-weight: bold; 
              color: #333;
              margin-bottom: 10px;
            }
            .event-name { 
              font-size: 20px; 
              color: #666;
              margin-bottom: 5px;
            }
            .ticket-type { 
              font-size: 16px; 
              background: #f0f0f0; 
              padding: 5px 10px; 
              border-radius: 15px;
              display: inline-block;
            }
            .event-details { 
              margin: 20px 0;
              padding: 15px;
              background: #f9f9f9;
              border-radius: 8px;
            }
            .detail-row { 
              display: flex; 
              margin-bottom: 10px;
              align-items: center;
            }
            .detail-label { 
              font-weight: bold; 
              width: 120px;
              margin-right: 10px;
            }
            .qr-section { 
              text-align: center; 
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .qr-code { 
              margin: 20px 0;
            }
            .validation-info {
              font-size: 12px;
              color: #666;
              margin-top: 15px;
              padding: 10px;
              background: #f0f0f0;
              border-radius: 5px;
            }
            .contact-info {
              margin-top: 20px;
              padding: 10px;
              background: #f8f9fa;
              border-radius: 5px;
              font-size: 14px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="ticket-header">
            <div class="ticket-number">🎫 ${ticket.ticketNumber}</div>
            <div class="event-name">${event.name}</div>
            <div class="ticket-type">${ticket.ticketType} Ticket</div>
          </div>
          
          <div class="event-details">
            <h3>Event Information</h3>
            <div class="detail-row">
              <div class="detail-label">📅 Date:</div>
              <div>${new Date(event.startDate).toLocaleDateString()}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">🕐 Time:</div>
              <div>${new Date(event.startDate).toLocaleTimeString()}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">📍 Venue:</div>
              <div>${event.location || 'To be announced'}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">💰 Price:</div>
              <div>${ticket.price} ${ticket.currency}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">📧 Contact:</div>
              <div>${ticket.ownerEmail}</div>
            </div>
          </div>

          <div class="qr-section">
            <h3>Validation Code</h3>
            <div class="qr-code">
              <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 200px; height: 200px; border: 1px solid #ddd;" />
            </div>
            <div><strong>Manual Code: ${ticket.ticketNumber}</strong></div>
          </div>

          <div class="validation-info">
            <strong>Important Instructions:</strong><br>
            • Present this ticket at the event entrance for validation<br>
            • QR code or manual ticket number can be used for entry<br>
            • Keep this ticket safe - screenshots are acceptable<br>
            • Contact event organizer if you have any issues<br>
            • Status: ${ticket.status.toUpperCase()} | Payment: ${ticket.paymentStatus.toUpperCase()}
          </div>

          <div class="contact-info">
            Generated on: ${new Date().toLocaleString()}<br>
            For support or questions, please contact the event organizer.
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(ticketHtml);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  const shareTicket = async () => {
    if (navigator.share && ticket) {
      try {
        await navigator.share({
          title: `Ticket for ${event?.name}`,
          text: `I have a ticket for ${event?.name}`,
          url: window.location.href,
        });
      } catch (err) {
        // Fallback to copying URL
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied!",
          description: "Ticket link copied to clipboard",
        });
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied!",
        description: "Ticket link copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Ticket not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "used":
        return <Badge className="bg-gray-100 text-gray-800">Used</Badge>;
      case "expired":
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "refunded":
        return <Badge className="bg-gray-100 text-gray-800">Refunded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Ticket Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center space-x-2">
                  <Ticket className="h-6 w-6" />
                  <span>{ticket.ticketNumber}</span>
                </CardTitle>
                <CardDescription className="mt-2">
                  {event?.name} - {ticket.ticketType} Ticket
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                {getStatusBadge(ticket.status)}
                {getPaymentStatusBadge(ticket.paymentStatus)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {event && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {new Date(event.startDate).toLocaleDateString()} at{" "}
                    {new Date(event.startDate).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{event.location}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{ticket.price} {ticket.currency}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Code and Ticket Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket QR Code</CardTitle>
              <CardDescription>
                Show this QR code at the event entrance for validation
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {qrCodeDataUrl && (
                <div className="space-y-4">
                  <img
                    src={qrCodeDataUrl}
                    alt="Ticket QR Code"
                    className="mx-auto border rounded-lg"
                  />
                  <div className="flex space-x-2 justify-center">
                    <Button variant="outline" onClick={downloadQRCode}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" onClick={shareTicket}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Information */}
          <Card>
            <CardHeader>
              <CardTitle>Event Information</CardTitle>
              <CardDescription>
                Essential details for your event attendance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {event && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">Date & Time:</span>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.startDate).toLocaleDateString()} at{" "}
                        {new Date(event.startDate).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">Venue:</span>
                      <p className="text-sm text-muted-foreground">{event.location || 'To be announced'}</p>
                    </div>
                  </div>
                  {event.description && (
                    <div>
                      <span className="font-medium">Description:</span>
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Ticket Type:</span>
                    <p className="font-medium">{ticket.ticketType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price:</span>
                    <p className="font-medium">{ticket.price} {ticket.currency}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Validation ID:</span>
                    <p className="font-medium font-mono">{ticket.ticketNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contact:</span>
                    <p className="font-medium text-sm">{ticket.ownerEmail}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={downloadFullTicket} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download Ticket
                  </Button>
                  <Button variant="outline" onClick={shareTicket}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              {ticket.isTransferable && ticket.status === "active" && ticket.paymentStatus === "paid" && (
                <div className="border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowTransferForm(!showTransferForm)}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Transfer Ticket
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transfer Form */}
          {showTransferForm && (
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Transfer Ticket</CardTitle>
                  <CardDescription>
                    Transfer this ticket to another person
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onTransfer)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="toOwnerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter recipient's full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="toOwnerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter recipient's email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="toOwnerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter recipient's phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="transferReason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transfer Reason (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Why are you transferring this ticket?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex space-x-2">
                        <Button 
                          type="submit" 
                          disabled={transferTicketMutation.isPending}
                        >
                          {transferTicketMutation.isPending ? (
                            <LoadingSpinner />
                          ) : (
                            "Transfer Ticket"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowTransferForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}