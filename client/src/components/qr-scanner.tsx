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
      
      // Extract uniqueId from QR data (handle both JSON format and plain text)
      let uniqueId: string;
      try {
        const parsed = JSON.parse(qrData);
        uniqueId = parsed.uniqueId || qrData;
      } catch {
        // If not JSON, treat as plain uniqueId
        uniqueId = qrData;
      }
      
      console.log('Validating QR code with uniqueId:', uniqueId);
      
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
        description: `${data.registration?.guestName || (data.registration?.firstName + ' ' + data.registration?.lastName)} validated for ${data.event?.name}`,
      });
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

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    // Ultra-fast processing - very small canvas for maximum speed
    const maxWidth = 160;
    const maxHeight = 120;
    const scale = Math.min(maxWidth / video.videoWidth, maxHeight / video.videoHeight, 1);
    
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    
    // Use faster rendering
    context.imageSmoothingEnabled = false;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Enhanced QR detection with multiple attempts
    let code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    
    // Try with inversion if first attempt fails
    if (!code) {
      code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });
    }
    
    // Try with different scan options
    if (!code) {
      code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "invertFirst",
      });
    }
    
    if (code) {
      console.log('QR Code detected:', code.data);
      console.log('QR Code location:', code.location);
      validateQRMutation.mutate(code.data);
      stopCamera(); // Stop scanning after successful scan
    } else {
      // Debug output every 50 scans
      if (Math.random() < 0.02) {
        console.log('QR scan attempt - no code found. Video dimensions:', video.videoWidth, 'x', video.videoHeight, 'Canvas:', canvas.width, 'x', canvas.height);
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
            // Ultra-fast scanning every 100ms for immediate capture
            scanIntervalRef.current = window.setInterval(scanQRCode, 100);
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
        description: `${data.registration.guestName || (data.member?.firstName + ' ' + data.member?.lastName)} validated for ${data.event.name}`,
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
                  (lastScanResult.member 
                    ? `${lastScanResult.member.firstName} ${lastScanResult.member.lastName} - ${lastScanResult.event?.name}`
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
