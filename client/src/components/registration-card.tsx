import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Mail, User, Hash, MapPin, Calendar } from "lucide-react";

interface RegistrationCardProps {
  registration: any;
  event: any;
  qrImageBase64?: string;
}

export function RegistrationCard({ registration, event, qrImageBase64 }: RegistrationCardProps) {
  // Handle both camelCase and snake_case field names for compatibility
  const memberName = registration.guestName || registration.guest_name || 
    (registration.member ? `${registration.member.firstName} ${registration.member.lastName}` : 'Guest');
  
  const auxiliaryBody = registration.guestAuxiliaryBody || registration.guest_auxiliary_body || 
    (registration.member ? registration.member.auxiliaryBody : 'Guest');
  
  const chandaNumber = registration.guestChandaNumber || registration.guest_chanda_number || 
    (registration.member ? registration.member.chandaNumber : 'N/A');
  
  const email = registration.guestEmail || registration.guest_email || 
    (registration.member ? registration.member.email : 'N/A');

  const jamaat = registration.guestJamaat || registration.guest_jamaat || 
    (registration.member ? registration.member.jamaat : 'N/A');

  const circuit = registration.guestCircuit || registration.guest_circuit || 
    (registration.member ? registration.member.circuit : 'N/A');

  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Create a larger canvas for better quality
    canvas.width = 800;
    canvas.height = 1000;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add gradient header
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 100);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, 100);
    
    // Header text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Event Registration', canvas.width / 2, 40);
    
    ctx.font = '18px Arial';
    ctx.fillText(event.name, canvas.width / 2, 70);
    
    // Registration details
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px Arial';
    
    let y = 140;
    const lineHeight = 35;
    
    const details = [
      { label: 'Name:', value: memberName },
      { label: 'Jamaat:', value: jamaat },
      { label: 'Circuit:', value: circuit },
      { label: 'Auxiliary Body:', value: auxiliaryBody },
      { label: 'Chanda Number:', value: chandaNumber },
      { label: 'Email:', value: email },
      { label: 'Unique ID:', value: registration.uniqueId },
      { label: 'Event Date:', value: new Date(event.startDate).toLocaleDateString() },
    ];
    
    details.forEach(detail => {
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText(detail.label, 50, y);
      
      ctx.font = '16px Arial';
      ctx.fillStyle = '#333333';
      ctx.fillText(detail.value, 200, y);
      
      y += lineHeight;
    });
    
    // QR Code section
    if (qrImageBase64) {
      const qrImg = new Image();
      qrImg.onload = () => {
        const qrSize = 200;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = y + 30;
        
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'center';
        ctx.fillText('Scan for Event Check-in', canvas.width / 2, qrY + qrSize + 30);
        
        // Download
        const link = document.createElement('a');
        link.download = `registration-card-${registration.uniqueId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      qrImg.src = `data:image/png;base64,${qrImageBase64}`;
    } else {
      // Download without QR code
      const link = document.createElement('a');
      link.download = `registration-card-${registration.uniqueId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <CardTitle className="text-center text-2xl">
          Registration Successful!
        </CardTitle>
        <p className="text-center text-blue-100 mt-2">{event.name}</p>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Registration Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Name</p>
                <p className="font-semibold">{memberName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Jamaat</p>
                <p className="font-semibold">{jamaat}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="h-5 w-5 text-blue-600 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Circuit</p>
                <p className="font-semibold">{circuit}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Badge variant="outline" className="p-1">
                <span className="text-xs">{auxiliaryBody}</span>
              </Badge>
              <div>
                <p className="text-sm text-gray-600 font-medium">Auxiliary Body</p>
                <p className="font-semibold">{auxiliaryBody}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Hash className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Chanda Number</p>
                <p className="font-semibold">{chandaNumber}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Email</p>
                <p className="font-semibold text-sm">{email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600 font-medium">Event Date</p>
              <p className="font-semibold">{new Date(event.startDate).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
        
        {/* Unique ID */}
        <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-dashed border-blue-300">
          <p className="text-sm text-gray-600 font-medium mb-2">Your Unique Registration ID</p>
          <p className="text-2xl font-mono font-bold text-blue-600">{registration.uniqueId}</p>
          <p className="text-xs text-gray-500 mt-1">Present this ID for manual check-in if QR code fails</p>
        </div>
        
        {/* QR Code Section */}
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-4 flex items-center justify-center gap-2">
            <QrCode className="h-5 w-5" />
            Your Registration QR Code
          </h3>
          {qrImageBase64 ? (
            <div className="inline-block p-4 bg-white rounded-lg border-2 border-gray-200">
              <img 
                src={`data:image/png;base64,${qrImageBase64}`} 
                alt="Registration QR Code" 
                className="w-48 h-48 mx-auto"
                onError={(e) => {
                  console.error('QR Image failed to load:', e);
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="inline-block p-4 bg-white rounded-lg border-2 border-gray-200">
              <div className="w-48 h-48 mx-auto flex items-center justify-center bg-gray-100 rounded">
                <div className="text-center">
                  <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">QR Code Loading...</p>
                  <p className="text-xs text-gray-400 mt-1">Please use your Unique ID below for now</p>
                </div>
              </div>
            </div>
          )}
          <p className="text-sm text-gray-600 mt-4">
            Save this QR code or take a screenshot. Present it at the event entrance for quick check-in.
          </p>
        </div>
        
        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">Check-in Instructions</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Present the QR code above at the event entrance</li>
            <li>• Alternatively, provide your Unique ID: <strong>{registration.uniqueId}</strong></li>
            <li>• Keep this information accessible on your mobile device</li>
            <li>• Contact event organizers if you have any issues</li>
          </ul>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2">
            <Download className="h-4 w-4" />
            Download Card
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.print()} 
            className="flex-1 flex items-center justify-center gap-2"
          >
            <div className="h-4 w-4">🖨️</div>
            Print Card
          </Button>
        </div>
        
        {/* View Event Details */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800 font-medium mb-2">Track Your Event</p>
          <p className="text-xs text-blue-600 mb-3">
            View countdown timer and event details using the link below:
          </p>
          <div className="flex flex-col gap-2">
            <a 
              href={`/event-view/${event.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-blue-700 hover:text-blue-900 underline break-all"
            >
              {window.location.origin}/event-view/{event.id}
            </a>
            <p className="text-xs text-blue-500">
              Bookmark this link to track your event countdown timer
            </p>
          </div>
        </div>
        
        <div className="text-center pt-4 border-t">
          <p className="text-sm text-gray-500">
            Event: {event.name} | Location: {event.location}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Generated on {new Date().toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}