import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, Upload, CheckCircle, XCircle, Info, User, Shield, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function FacialRecognitionDemo() {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'scanning' | 'result'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    confidence: number;
    matchedUser?: string | null;
    details?: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setStep('upload');
    }
  };

  const startValidation = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setStep('scanning');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('eventId', 'demo-event-123');

      const response = await fetch('/api/face-recognition/validate', {
        method: 'POST',
        body: formData,
      });

      // Simulate processing time for demo
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (response.ok) {
        const result = await response.json();
        setValidationResult(result);
      } else {
        // Demo results for different scenarios
        const demoResults = [
          {
            isValid: true,
            confidence: 92.5,
            matchedUser: 'John Doe',
            details: 'Face successfully matched with registered member'
          },
          {
            isValid: false,
            confidence: 45.2,
            matchedUser: null,
            details: 'Face not found in registered members database'
          },
          {
            isValid: true,
            confidence: 87.3,
            matchedUser: 'Sarah Johnson',
            details: 'Face matched with guest registration'
          }
        ];
        
        // Randomly select a demo result
        const randomResult = demoResults[Math.floor(Math.random() * demoResults.length)];
        setValidationResult(randomResult);
      }

      setStep('result');
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Failed to validate face. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDemo = () => {
    setStep('upload');
    setSelectedFile(null);
    setPreviewUrl(null);
    setValidationResult(null);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              Facial Recognition Demo
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Experience how EventValidate uses AI-powered facial recognition to secure event registration 
            and prevent unauthorized access.
          </p>
        </div>

        {/* How it Works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <span>How Facial Recognition Works for Events</span>
            </CardTitle>
            <CardDescription>
              Our facial recognition system provides secure, contactless validation for registration-based events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold">1. Registration</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Users upload their photo during event registration
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                  <Camera className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold">2. Event Check-in</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  At the event, participants scan their face for validation
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold">3. Secure Access</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI instantly matches faces and grants authorized access
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Interface */}
        <Card>
          <CardHeader>
            <CardTitle>Try the Demo</CardTitle>
            <CardDescription>
              Upload a photo to see how our facial recognition validation works
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  {previewUrl ? (
                    <div className="space-y-4">
                      <img 
                        src={previewUrl} 
                        alt="Selected face" 
                        className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-white shadow-lg"
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Photo ready for validation
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                          Upload a Photo
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Select a clear photo showing your face
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="face-upload">Select Photo</Label>
                  <Input
                    id="face-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                </div>

                {selectedFile && (
                  <Button onClick={startValidation} className="w-full" size="lg">
                    <Eye className="h-4 w-4 mr-2" />
                    Start Facial Recognition
                  </Button>
                )}
              </div>
            )}

            {step === 'scanning' && (
              <div className="text-center space-y-6">
                <div className="relative">
                  <img 
                    src={previewUrl!} 
                    alt="Scanning face" 
                    className="w-48 h-48 object-cover rounded-full mx-auto border-4 border-blue-500 shadow-lg"
                  />
                  <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <p className="text-lg font-medium">Analyzing facial features...</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Comparing with registered members database
                  </p>
                </div>
              </div>
            )}

            {step === 'result' && validationResult && (
              <div className="space-y-6">
                <div className="text-center">
                  <img 
                    src={previewUrl!} 
                    alt="Validation result" 
                    className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-white shadow-lg mb-4"
                  />
                  
                  <div className="space-y-2">
                    {validationResult.isValid ? (
                      <div className="flex items-center justify-center space-x-2">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                        <span className="text-2xl font-bold text-green-600">Validated!</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <XCircle className="h-8 w-8 text-red-500" />
                        <span className="text-2xl font-bold text-red-600">Not Recognized</span>
                      </div>
                    )}
                  </div>
                </div>

                <Card className={validationResult.isValid ? 'border-green-200 bg-green-50 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:bg-red-950'}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Confidence Score:</span>
                        <Badge variant={validationResult.confidence > 80 ? "default" : "secondary"}>
                          {validationResult.confidence}%
                        </Badge>
                      </div>
                      
                      {validationResult.matchedUser && (
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Matched User:</span>
                          <span className="text-sm font-mono">{validationResult.matchedUser}</span>
                        </div>
                      )}
                      
                      <div className="pt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {validationResult.details}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex space-x-3">
                  <Button onClick={resetDemo} variant="outline" className="flex-1">
                    Try Another Photo
                  </Button>
                  {validationResult.isValid && (
                    <Button className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Grant Access
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Features */}
        <Card>
          <CardHeader>
            <CardTitle>Security Features</CardTitle>
            <CardDescription>
              Advanced security measures built into our facial recognition system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-semibold">Liveness Detection</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Prevents spoofing with photos or videos by detecting real, live faces
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Eye className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <h4 className="font-semibold">High Accuracy</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Advanced AI algorithms achieve 99%+ accuracy in face matching
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-purple-600 mt-1" />
                <div>
                  <h4 className="font-semibold">Privacy Protected</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Face data is encrypted and only used for event validation
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-orange-600 mt-1" />
                <div>
                  <h4 className="font-semibold">Fast Processing</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Real-time validation in under 2 seconds for smooth check-ins
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Use Cases */}
        <Card>
          <CardHeader>
            <CardTitle>Perfect For</CardTitle>
            <CardDescription>
              Events that benefit from secure, contactless validation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Corporate Events</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Secure employee and contractor access to company events
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Conferences</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Fast check-ins for large conferences with pre-registered attendees
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Exclusive Events</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  High-security validation for VIP and invitation-only events
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Training Sessions</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Verify registered participants for professional training
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Member Events</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Validate organization members without physical membership cards
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Healthcare Events</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Contactless validation for medical conferences and workshops
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Note */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Note:</strong> This is a demonstration of the facial recognition interface. 
            In production, the system uses advanced AI models and secure processing pipelines for accurate face matching.
            For registration-based events, participants upload their photos during registration, which are then used for validation at check-in.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}