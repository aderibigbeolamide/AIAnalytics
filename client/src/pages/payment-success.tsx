import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Download, QrCode, Calendar, MapPin, User, Mail, Phone, CreditCard } from "lucide-react";

export default function PaymentSuccess() {
  const [, params] = useRoute("/payment/success");
  const [, setLocation] = useLocation();
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  
  const type = searchParams.get('type'); // 'ticket' or 'registration'
  const ticketId = searchParams.get('ticketId');
  const registrationId = searchParams.get('registrationId');
  const eventId = searchParams.get('eventId');

  // Fetch ticket details if it's a ticket purchase
  const { data: ticket, isLoading: ticketLoading } = useQuery<any>({
    queryKey: ["/api/tickets", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const response = await fetch(`/api/tickets/${ticketId}`);
      if (!response.ok) throw new Error("Failed to fetch ticket");
      return response.json();
    },
    enabled: !!ticketId && type === 'ticket',
  });

  // Fetch registration details if it's an event registration
  const { data: registration, isLoading: registrationLoading } = useQuery<any>({
    queryKey: ["/api/registrations", registrationId],
    queryFn: async () => {
      if (!registrationId) return null;
      const response = await fetch(`/api/events/${eventId}/registrations/${registrationId}`);
      if (!response.ok) throw new Error("Failed to fetch registration");
      return response.json();
    },
    enabled: !!registrationId && type === 'registration',
  });

  const downloadTicketPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      // Create a temporary element with ticket content
      const ticketElement = document.createElement('div');
      ticketElement.style.position = 'absolute';
      ticketElement.style.left = '-9999px';
      ticketElement.style.background = 'white';
      ticketElement.style.padding = '20px';
      ticketElement.style.width = '400px';
      
      const data = ticket || registration;
      
      ticketElement.innerHTML = `
        <div style="text-align: center; font-family: Arial, sans-serif;">
          <h2 style="color: #333; margin-bottom: 20px;">${type === 'ticket' ? 'Event Ticket' : 'Registration Card'}</h2>
          <div style="border: 2px solid #ddd; padding: 20px; border-radius: 8px;">
            <h3 style="color: #2563eb; margin-bottom: 15px;">${data?.event?.name || 'Event'}</h3>
            <div style="text-align: left; margin-bottom: 15px;">
              <p><strong>Location:</strong> ${data?.event?.location || 'TBD'}</p>
              <p><strong>Date:</strong> ${new Date(data?.event?.startDate || '').toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(data?.event?.startDate || '').toLocaleTimeString()}</p>
            </div>
            <div style="text-align: left; margin-bottom: 15px;">
              <p><strong>${type === 'ticket' ? 'Ticket Number' : 'Registration ID'}:</strong> ${data?.ticketNumber || data?.registrationId || 'N/A'}</p>
              <p><strong>Owner:</strong> ${data?.ownerName || data?.firstName + ' ' + data?.lastName || 'N/A'}</p>
              <p><strong>Email:</strong> ${data?.ownerEmail || data?.email || 'N/A'}</p>
              ${type === 'ticket' ? `<p><strong>Category:</strong> ${data?.category || 'N/A'}</p>` : ''}
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <img src="${data?.qrCode || ''}" style="width: 150px; height: 150px;" />
              <p style="font-size: 12px; color: #666; margin-top: 10px;">Scan this QR code for verification</p>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(ticketElement);
      
      const canvas = await html2canvas(ticketElement);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF();
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${type === 'ticket' ? 'ticket' : 'registration'}-${data?.ticketNumber || data?.registrationId || 'card'}.pdf`);
      
      document.body.removeChild(ticketElement);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  if (ticketLoading || registrationLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your details...</p>
        </div>
      </div>
    );
  }

  const data = ticket || registration;
  const isTicket = type === 'ticket';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your {isTicket ? 'ticket has been purchased' : 'registration is confirmed'}
          </p>
        </div>

        {/* Main Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isTicket ? <QrCode className="h-5 w-5" /> : <User className="h-5 w-5" />}
              {isTicket ? 'Your Ticket' : 'Registration Card'}
            </CardTitle>
            <CardDescription>
              {isTicket ? 'Your ticket details and QR code for event entry' : 'Your registration details and access card'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Event Details */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                {data?.event?.name || 'Event Details'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span>{data?.event?.location || 'Location TBD'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(data?.event?.startDate || '').toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Ticket/Registration Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isTicket ? 'Ticket Number' : 'Registration ID'}
                </label>
                <div className="mt-1 font-mono text-lg font-semibold">
                  {data?.ticketNumber || data?.registrationId || 'N/A'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <div className="mt-1">
                  <Badge variant="default" className="bg-green-600">
                    {data?.paymentStatus === 'paid' ? 'Paid' : 'Confirmed'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Owner Details */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{data?.ownerName || (data?.firstName + ' ' + data?.lastName) || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{data?.ownerEmail || data?.email || 'N/A'}</span>
                </div>
              </div>
              {isTicket && (
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <span>Category: {data?.category || 'N/A'}</span>
                  <span className="ml-4">Price: {data?.currency} {data?.price || 0}</span>
                </div>
              )}
            </div>

            {/* QR Code */}
            {data?.qrCode && (
              <div className="text-center bg-white dark:bg-gray-800 p-6 rounded-lg border">
                <img 
                  src={data.qrCode} 
                  alt="QR Code" 
                  className="w-48 h-48 mx-auto mb-4"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Show this QR code at the event for verification
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={downloadTicketPDF} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download {isTicket ? 'Ticket' : 'Card'} PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setLocation('/')}
          >
            Back to Events
          </Button>
          {isTicket && (
            <Button 
              variant="outline" 
              onClick={() => setLocation(`/events/${data?.event?.id}`)}
            >
              View Event Details
            </Button>
          )}
        </div>

        {/* Important Notes */}
        <Card className="mt-6 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-6">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Important Notes:</h4>
            <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>Keep this {isTicket ? 'ticket' : 'registration card'} safe until the event</li>
              <li>Bring a valid ID that matches the name on this {isTicket ? 'ticket' : 'registration'}</li>
              <li>Arrive early for verification and check-in</li>
              <li>The QR code will be scanned for entry validation</li>
              {!isTicket && <li>Your unique registration ID may be needed for manual verification</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}