import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { Camera, Check, X, Upload } from "lucide-react";

interface FaceRecognitionTestProps {
  eventId: string;
}

interface ValidationResult {
  isValid: boolean;
  member?: {
    firstName: string;
    lastName: string;
    email: string;
    auxiliaryBody: string;
  };
  confidence?: number;
  message: string;
  validationStatus: "valid" | "invalid" | "error";
}

export function FaceRecognitionTest({ eventId }: FaceRecognitionTestProps) {
  const { toast } = useToast();
  const [memberName, setMemberName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const validateMutation = useMutation({
    mutationFn: async ({ file, memberName, email }: { file: File; memberName: string; email: string }) => {
      const formData = new FormData();
      formData.append("faceImage", file);
      formData.append("memberName", memberName);
      formData.append("email", email);
      formData.append("eventId", eventId);

      const response = await fetch("/api/face-recognition/demo-validate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.validationStatus === "valid") {
        toast({
          title: "Validation Successful",
          description: data.message,
        });
      } else {
        toast({
          title: "Validation Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Face validation error:", error);
      toast({
        title: "Error",
        description: "Failed to validate face. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleValidate = () => {
    if (!selectedFile || !memberName.trim()) {
      toast({
        title: "Error",
        description: "Please select an image and enter member name",
        variant: "destructive",
      });
      return;
    }

    validateMutation.mutate({
      file: selectedFile,
      memberName: memberName.trim(),
      email: email.trim(),
    });
  };

  const getResultCardClasses = () => {
    if (result?.validationStatus === 'valid') {
      return 'border-2 border-green-500 bg-green-50';
    } else if (result?.validationStatus === 'invalid') {
      return 'border-2 border-red-500 bg-red-50';
    } else {
      return 'border-2 border-orange-500 bg-orange-50';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Test Face Recognition
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Demo face recognition testing - upload any photo and try different names to see validation results.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-900">💡 Demo Tips:</p>
            <ul className="text-xs text-blue-800 mt-1 space-y-1">
              <li>• Try "John Doe" or "Test User" for successful validation</li>
              <li>• Use any other name to see validation failure</li>
              <li>• Any image will work - this is a demonstration</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member-name">Member Name *</Label>
            <Input
              id="member-name"
              type="text"
              placeholder="e.g., Aderibigbe Olamide"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              disabled={validateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., member@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={validateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="face-image">Face Image *</Label>
            <Input
              id="face-image"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={validateMutation.isPending}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          <Button
            onClick={handleValidate}
            disabled={!selectedFile || !memberName.trim() || validateMutation.isPending}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {validateMutation.isPending ? "Validating..." : "Test Face Recognition"}
          </Button>
        </div>

        {result && (
          <Card className={getResultCardClasses()}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {result.validationStatus === 'valid' ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <X className="h-5 w-5 text-red-600" />
                )}
                <h4 className="font-medium">
                  {result.validationStatus === 'valid' ? 'Validation Success' : 'Validation Failed'}
                </h4>
              </div>
              
              <p className="text-sm mb-3">{result.message}</p>
              
              {result.member && (
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {result.member.firstName} {result.member.lastName}</p>
                  <p><strong>Email:</strong> {result.member.email}</p>
                  <p><strong>Auxiliary Body:</strong> {result.member.auxiliaryBody}</p>
                  {result.confidence && (
                    <p><strong>Confidence:</strong> {Math.round(result.confidence * 100)}%</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>How to test:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Enter the member name exactly as registered (e.g., "Aderibigbe Olamide")</li>
            <li>Upload a clear face photo for comparison</li>
            <li>The system will search for matching registrations and compare faces</li>
            <li>Results show validation status and confidence level</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
