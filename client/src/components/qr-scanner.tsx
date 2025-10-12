import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { Camera, CheckCircle, XCircle, Hash } from "lucide-react";
import jsQR from "jsqr";

interface QRScannerProps {
  onClose: () => void;
}

export function QRScanner({ onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const validateQRMutation = useMutation({
    mutationFn: async (qrData: string) => {
      const authHeaders = getAuthHeaders();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      }
      
      console.log('🔍 QR code scanned - Raw data:', qrData);
      console.log('🔍 QR data length:', qrData?.length);
      console.log('🔍 QR data type:', typeof qrData);
      
      // Parse QR data to determine type
      let parsedData;
      try {
        parsedData = JSON.parse(qrData);
        console.log('🔍 Parsed QR data:', parsedData);
      } catch (e) {
        console.log('🔍 QR data is not JSON, treating as raw string');
        parsedData = null;
      }
      
      // Determine if this is a ticket or registration QR code
      const isTicketQR = parsedData && (parsedData.ticketId || parsedData.ticketNumber);
      const isRegistrationQR = parsedData && (parsedData.registrationId || parsedData.uniqueId);
      
      console.log('🔍 QR Type Detection:', { isTicketQR, isRegistrationQR });
      
      let endpoint, requestBody;
      
      if (isTicketQR) {
        // For ticket-based events, use the ticket validation endpoint
        console.log('🎫 Processing as TICKET QR code');
        const ticketId = parsedData.ticketId || parsedData.ticketNumber;
        endpoint = `/api/tickets/${ticketId}/validate`;
        requestBody = {}; // Ticket validation doesn't need body data, just the ID in URL
      } else if (isRegistrationQR) {
        // For registration-based events, use the registration validation endpoint
        console.log('📝 Processing as REGISTRATION QR code');
        endpoint = "/api/registrations/validate-qr";
        requestBody = { qrCode: qrData };
      } else {
        // Fallback: try registration endpoint for backward compatibility
        console.log('❓ Unknown QR format, defaulting to REGISTRATION endpoint');
        endpoint = "/api/registrations/validate-qr";
        requestBody = { qrCode: qrData };
      }
      
      console.log('🔍 Using endpoint:', endpoint);
      console.log('🔍 Request body:', requestBody);
      
      console.log('🔍 Making request to:', endpoint);
      console.log('🔍 Request headers:', headers);
      console.log('🔍 Request body JSON:', JSON.stringify(requestBody));
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });
      
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Get response text first to debug JSON parsing issues
      const responseText = await response.text();
      console.log('🔍 Raw response text:', responseText);
      console.log('🔍 Response text length:', responseText.length);
      
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('🔍 Parsed JSON result:', result);
      } catch (jsonError: any) {
        console.error('❌ JSON parsing error:', jsonError);
        console.error('❌ Failed to parse response:', responseText);
        throw new Error(`Invalid JSON response: ${jsonError.message}. Response: ${responseText.substring(0, 100)}...`);
      }
      
      if (!response.ok) {
        throw new Error(result.message || "Validation failed");
      }
      
      // Normalize response format for consistent handling
      if (isTicketQR) {
        // Handle ticket endpoint response format
        const ticketData = result.ticket || {};
        return {
          ...result,
          registration: {
            ticketNumber: ticketData.ticketNumber || '',
            firstName: ticketData.ownerName?.split(' ')[0] || '',
            lastName: ticketData.ownerName?.split(' ').slice(1).join(' ') || '',
            guestName: ticketData.ownerName || 'Ticket Holder',
            email: ticketData.ownerEmail || '',
            phone: ticketData.ownerPhone || '',
            ticketType: ticketData.category || ticketData.ticketType || '',
            price: ticketData.price || '',
            currency: ticketData.currency || 'NGN'
          },
          validationType: 'ticket',
          validationStatus: result.success ? 'valid' : 'invalid'
        };
      }
      
      return { ...result, validationType: 'registration' };
    },
    onSuccess: (data) => {
      console.log('QR validation response:', data);
      setLastScanResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      
      // Handle both ticket and registration responses
      let memberName = 'Member';
      let itemType = 'entry';
      let itemId = '';
      
      if (data.validationType === 'ticket' && data.registration) {
        memberName = data.registration.guestName || 
                    data.registration.ownerName || 
                    'Ticket Holder';
        itemType = 'ticket';
        itemId = data.registration.ticketNumber || '';
      } else if (data.registration) {
        memberName = data.registration.guestName || 
                    data.registration.participantName || 
                    data.registration.ownerName || 
                    'Member';
        itemType = 'registration';
        itemId = data.registration.uniqueId || '';
      }
      
      if (data.validationStatus === "already_validated" || 
          data.message?.includes("already") || 
          data.message?.includes("used")) {
        toast({
          title: "Already Validated",
          description: `${memberName} was already validated${data.event?.name ? ` for ${data.event.name}` : ''}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Validation Successful ✅",
          description: `${memberName} validated${data.event?.name ? ` for ${data.event.name}` : ''} ${itemId ? `(${itemId})` : ''}`,
        });
      }
    },
    onError: (error: Error) => {
      console.error('QR validation failed:', error);
      setLastScanResult({ validationStatus: "invalid", message: error.message });
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    // High-resolution canvas for better QR detection
    const maxWidth = 640;
    const maxHeight = 480;
    const scale = Math.min(maxWidth / video.videoWidth, maxHeight / video.videoHeight, 1);
    
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    
    // Clear canvas first
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // High-quality rendering for better QR detection
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // ULTRA-SENSITIVE QR detection with 8 different approaches
    let code = null;
    
    // Approach 1: Standard detection with both inversions
    code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    
    // Approach 2: Invert first for dark backgrounds  
    if (!code) {
      code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "invertFirst",
      });
    }
    
    // Approach 3: No inversion for clean images
    if (!code) {
      code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
    }
    
    // Approach 4: Scale up for small/distant QR codes
    if (!code && canvas.width < 400) {
      const scaledCanvas = document.createElement('canvas');
      const scaledContext = scaledCanvas.getContext('2d');
      if (scaledContext) {
        scaledCanvas.width = canvas.width * 3;
        scaledCanvas.height = canvas.height * 3;
        scaledContext.imageSmoothingEnabled = false;
        scaledContext.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        const scaledImageData = scaledContext.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height);
        code = jsQR(scaledImageData.data, scaledImageData.width, scaledImageData.height, {
          inversionAttempts: "attemptBoth",
        });
      }
    }
    
    // Approach 5: Higher contrast enhancement
    if (!code) {
      const contrastData = new Uint8ClampedArray(imageData.data);
      for (let i = 0; i < contrastData.length; i += 4) {
        const gray = (contrastData[i] + contrastData[i + 1] + contrastData[i + 2]) / 3;
        const enhanced = gray > 128 ? 255 : 0;
        contrastData[i] = contrastData[i + 1] = contrastData[i + 2] = enhanced;
      }
      code = jsQR(contrastData, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
    }
    
    // Approach 6: Try subsections of the image (top-left quadrant)
    if (!code && canvas.width > 100 && canvas.height > 100) {
      const quarterData = context.getImageData(0, 0, Math.floor(canvas.width/2), Math.floor(canvas.height/2));
      code = jsQR(quarterData.data, quarterData.width, quarterData.height, {
        inversionAttempts: "attemptBoth",
      });
    }
    
    // Approach 7: Try center region
    if (!code && canvas.width > 200 && canvas.height > 200) {
      const centerX = Math.floor(canvas.width/4);
      const centerY = Math.floor(canvas.height/4);
      const centerW = Math.floor(canvas.width/2);
      const centerH = Math.floor(canvas.height/2);
      const centerData = context.getImageData(centerX, centerY, centerW, centerH);
      code = jsQR(centerData.data, centerData.width, centerData.height, {
        inversionAttempts: "attemptBoth",
      });
    }
    
    // Approach 8: Try with smoothing disabled for pixelated QR codes
    if (!code) {
      const sharpCanvas = document.createElement('canvas');
      const sharpContext = sharpCanvas.getContext('2d');
      if (sharpContext) {
        sharpCanvas.width = canvas.width;
        sharpCanvas.height = canvas.height;
        sharpContext.imageSmoothingEnabled = false;
        sharpContext.drawImage(video, 0, 0, sharpCanvas.width, sharpCanvas.height);
        const sharpImageData = sharpContext.getImageData(0, 0, sharpCanvas.width, sharpCanvas.height);
        code = jsQR(sharpImageData.data, sharpImageData.width, sharpImageData.height, {
          inversionAttempts: "attemptBoth",
        });
      }
    }
    
    if (code) {
      console.log('🎯 QR CODE DETECTED!');
      console.log('Raw QR data:', code.data);
      console.log('QR Code location:', code.location);
      
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(code.data);
        console.log('Parsed QR JSON:', parsed);
        console.log('Contains registrationId?', !!parsed.registrationId);
        console.log('Contains eventId?', !!parsed.eventId);
        console.log('Contains uniqueId?', !!parsed.uniqueId);
      } catch (e) {
        console.log('QR data is not JSON:', code.data);
      }
      
      validateQRMutation.mutate(code.data);
      stopCamera(); // Stop scanning after successful scan
    } else {
      // Debug output every 30 scans with more detail
      if (Math.random() < 0.1) { // More frequent debugging
        console.log('QR scan attempt - no code detected. Video:', video.videoWidth + 'x' + video.videoHeight, 'Canvas:', canvas.width + 'x' + canvas.height, 'Brightness:', Math.round(imageData.data.reduce((sum, val, i) => i % 4 < 3 ? sum + val : sum, 0) / (imageData.data.length * 0.75)));
      }
    }
  };

  const startCamera = async () => {
    try {
      setCameraStatus('initializing');
      setCameraError(null);
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available in this browser");
      }

      // First try with back camera, fallback to any available camera
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "environment",
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 30 }
          }
        });
        console.log("Back camera successful");
      } catch (backCameraError) {
        console.log("Back camera not available, trying front camera");
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: "user",
              width: { ideal: 320 },
              height: { ideal: 240 },
              frameRate: { ideal: 30 }
            }
          });
          console.log("Front camera successful");
        } catch (frontCameraError) {
          console.log("Front camera not available, trying any camera");
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
          console.log("Any camera successful");
        }
      }
      
      // Set scanning state first to render video element
      setIsScanning(true);
      setCameraError(null);
      
      // Wait for video element to be rendered
      setTimeout(() => {
        console.log("Checking video ref after render:", !!videoRef.current);
        if (videoRef.current && stream) {
          console.log("Setting video source object");
          const video = videoRef.current;
          console.log("Video element found:", video);
          video.srcObject = stream;
          streamRef.current = stream;
        
        // Force video to be visible
        video.style.display = 'block';
        video.style.visibility = 'visible';
        
        // Immediate check
        console.log("Video immediately after setting srcObject:", {
          srcObject: !!video.srcObject,
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        });
        
        // Ensure video plays and wait for metadata
        video.onloadedmetadata = () => {
          console.log("Video metadata loaded, dimensions:", video.videoWidth, "x", video.videoHeight);
          setCameraStatus('ready');
          video.play().then(() => {
            console.log("Video started playing successfully");
            // Ultra-fast scanning every 50ms for immediate detection
            scanIntervalRef.current = window.setInterval(scanQRCode, 50);
          }).catch(playError => {
            console.error("Video play error:", playError);
            setCameraError("Unable to start video playback");
            setCameraStatus('error');
            toast({
              title: "Video Error",
              description: "Unable to start video playback. Please try again.",
              variant: "destructive",
            });
          });
        };
        
        // Additional event listeners for debugging
        video.oncanplay = () => {
          console.log("Video can play");
        };
        
        video.onplaying = () => {
          console.log("Video is playing");
        };
        
        video.onloadstart = () => {
          console.log("Video load started");
        };
        
        video.onerror = (e) => {
          console.error("Video element error:", e);
        };
        
        video.onstalled = () => {
          console.log("Video stalled");
        };
        
        video.onsuspend = () => {
          console.log("Video suspended");
        };
        
        // Force play after a short delay if metadata doesn't load
        setTimeout(() => {
          if (video && video.readyState >= 2) {
            console.log("Force playing video after timeout");
            video.play().catch(console.error);
          }
          
          // Debug video state
          if (video) {
            console.log("Video element state after 1s:", {
              srcObject: !!video.srcObject,
              readyState: video.readyState,
              paused: video.paused,
              width: video.videoWidth,
              height: video.videoHeight,
              currentTime: video.currentTime,
              duration: video.duration,
              played: video.played.length > 0,
              stream: stream.active,
              tracks: stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
            });
          }
        }, 1000);
        
        // Also try manual load
        video.load();
        
        // Handle video errors
        video.onerror = (error) => {
          console.error("Video element error:", error);
          toast({
            title: "Video Error",
            description: "Video playback failed. Please try again.",
            variant: "destructive",
          });
        };
      } else {
          console.error("Video element not found or stream is null:", {
            videoRef: !!videoRef.current,
            stream: !!stream
          });
          setCameraError("Video element not available");
          setCameraStatus('error');
        }
      }, 100); // Wait 100ms for React to render the video element
    } catch (error) {
      console.error("Camera access error:", error);
      setCameraStatus('error');
      let errorMessage = "Unable to access camera. ";

      // Type guard for error object
      const err = error as { name?: string };

      if (err && err.name === 'NotAllowedError') {
        errorMessage += "Permission denied. Please allow camera access.";
      } else if (err && err.name === 'NotFoundError') {
        errorMessage += "No camera found on this device.";
      } else if (err && err.name === 'NotSupportedError') {
        errorMessage += "Camera not supported in this browser.";
      } else if (err && err.name === 'NotReadableError') {
        errorMessage += "Camera is already in use by another application.";
      } else if (!window.location.protocol.startsWith('https') && window.location.hostname !== 'localhost') {
        errorMessage += "Camera requires HTTPS or localhost.";
      } else {
        errorMessage += "Please check browser permissions and try again.";
      }
      
      setCameraError(errorMessage);
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  };

  const [manualId, setManualId] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [showTestQR, setShowTestQR] = useState(false);

  const validateIdMutation = useMutation({
    mutationFn: async (uniqueId: string) => {
      const authHeaders = getAuthHeaders();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      }
      
      const response = await fetch("/api/validate-id", {
        method: "POST",
        headers,
        body: JSON.stringify({ uniqueId }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Validation failed");
      }
      
      return result;
    },
    onSuccess: (data) => {
      setLastScanResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Validation Successful",
        description: `${data.details?.participantName || data.details?.ownerName || 'Member'} validated for ${data.details?.eventName || 'Event'}`,
      });
      setManualId("");
      setShowManualInput(false);
    },
    onError: (error: Error) => {
      setLastScanResult({ validationStatus: "invalid", message: error.message });
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleManualValidation = () => {
    if (!manualId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Unique ID",
        variant: "destructive",
      });
      return;
    }
    validateIdMutation.mutate(manualId.trim());
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // QR Scanner now uses jsQR library for real-time scanning

  return (
    <div className="space-y-4">
      <div className="text-center">
        {!isScanning ? (
          <div className="bg-gray-100 rounded-lg p-8 mb-4">
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-4">Click to start camera and scan QR codes</p>
            <Button onClick={startCamera}>
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
          </div>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              controls={false}
              className="w-full bg-black rounded-lg"
              style={{ 
                height: '320px',
                width: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)', // Mirror the video for better UX
                backgroundColor: '#000000',
                border: '2px solid #ff0000' // Red border for debugging
              }}
              onLoadStart={() => console.log("Video load started")}
              onLoadedMetadata={() => console.log("Video metadata loaded")}
              onCanPlay={() => console.log("Video can play")}
              onPlaying={() => console.log("Video is playing")}
              onError={(e) => console.error("Video error:", e)}
            />
            {cameraStatus === 'initializing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-100 rounded-lg">
                <div className="text-center">
                  <Camera className="h-12 w-12 text-blue-500 mx-auto mb-2 animate-pulse" />
                  <p className="text-blue-700 font-medium">Initializing Camera...</p>
                  <p className="text-blue-600 text-sm">Please allow camera access</p>
                </div>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-100 rounded-lg">
                <div className="text-center">
                  <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                  <p className="text-red-700 font-medium">Camera Error</p>
                  <p className="text-red-600 text-sm">{cameraError}</p>
                  <Button 
                    onClick={startCamera} 
                    className="mt-4"
                    variant="outline"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-lg shadow-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-white"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-white"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-white"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-white"></div>
              </div>
            </div>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <Button variant="outline" onClick={stopCamera} className="bg-white/90 backdrop-blur-sm">
                Stop Camera
              </Button>
            </div>
          </div>
        )}
      </div>

      {showManualInput && (
        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="uniqueId">Enter Unique ID</Label>
            <Input
              id="uniqueId"
              placeholder="Enter the unique ID from registration card"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualValidation()}
            />
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              The Unique ID is displayed on the registration card that attendees received via email.
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleManualValidation} 
              disabled={validateIdMutation.isPending || !manualId.trim()}
              className="flex-1"
            >
              {validateIdMutation.isPending ? "Validating..." : "Validate ID"}
            </Button>
            <Button variant="outline" onClick={() => setShowManualInput(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showTestQR && (
        <div className="space-y-4 border-t pt-4">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Test QR Code</h3>
            <p className="text-sm text-gray-600 mb-4">
              Scan this QR code to test your scanner
            </p>
            <div className="flex justify-center">
              <img 
                src="data:image/png;base64,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"
                alt="Test QR Code"
                className="w-48 h-48 border border-gray-300 rounded"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              QR Data: {JSON.stringify({"registrationId":"test123","eventId":"event123","uniqueId":"TEST01","timestamp":Date.now()})}
            </p>
          </div>
        </div>
      )}

      <div className="space-x-2">
        <Button 
          variant="outline" 
          onClick={() => setShowManualInput(!showManualInput)}
          className="flex items-center gap-2"
        >
          <Hash className="h-4 w-4" />
          {showManualInput ? "Hide Manual Entry" : "Manual Entry"}
        </Button>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {lastScanResult && (
        <div className={`p-4 rounded-lg border ${
          lastScanResult.validationStatus === "valid" 
            ? "bg-green-50 border-green-200" 
            : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center">
            {lastScanResult.validationStatus === "valid" ? (
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 mr-3" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                lastScanResult.validationStatus === "valid" 
                  ? "text-green-800" 
                  : "text-red-800"
              }`}>
                {lastScanResult.validationStatus === "valid" ? "Valid Scan" : "Invalid Scan"}
              </p>
              <p className={`text-xs ${
                lastScanResult.validationStatus === "valid" 
                  ? "text-green-600" 
                  : "text-red-600"
              }`}>
                {lastScanResult.message || 
                  (lastScanResult.details?.participantName || lastScanResult.details?.ownerName
                    ? `${lastScanResult.details.participantName || lastScanResult.details.ownerName} - ${lastScanResult.details?.eventName || 'Event'}`
                    : "Scan result"
                  )
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
