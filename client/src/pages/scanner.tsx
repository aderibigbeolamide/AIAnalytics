import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { QRScanner } from "@/components/qr-scanner";
import { FaceRecognitionValidator } from "@/components/face-recognition-validator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { QrCode, Camera, User, CheckCircle, XCircle } from "lucide-react";

export default function Scanner() {
  const [validationMethod, setValidationMethod] = useState<"qr" | "manual" | "face">("qr");
  const [manualId, setManualId] = useState("");
  const [lastValidationResult, setLastValidationResult] = useState<any>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("1"); // Default to first event
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const manualValidationMutation = useMutation({
    mutationFn: async (uniqueId: string) => {
      const response = await apiRequest("POST", "/api/validate-id", { uniqueId });
      return response.json();
    },
    onSuccess: (data) => {
      setLastValidationResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Validation Successful",
        description: `Member validated successfully`,
      });
    },
    onError: (error: any) => {
      setLastValidationResult({ validationStatus: "invalid", message: error.message });
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
        title: "ID Required",
        description: "Please enter a valid member ID",
        variant: "destructive",
      });
      return;
    }
    manualValidationMutation.mutate(manualId.trim());
  };

  const handleValidationSuccess = (result: any) => {
    setLastValidationResult(result);
  };

  const resetValidation = () => {
    setLastValidationResult(null);
    setManualId("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Validation Center</h1>
          <p className="text-gray-600">Multiple validation methods for event attendance</p>
        </div>

        {validationMethod === "face" ? (
          <FaceRecognitionValidator
            onValidationSuccess={handleValidationSuccess}
            onClose={() => setValidationMethod("qr")}
          />
        ) : (
          <Tabs value={validationMethod} onValueChange={(value) => setValidationMethod(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="qr" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR Scanner
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Manual ID
              </TabsTrigger>
              <TabsTrigger value="face" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Face Recognition
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    QR Code Scanner
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <QRScanner onClose={resetValidation} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Manual ID Validation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="manualId">Member Unique ID</Label>
                    <Input
                      id="manualId"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value.toUpperCase())}
                      placeholder="Enter 6-character ID (e.g., ABC123)"
                      maxLength={6}
                      className="font-mono text-lg tracking-wider"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleManualValidation}
                    disabled={!manualId.trim() || manualValidationMutation.isPending}
                    className="w-full"
                  >
                    {manualValidationMutation.isPending ? "Validating..." : "Validate Member"}
                  </Button>

                  {lastValidationResult && (
                    <div className="mt-6">
                      {lastValidationResult.validationStatus === "valid" ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-green-600 mb-2">
                            <CheckCircle className="h-5 w-5" />
                            <h3 className="font-semibold">Validation Successful</h3>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p><strong>Member:</strong> {lastValidationResult.member?.firstName} {lastValidationResult.member?.lastName}</p>
                            <p><strong>Event:</strong> {lastValidationResult.event?.name}</p>
                            <p><strong>Status:</strong> Validated</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-red-600 mb-2">
                            <XCircle className="h-5 w-5" />
                            <h3 className="font-semibold">Validation Failed</h3>
                          </div>
                          <p className="text-sm text-red-800">{lastValidationResult.message}</p>
                        </div>
                      )}
                      <Button onClick={resetValidation} variant="outline" className="mt-4 w-full">
                        Validate Another
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="face" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Face Recognition Validation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-8">
                    <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">Advanced Validation Method</h3>
                    <p className="text-gray-600 mb-4">
                      Use face recognition to validate members automatically
                    </p>
                    <Button 
                      onClick={() => setValidationMethod("face")}
                      className="w-full max-w-md"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Start Face Recognition
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
