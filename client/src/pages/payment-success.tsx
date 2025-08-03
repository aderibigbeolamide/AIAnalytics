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

  // Get registration data from URL params (passed from payment verification)
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  
  useEffect(() => {
    // Try to get data from localStorage first (set during payment verification)
    const storedRegData = localStorage.getItem(`registration_${registrationId}`);
    const storedEventData = localStorage.getItem(`event_${eventId}`);
    
    if (storedRegData) {
      setRegistrationData(JSON.parse(storedRegData));
    }
    if (storedEventData) {
      setEventData(JSON.parse(storedEventData));
    }
  }, [registrationId, eventId]);

  // Fetch registration details if it's an event registration and not in localStorage
  const { data: registration, isLoading: registrationLoading } = useQuery<any>({
    queryKey: ["/api/registrations", registrationId, "qr"],
    queryFn: async () => {
      if (!registrationId) return null;
      
      // Try to get QR code data from registration endpoint
      const qrResponse = await fetch(`/api/registrations/${registrationId}/qr`);
      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        return {
          ...qrData.registration,
          qrImage: qrData.qrImage,
          qrImageBase64: qrData.qrImageBase64,
          event: qrData.event
        };
      }
      
      // Fallback to basic data from URL params
      const eventResponse = await fetch(`/api/events/${eventId}`);
      let eventData = null;
      if (eventResponse.ok) {
        eventData = await eventResponse.json();
      }
      
      return {
        id: registrationId,
        uniqueId: searchParams.get('uniqueId'),
        firstName: searchParams.get('firstName'), 
        lastName: searchParams.get('lastName'),
        email: searchParams.get('email'),
        paymentStatus: 'paid',
        status: 'confirmed',
        qrCodeImage: searchParams.get('qrCodeImage'),
        event: eventData
      };
    },
    enabled: !!registrationId && type === 'registration' && !registrationData,
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
      
      const data = ticket || registration || registrationData;
      
      ticketElement.innerHTML = `
        <div style="text-align: center; font-family: Arial, sans-serif;">
          <h2 style="color: #333; margin-bottom: 20px;">${type === 'ticket' ? 'Event Ticket' : 'Registration Card'}</h2>
          <div style="border: 2px solid #ddd; padding: 20px; border-radius: 8px;">
            <h3 style="color: #2563eb; margin-bottom: 15px;">${data?.event?.name || searchParams.get('eventName') || 'Event'}</h3>
            <div style="text-align: left; margin-bottom: 15px;">
              <p><strong>Location:</strong> ${data?.event?.location || searchParams.get('eventLocation') || 'TBD'}</p>
              <p><strong>Date:</strong> ${data?.event?.startDate ? new Date(data.event.startDate).toLocaleDateString() : searchParams.get('eventDate') ? new Date(searchParams.get('eventDate')).toLocaleDateString() : 'TBD'}</p>
              <p><strong>Time:</strong> ${data?.event?.startDate ? new Date(data.event.startDate).toLocaleTimeString() : searchParams.get('eventDate') ? new Date(searchParams.get('eventDate')).toLocaleTimeString() : 'TBD'}</p>
            </div>
            <div style="text-align: left; margin-bottom: 15px;">
              <p><strong>${type === 'ticket' ? 'Ticket Number' : 'Manual Verification Code'}:</strong> ${data?.manualVerificationCode || searchParams.get('shortCode') || data?.uniqueId?.slice(-6) || 'N/A'}</p>
              <p><strong>Owner:</strong> ${data?.ownerName || (data?.firstName + ' ' + data?.lastName) || (searchParams.get('firstName') + ' ' + searchParams.get('lastName')) || 'N/A'}</p>
              <p><strong>Email:</strong> ${data?.ownerEmail || data?.email || searchParams.get('email') || 'N/A'}</p>
              ${type === 'ticket' ? `<p><strong>Category:</strong> ${data?.category || 'N/A'}</p>` : ''}
            </div>
            <div style="text-align: center; margin-top: 20px;">
              ${(data?.qrImage || data?.qrCodeImage || searchParams.get('qrCodeImage')) ? `<img src="${data?.qrImage || data?.qrCodeImage || searchParams.get('qrCodeImage')}" style="width: 150px; height: 150px;" />` : '<p style="color: #999;">QR Code not available</p>'}
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

  if (ticketLoading || (registrationLoading && !registrationData)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your details...</p>
        </div>
      </div>
    );
  }

  // Combine data from different sources
  const combinedData = registrationData || registration || ticket;
  
  // If no data from API, use URL parameters directly
  const data = combinedData || {
    id: registrationId,
    uniqueId: searchParams.get('uniqueId'),
    firstName: searchParams.get('firstName'),
    lastName: searchParams.get('lastName'),
    email: searchParams.get('email'),
    paymentStatus: 'paid',
    status: 'confirmed',
    qrCodeImage: searchParams.get('qrCodeImage'),
    manualVerificationCode: searchParams.get('shortCode'),
    event: eventData || {
      name: searchParams.get('eventName'),
      location: searchParams.get('eventLocation'),
      startDate: searchParams.get('eventDate')
    }
  };
  
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
                {data?.event?.name || searchParams.get('eventName') || 'Event Details'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span>{data?.event?.location || searchParams.get('eventLocation') || 'Location TBD'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span>{data?.event?.startDate ? new Date(data.event.startDate).toLocaleDateString() : searchParams.get('eventDate') ? new Date(searchParams.get('eventDate')).toLocaleDateString() : 'Date TBD'}</span>
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
                  {data?.ticketNumber || data?.uniqueId || data?.registrationId || 'N/A'}
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
                  <span>{data?.ownerName || (data?.firstName && data?.lastName ? `${data.firstName} ${data.lastName}` : '') || (searchParams.get('firstName') && searchParams.get('lastName') ? `${searchParams.get('firstName')} ${searchParams.get('lastName')}` : '') || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{data?.ownerEmail || data?.email || searchParams.get('email') || 'N/A'}</span>
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

            {/* Manual Verification Code */}
            {(data?.manualVerificationCode || searchParams.get('shortCode') || data?.uniqueId) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Manual Verification Code</h4>
                <div className="font-mono text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                  {data?.manualVerificationCode || searchParams.get('shortCode') || data?.uniqueId?.slice(-6) || 'N/A'}
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                  Use this 6-digit code for manual verification if QR code scanning is not available
                </p>
              </div>
            )}

            {/* QR Code */}
            <div className="text-center bg-white dark:bg-gray-800 p-6 rounded-lg border">
              <h4 className="font-medium mb-4">Your Registration QR Code</h4>
              {(data?.qrImage || data?.qrCodeImage || searchParams.get('qrCodeImage')) ? (
                <img 
                  src={data?.qrImage || data?.qrCodeImage || searchParams.get('qrCodeImage')} 
                  alt="QR Code" 
                  className="w-48 h-48 mx-auto mb-4"
                  onError={(e) => {
                    console.error('QR Code image failed to load');
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-48 h-48 mx-auto mb-4 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                  <div className="text-center">
                    <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading QR Code...</p>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Show this QR code at the event for verification
              </p>
            </div>
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