import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { Camera, CheckCircle, XCircle } from "lucide-react";

interface QRScannerProps {
  onClose: () => void;
}

export function QRScanner({ onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const validateQRMutation = useMutation({
    mutationFn: async (qrData: string) => {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ qrData }),
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
        description: `${data.member?.firstName} ${data.member?.lastName} - ${data.event?.name}`,
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera if available
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const handleManualInput = () => {
    const qrData = prompt("Enter QR code data manually:");
    if (qrData) {
      validateQRMutation.mutate(qrData);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // This is a simplified QR scanner. In a real implementation,
  // you would use a library like qr-scanner or jsQR to decode QR codes from the video stream
  const simulateScan = () => {
    // Simulate scanning a QR code for demo purposes
    const mockQRData = "eyJyZWdpc3RyYXRpb25JZCI6MSwiZXZlbnRJZCI6MSwidHlwZSI6Im1lbWJlciIsInRpbWVzdGFtcCI6MTcwMzk3MjgwMDAwMH0=";
    validateQRMutation.mutate(mockQRData);
  };

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
              className="w-full h-64 bg-black rounded-lg"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-lg"></div>
            </div>
            <div className="mt-4 space-x-2">
              <Button onClick={simulateScan} disabled={validateQRMutation.isPending}>
                {validateQRMutation.isPending ? "Scanning..." : "Simulate Scan"}
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Stop Camera
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-x-2">
        <Button variant="outline" onClick={handleManualInput}>
          Manual Entry
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
