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
import { Ticket, Calendar, MapPin, Users, Share2, Download, RefreshCw, User, Mail, Phone, CreditCard } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  const [paymentLoading, setPaymentLoading] = useState(false);

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

  // Fetch event details using public endpoint to avoid auth issues
  const { data: event } = useQuery<any>({
    queryKey: ["/api/events", ticket?.eventId, "public"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${ticket.eventId}/public`);
      if (!response.ok) {
        throw new Error("Event not found");
      }
      return response.json();
    },
    enabled: !!ticket?.eventId,
  });

  // Generate QR code when ticket data is available
  useEffect(() => {
    // Check if we have a pre-generated QR code image first
    if (ticket?.qrCodeImage) {
      setQrCodeDataUrl(ticket.qrCodeImage);
    } else if (ticket?.qrCode) {
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
  }, [ticket?.qrCode, ticket?.qrCodeImage]);

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

  const downloadFullTicket = async () => {
    if (!ticket || !event) {
      toast({
        title: "Error",
        description: "Ticket or event information not available",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Generating PDF...",
      description: "Please wait while we prepare your ticket",
    });
    
    try {
      // Generate QR code for the download
      let qrDataUrl = qrCodeDataUrl;
      if (!qrDataUrl && ticket.qrCodeImage) {
        qrDataUrl = ticket.qrCodeImage;
      } else if (!qrDataUrl && ticket.qrCode) {
        qrDataUrl = await QRCode.toDataURL(ticket.qrCode, {
          width: 300,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
      }

      if (!qrDataUrl) {
        toast({
          title: "QR Code Missing",
          description: "Cannot generate PDF without QR code. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      // Create a temporary container for the ticket
      const ticketContainer = document.createElement('div');
      ticketContainer.style.position = 'absolute';
      ticketContainer.style.left = '-9999px';
      ticketContainer.style.width = '800px';
      ticketContainer.style.padding = '40px';
      ticketContainer.style.backgroundColor = 'white';
      ticketContainer.style.fontFamily = 'Arial, sans-serif';
      
      ticketContainer.innerHTML = `
        <div style="text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 30px; margin-bottom: 30px;">
          <div style="font-size: 32px; font-weight: bold; color: #1f2937; margin-bottom: 15px;">🎫 Digital Ticket</div>
          <div style="font-size: 24px; color: #374151; margin-bottom: 10px;">${event.name}</div>
          <div style="font-size: 18px; background: #f3f4f6; padding: 8px 16px; border-radius: 20px; display: inline-block;">
            ${ticket.category} Ticket
          </div>
        </div>
        
        <div style="display: flex; gap: 40px; margin-bottom: 30px;">
          <div style="flex: 1;">
            <h3 style="color: #1f2937; margin-bottom: 20px; font-size: 20px;">Event Details</h3>
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">📅 Event Time:</div>
              <div style="font-size: 14px; color: #6b7280;">
                <strong>Start:</strong> ${new Date(event.startDate).toLocaleDateString()} at ${new Date(event.startDate).toLocaleTimeString()}
                ${event.endDate ? `<br><strong>End:</strong> ${new Date(event.endDate).toLocaleDateString()} at ${new Date(event.endDate).toLocaleTimeString()}` : ''}
              </div>
            </div>
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">📍 Venue:</div>
              <div style="font-size: 14px; color: #6b7280;">${event.location || 'To be announced'}</div>
            </div>
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">💰 Price:</div>
              <div style="font-size: 14px; color: #059669; font-weight: bold;">${ticket.price} ${ticket.currency}</div>
            </div>
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">💳 Payment:</div>
              <div style="font-size: 14px; color: #6b7280;">
                ${ticket.paymentMethod === 'paystack' ? 'Online Payment' : 'Manual Payment on Event Day'}
                ${ticket.paymentStatus === 'paid' ? ' ✅ Paid' : ' ⏳ Pending'}
              </div>
            </div>
            <div>
              <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">📧 Contact:</div>
              <div style="font-size: 14px; color: #6b7280;">${ticket.ownerEmail}</div>
            </div>
          </div>
          
          <div style="text-align: center; flex: 1;">
            <h3 style="color: #1f2937; margin-bottom: 20px; font-size: 20px;">Scan to Enter</h3>
            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; border: 2px solid #e5e7eb;">
              <img src="${qrDataUrl}" style="width: 200px; height: 200px; border: 1px solid #d1d5db; border-radius: 8px;" />
              <div style="margin-top: 15px; font-size: 14px; color: #6b7280;">
                <strong>Manual Code:</strong>
                <div style="font-family: monospace; font-size: 18px; background: #f3f4f6; padding: 8px 12px; border-radius: 6px; margin-top: 8px; border: 1px solid #d1d5db;">
                  ${ticket.ticketNumber}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #6b7280;">
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <strong style="color: #1e40af;">Important Instructions:</strong><br>
            • Present this ticket at the event entrance for validation<br>
            • QR code or manual ticket number can be used for entry<br>
            • Keep this ticket safe - screenshots are acceptable<br>
            • Contact event organizer if you have any issues<br>
            • Status: ${ticket.status.toUpperCase()} | Payment: ${ticket.paymentStatus.toUpperCase()}
          </div>
          <div style="text-align: center;">
            Generated on: ${new Date().toLocaleString()}<br>
            For support or questions, please contact the event organizer.
          </div>
        </div>
      `;

      document.body.appendChild(ticketContainer);

      // Convert to canvas
      const canvas = await html2canvas(ticketContainer, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
      });

      // Remove the temporary container
      document.body.removeChild(ticketContainer);

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const imgWidth = 190; // A4 width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);

      // Save the PDF
      const fileName = `ticket-${ticket.ticketNumber}-${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Download Complete",
        description: "Your ticket has been downloaded as a PDF file",
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
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

  const handlePayment = async () => {
    if (!ticket) return;

    setPaymentLoading(true);
    try {
      // Initialize payment with Paystack
      const response = await fetch('/api/tickets/initialize-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticket.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize payment');
      }

      const data = await response.json();
      
      if (data.authorizationUrl) {
        // Redirect to Paystack
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error('Payment initialization failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(false);
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

        {/* Main Ticket Card - Single Column Design */}
        <Card className="mb-8 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3">
              <div className="bg-blue-600 text-white p-3 rounded-full">
                <Ticket className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              🎫 Digital Ticket
            </CardTitle>
            <div className="flex justify-center space-x-3">
              {getStatusBadge(ticket.status)}
              {getPaymentStatusBadge(ticket.paymentStatus)}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Event Name Section */}
            {event && (
              <div className="text-center py-4 bg-white rounded-lg border shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{event.name}</h2>
                <p className="text-gray-600">{event.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR Code Section */}
              <div className="bg-white rounded-lg p-6 border shadow-sm text-center">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Scan to Enter</h3>
                {qrCodeDataUrl && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg inline-block">
                      <img
                        src={qrCodeDataUrl}
                        alt="Ticket QR Code"
                        className="mx-auto w-48 h-48 border-2 border-gray-200 rounded-lg"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>Manual Code:</strong>
                      <div className="font-mono text-lg bg-gray-100 px-3 py-2 rounded mt-2 border">
                        {ticket.ticketNumber}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Event Details Section */}
              <div className="bg-white rounded-lg p-6 border shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Event Details</h3>
                {event && (
                  <div className="space-y-4">
                    {/* Event Times */}
                    <div className="flex items-start space-x-3">
                      <Calendar className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">Event Time</div>
                        <div className="text-sm text-gray-700">
                          <div><strong>Start:</strong> {new Date(event.startDate).toLocaleDateString()} at {new Date(event.startDate).toLocaleTimeString()}</div>
                          {event.endDate && (
                            <div><strong>End:</strong> {new Date(event.endDate).toLocaleDateString()} at {new Date(event.endDate).toLocaleTimeString()}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Venue */}
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">Venue</div>
                        <div className="text-sm text-gray-700">{event.location || 'To be announced'}</div>
                      </div>
                    </div>

                    {/* Ticket Info */}
                    <div className="flex items-start space-x-3">
                      <Ticket className="h-5 w-5 text-purple-600 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">Ticket Type</div>
                        <div className="text-sm text-gray-700">{ticket.ticketType}</div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-start space-x-3">
                      <div className="h-5 w-5 text-green-600 mt-1 flex-shrink-0 text-center">💰</div>
                      <div>
                        <div className="font-medium text-gray-900">Price</div>
                        <div className="text-sm font-semibold text-green-600">{ticket.price} {ticket.currency}</div>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="flex items-start space-x-3">
                      <div className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0 text-center">💳</div>
                      <div>
                        <div className="font-medium text-gray-900">Payment</div>
                        <div className="text-sm text-gray-700">
                          {ticket.paymentMethod === 'paystack' ? 'Online Payment' : 'Manual Payment on Event Day'}
                          {ticket.paymentStatus === 'paid' && ticket.paymentMethod === 'paystack' && (
                            <span className="text-green-600 font-medium"> ✓ Paid</span>
                          )}
                          {ticket.paymentStatus === 'pending' && (
                            <span className="text-yellow-600 font-medium"> ⏳ Pending</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="flex items-start space-x-3">
                      <Mail className="h-5 w-5 text-gray-600 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">Contact</div>
                        <div className="text-sm text-gray-700">{ticket.ownerEmail}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg p-6 border shadow-sm">
              {/* Payment Button - Show prominently if payment is pending */}
              {ticket.paymentStatus === 'pending' && ticket.paymentMethod === 'paystack' && (
                <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-orange-900">Payment Required</h3>
                    <p className="text-sm text-orange-700 mt-1">
                      Complete your payment to secure your ticket for this event
                    </p>
                  </div>
                  <Button 
                    onClick={handlePayment}
                    disabled={paymentLoading}
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold text-lg shadow-lg"
                  >
                    {paymentLoading ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-3" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5 mr-3" />
                        Pay Now - {ticket.currency} {ticket.price.toLocaleString()}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-orange-600 mt-2">
                    🔒 Secure payment processing with Paystack
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={downloadFullTicket} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Download className="h-4 w-4 mr-2" />
                  Download Ticket
                </Button>
                <Button variant="outline" onClick={downloadQRCode}>
                  <Download className="h-4 w-4 mr-2" />
                  Download QR
                </Button>
                <Button variant="outline" onClick={shareTicket}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Ticket
                </Button>
              </div>
              
              {ticket.isTransferable && ticket.status === "active" && ticket.paymentStatus === "paid" && (
                <div className="mt-4 pt-4 border-t">
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
            </div>
          </CardContent>
        </Card>

        {/* Keep the old structure as backup */}
        <div className="hidden">
          <Card>
            <CardHeader>
              <CardTitle>Event Information</CardTitle>
              <CardDescription>
                Essential details for your event attendance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Event Name */}
              {event && (
                <div className="text-center pb-4 border-b">
                  <h3 className="text-xl font-bold text-gray-900">{event.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                </div>
              )}

              {event && (
                <div className="space-y-4">
                  {/* Event Times */}
                  <div>
                    <span className="font-medium text-gray-900">Event Time:</span>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          <strong>Start:</strong> {new Date(event.startDate).toLocaleDateString()} at {new Date(event.startDate).toLocaleTimeString()}
                        </span>
                      </div>
                      {event.endDate && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-red-600" />
                          <span className="text-sm">
                            <strong>End:</strong> {new Date(event.endDate).toLocaleDateString()} at {new Date(event.endDate).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Event Location */}
                  <div>
                    <span className="font-medium text-gray-900">Event Location:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{event.location || 'To be announced'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="space-y-3">
                  {/* Ticket Type and Price */}
                  <div>
                    <span className="font-medium text-gray-900">Ticket Type:</span>
                    <p className="text-sm mt-1">{ticket.ticketType}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-900">Price:</span>
                    <p className="text-sm mt-1 font-medium text-green-600">
                      {ticket.price} {ticket.currency}
                    </p>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <span className="font-medium text-gray-900">Payment Method:</span>
                    <p className="text-sm mt-1 capitalize">
                      {ticket.paymentMethod === 'paystack' ? 'Online Payment' : 'Manual Payment on Event Day'}
                      {ticket.paymentStatus === 'paid' && ticket.paymentMethod === 'paystack' && (
                        <span className="text-green-600 font-medium"> ✓ Paid Online</span>
                      )}
                      {ticket.paymentStatus === 'pending' && (
                        <span className="text-yellow-600 font-medium"> - Pending Payment</span>
                      )}
                    </p>
                  </div>

                  {/* Validation ID */}
                  <div>
                    <span className="font-medium text-gray-900">Validation ID:</span>
                    <p className="text-sm mt-1 font-mono bg-gray-100 px-2 py-1 rounded">
                      {ticket.ticketNumber}
                    </p>
                  </div>

                  {/* Contact */}
                  <div>
                    <span className="font-medium text-gray-900">Contact:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{ticket.ownerEmail}</span>
                    </div>
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