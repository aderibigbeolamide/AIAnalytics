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
  // Parse custom form data from registration
  const customFormData = registration.customFormData ? JSON.parse(registration.customFormData) : {};
  
  // Get the name from custom form data, with fallback to extract from customFormData
  const extractNameFromCustomData = () => {
    if (!customFormData) return null;
    
    // Try to find name fields in custom form data
    for (const [key, value] of Object.entries(customFormData)) {
      if (key.toLowerCase().includes('name') && value && typeof value === 'string') {
        return value;
      }
    }
    
    // Try common field combinations
    const firstName = customFormData.firstName || customFormData.FirstName || '';
    const lastName = customFormData.lastName || customFormData.LastName || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    }
    
    return null;
  };

  const memberName = registration.guestName || 
    extractNameFromCustomData() ||
    (registration.firstName && registration.lastName ? `${registration.firstName} ${registration.lastName}` : null) ||
    registration.firstName ||
    registration.lastName ||
    'Guest';
  
  // Get auxiliary body from registration
  const auxiliaryBody = registration.auxiliaryBody || registration.guestAuxiliaryBody || 
    (customFormData && (customFormData.auxiliaryBody || customFormData.AuxiliaryBody || 
     customFormData.auxiliary_body || customFormData.Gender || customFormData.gender || 
     customFormData.Student || customFormData.student)) || 'N/A';
  
  // Get email from registration
  const email = registration.guestEmail || registration.email || 'N/A';

  // Create dynamic field list from custom form data and event configuration
  const getDisplayFields = () => {
    const fields = [];
    
    // Add name field first if available
    if (memberName && memberName !== 'Guest') {
      fields.push({ label: 'Name', value: memberName, icon: User });
    }
    
    // Add auxiliary body if available and not 'N/A'
    if (auxiliaryBody && auxiliaryBody !== 'N/A' && auxiliaryBody !== 'Unknown') {
      fields.push({ label: 'Auxiliary Body', value: auxiliaryBody, icon: User });
    }
    
    // Add email if available and not 'N/A'
    if (email && email !== 'N/A' && email !== 'Unknown') {
      fields.push({ label: 'Email', value: email, icon: Mail });
    }
    
    // Add other custom fields from the form data
    if (event.customRegistrationFields && customFormData) {
      event.customRegistrationFields.forEach((field: any) => {
        const value = customFormData[field.name];
        if (value && value !== '' && 
            field.label !== 'FirstName' && field.label !== 'LastName' && // Skip name components as we show combined name
            field.type !== 'email' && // Skip email as we handle it separately
            !field.label.toLowerCase().includes('gender') && // Skip gender/auxiliary as we handle it separately
            !field.label.toLowerCase().includes('auxiliary')) {
          fields.push({ 
            label: field.label, 
            value: value, 
            icon: field.type === 'tel' ? Hash : MapPin 
          });
        }
      });
    }
    
    return fields;
  };

  const displayFields = getDisplayFields();

  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Create a high-resolution canvas for better print quality
    const scale = 3; // 3x resolution for crisp printing
    canvas.width = 800 * scale;
    canvas.height = 1000 * scale;
    
    // Scale the context for high-DPI rendering
    ctx.scale(scale, scale);
    
    // Set rendering properties for crisp text and images
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 1000);
    
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
    
    // Create dynamic details from the display fields
    const details = [
      ...displayFields.map(field => ({ label: `${field.label}:`, value: field.value })),
      { label: 'Verification ID:', value: registration.uniqueId },
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
    
    // QR Code section - use same normalization logic as display
    const normalizeQRCodeData = () => {
      // Try different sources in order of preference
      const sources = [
        qrImageBase64,
        registration.qrImage,
        registration.qrCodeImage,
        registration.qrImageBase64,
        registration.qrCode
      ];

      for (const source of sources) {
        if (source && typeof source === 'string' && source.length > 10) {
          // If it already has data URL prefix, use as-is
          if (source.startsWith('data:image/')) {
            return source;
          }
          // If it's base64 data without prefix, add prefix
          if (source.length > 50) { // Reasonable check for base64 data
            return `data:image/png;base64,${source}`;
          }
        }
      }
      return null;
    };

    const qrDataUrl = normalizeQRCodeData();
    
    if (qrDataUrl) {
      const qrImg = new Image();
      qrImg.onload = () => {
        const qrSize = 200;
        const qrX = (800 - qrSize) / 2; // Use actual canvas dimensions
        const qrY = y + 30;
        
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'center';
        ctx.fillText('Scan for Event Check-in', 800 / 2, qrY + qrSize + 30);
        
        // Download with high quality settings
        const link = document.createElement('a');
        link.download = `registration-card-${registration.uniqueId}.png`;
        link.href = canvas.toDataURL('image/png', 1.0); // Maximum quality
        link.click();
      };
      qrImg.onerror = () => {
        console.error('Failed to load QR image for download');
        // Download without QR code with high quality
        const link = document.createElement('a');
        link.download = `registration-card-${registration.uniqueId}.png`;
        link.href = canvas.toDataURL('image/png', 1.0); // Maximum quality
        link.click();
      };
      qrImg.src = qrDataUrl;
    } else {
      // Download without QR code with high quality
      const link = document.createElement('a');
      link.download = `registration-card-${registration.uniqueId}.png`;
      link.href = canvas.toDataURL('image/png', 1.0); // Maximum quality
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
        {/* Dynamic Registration Details */}
        {displayFields.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayFields.map((field, index) => {
              const IconComponent = field.icon;
              return (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <IconComponent className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">{field.label}</p>
                    <p className="font-semibold text-sm">{field.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
        <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
          <p className="text-base font-semibold text-blue-700 mb-3">Manual Verification ID</p>
          <div className="inline-block px-6 py-4 bg-white rounded-lg border-2 border-blue-300 shadow-sm">
            <p className="text-3xl font-mono font-bold text-blue-600 tracking-widest">{registration.uniqueId}</p>
          </div>
          <p className="text-sm text-blue-600 mt-3 font-medium">Present this ID for manual check-in if QR code scanning is unavailable</p>
        </div>
        
        {/* QR Code Section */}
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-4 flex items-center justify-center gap-2">
            <QrCode className="h-5 w-5" />
            Your Registration QR Code
          </h3>
          {(() => {
            // Helper function to normalize QR code data to proper data URL
            const normalizeQRCodeData = () => {
              // Try different sources in order of preference
              const sources = [
                qrImageBase64,
                registration.qrImage,
                registration.qrCodeImage,
                registration.qrImageBase64,
                registration.qrCode
              ];

              for (const source of sources) {
                if (source && typeof source === 'string' && source.length > 10) {
                  // If it already has data URL prefix, use as-is
                  if (source.startsWith('data:image/')) {
                    return source;
                  }
                  // If it's base64 data without prefix, add prefix
                  if (source.length > 50) { // Reasonable check for base64 data
                    return `data:image/png;base64,${source}`;
                  }
                }
              }
              return null;
            };

            const qrSrc = normalizeQRCodeData();
            
            return qrSrc ? (
              <div className="inline-block p-4 bg-white rounded-lg border-2 border-gray-200">
                <img 
                  src={qrSrc}
                  alt="Registration QR Code" 
                  className="w-48 h-48 mx-auto"
                  onError={(e) => {
                    console.error('Failed to load QR image for download');
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.nextElementSibling as HTMLElement;
                    if (fallback) {
                      fallback.style.display = 'block';
                      if (target.parentElement) {
                        target.parentElement.style.display = 'none';
                      }
                    }
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
            );
          })()}
          <p className="text-sm text-gray-600 mt-4">
            Save this QR code or take a screenshot. Present it at the event entrance for quick check-in.
          </p>
        </div>
        
        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">Check-in Instructions</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Present the QR code above at the event entrance</li>
            <li>• Alternatively, provide your Verification ID: <strong>{registration.uniqueId}</strong></li>
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
            onClick={() => {
              // Add comprehensive print-specific styling for high quality printing
              const printStyle = document.createElement('style');
              printStyle.textContent = `
                @page {
                  size: A4;
                  margin: 1cm;
                }
                @media print {
                  * { 
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  body * { visibility: hidden; }
                  .registration-card, .registration-card * { visibility: visible !important; }
                  .registration-card { 
                    position: absolute !important; 
                    left: 0 !important; 
                    top: 0 !important; 
                    width: 100% !important;
                    max-width: none !important;
                    box-shadow: none !important;
                    border: 2px solid #4F46E5 !important;
                    margin: 0 !important;
                    padding: 30px !important;
                    background: white !important;
                    color: black !important;
                    font-size: 16px !important;
                    line-height: 1.6 !important;
                    page-break-inside: avoid !important;
                  }
                  .print-hide { display: none !important; }
                  .bg-gradient-to-r { 
                    background: linear-gradient(to right, #4F46E5, #7C3AED) !important;
                    color: white !important;
                  }
                  .bg-gradient-to-br { 
                    background: #EBF8FF !important;
                    border: 2px solid #93C5FD !important;
                  }
                  .bg-gray-50 { 
                    background: #F9FAFB !important; 
                    border: 1px solid #E5E7EB !important;
                  }
                  .bg-blue-50 { 
                    background: #EBF8FF !important;
                    border: 1px solid #DBEAFE !important;
                  }
                  .text-white { color: white !important; }
                  .text-blue-600 { color: #2563EB !important; }
                  .text-blue-700 { color: #1D4ED8 !important; }
                  .text-blue-800 { color: #1E40AF !important; }
                  .border-blue-200 { border-color: #DBEAFE !important; }
                  .border-blue-300 { border-color: #93C5FD !important; }
                  .border-blue-400 { border-color: #60A5FA !important; }
                  .border-l-4 { border-left: 4px solid #60A5FA !important; }
                  img { 
                    max-width: 180px !important; 
                    height: auto !important;
                    border: 2px solid #E5E7EB !important;
                  }
                  h1, h2, h3 { 
                    font-weight: bold !important;
                    margin-bottom: 10px !important;
                  }
                  .text-3xl { font-size: 32px !important; }
                  .text-2xl { font-size: 24px !important; }
                  .text-xl { font-size: 20px !important; }
                  .text-lg { font-size: 18px !important; }
                  .text-base { font-size: 16px !important; }
                  .text-sm { font-size: 14px !important; }
                  .text-xs { font-size: 12px !important; }
                  .font-mono { font-family: 'Courier New', monospace !important; }
                  .font-bold { font-weight: bold !important; }
                  .tracking-widest { letter-spacing: 0.2em !important; }
                  .mb-3 { margin-bottom: 12px !important; }
                  .mt-3 { margin-top: 12px !important; }
                  .p-3 { padding: 12px !important; }
                  .p-4 { padding: 16px !important; }
                  .p-6 { padding: 24px !important; }
                  .rounded-lg { border-radius: 8px !important; }
                  .rounded-xl { border-radius: 12px !important; }
                  .grid { display: block !important; }
                  .flex { display: block !important; }
                  .space-y-1 > * + * { margin-top: 4px !important; }
                  .space-y-6 > * + * { margin-top: 24px !important; }
                  .gap-3 { margin-bottom: 12px !important; }
                  .gap-4 { margin-bottom: 16px !important; }
                }
              `;
              document.head.appendChild(printStyle);
              
              // Mark the card for printing
              const card = document.querySelector('.max-w-2xl');
              if (card) {
                card.classList.add('registration-card');
              }
              
              // Hide buttons during print
              const buttons = document.querySelectorAll('button');
              buttons.forEach(btn => btn.classList.add('print-hide'));
              
              window.print();
              
              // Clean up after print
              setTimeout(() => {
                document.head.removeChild(printStyle);
                if (card) {
                  card.classList.remove('registration-card');
                }
                buttons.forEach(btn => btn.classList.remove('print-hide'));
              }, 1000);
            }}
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