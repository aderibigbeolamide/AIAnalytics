import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { Camera, Upload, User, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface FaceRecognitionValidatorProps {
  eventId: string;
  onValidationSuccess?: (result: any) => void;
  onClose: () => void;
}

export function FaceRecognitionValidator({ eventId, onValidationSuccess, onClose }: FaceRecognitionValidatorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [memberName, setMemberName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isUsingCamera, setIsUsingCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const validateFaceMutation = useMutation({
    mutationFn: async ({ file, memberName, email }: { file: File; memberName: string; email: string }) => {
      const authHeaders = getAuthHeaders();
      const formData = new FormData();
      formData.append('faceImage', file);
      formData.append('eventId', eventId);
      formData.append('memberName', memberName);
      if (email) formData.append('email', email);

      const response = await fetch('/api/validate-face', {
        method: 'POST',
        headers: {
          ...authHeaders,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Face validation failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setValidationResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Validation Successful",
        description: `${data.memberName} has been validated for ${data.event?.name}`,
      });
      onValidationSuccess?.(data);
    },
    onError: (error: Error) => {
      setValidationResult({ validationStatus: "invalid", message: error.message });
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user' 
        } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsUsingCamera(true);
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please use file upload instead.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsUsingCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'captured_face.jpg', { type: 'image/jpeg' });
        setSelectedFile(file);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const handleValidation = () => {
    if (!selectedFile || !memberName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a face image and member name",
        variant: "destructive",
      });
      return;
    }

    validateFaceMutation.mutate({
      file: selectedFile,
      memberName: memberName.trim(),
      email: email.trim(),
    });
  };

  const resetForm = () => {
    setMemberName("");
    setEmail("");
    setSelectedFile(null);
    setPreviewUrl("");
    setValidationResult(null);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-6 w-6" />
            Face Recognition Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {validationResult ? (
            <div className="space-y-4">
              {validationResult.validationStatus === "valid" ? (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="h-8 w-8" />
                    <h3 className="text-xl font-semibold">Validation Successful</h3>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-left space-y-2">
                    <p><strong>Member:</strong> {validationResult.memberName}</p>
                    <p><strong>Event:</strong> {validationResult.event?.name}</p>
                    <p><strong>Status:</strong> Validated</p>
                    <p><strong>Method:</strong> Face Recognition</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={resetForm} variant="outline" className="flex-1">
                      Validate Another
                    </Button>
                    <Button onClick={onClose} className="flex-1">
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <XCircle className="h-8 w-8" />
                    <h3 className="text-xl font-semibold">Validation Failed</h3>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-red-800">{validationResult.message}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={resetForm} variant="outline" className="flex-1">
                      Try Again
                    </Button>
                    <Button onClick={onClose} className="flex-1">
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Member Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="memberName">Member Name *</Label>
                  <Input
                    id="memberName"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Enter member's full name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter member's email"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Face Image Capture */}
              <div className="space-y-4">
                <Label>Face Image *</Label>
                
                {!previewUrl && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startCamera}
                      className="flex-1"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Use Camera
                    </Button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Camera View */}
                {isUsingCamera && (
                  <div className="space-y-4">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        className="w-full rounded-lg border"
                        autoPlay
                        muted
                        playsInline
                      />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={capturePhoto} className="flex-1">
                        <Camera className="h-4 w-4 mr-2" />
                        Capture Photo
                      </Button>
                      <Button onClick={stopCamera} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Preview */}
                {previewUrl && (
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Face preview"
                        className="w-full max-w-md mx-auto rounded-lg border"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        setPreviewUrl("");
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Choose Different Image
                    </Button>
                  </div>
                )}
              </div>

              {/* Validation Button */}
              <div className="flex gap-2">
                <Button
                  onClick={handleValidation}
                  disabled={!selectedFile || !memberName.trim() || validateFaceMutation.isPending}
                  className="flex-1"
                >
                  {validateFaceMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 mr-2" />
                      Validate Member
                    </>
                  )}
                </Button>
                <Button onClick={onClose} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}