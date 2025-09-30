import { useState } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
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
  const [selectedEventId, setSelectedEventId] = useState<string>("1");
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
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-scanner-title">QR Code Scanner</h1>
          <p className="mt-2 text-gray-600">Validate event attendees using QR codes, manual ID, or face recognition</p>
        </div>

        <Tabs value={validationMethod} onValueChange={(v) => setValidationMethod(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="qr" data-testid="button-qr-tab">
              <QrCode className="w-4 h-4 mr-2" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="manual" data-testid="button-manual-tab">
              <User className="w-4 h-4 mr-2" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="face" data-testid="button-face-tab">
              <Camera className="w-4 h-4 mr-2" />
              Face Recognition
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr" data-testid="content-qr-scanner">
            <Card>
              <CardHeader>
                <CardTitle>Scan QR Code</CardTitle>
              </CardHeader>
              <CardContent>
                <QRScanner 
                  onScanSuccess={handleValidationSuccess}
                  eventId={selectedEventId}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" data-testid="content-manual-validation">
            <Card>
              <CardHeader>
                <CardTitle>Manual ID Validation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-id">Member ID or Registration ID</Label>
                  <Input
                    id="manual-id"
                    data-testid="input-manual-id"
                    placeholder="Enter member or registration ID"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualValidation()}
                  />
                </div>
                <Button 
                  onClick={handleManualValidation}
                  disabled={manualValidationMutation.isPending}
                  data-testid="button-validate-manual"
                >
                  {manualValidationMutation.isPending ? "Validating..." : "Validate ID"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="face" data-testid="content-face-recognition">
            <Card>
              <CardHeader>
                <CardTitle>Face Recognition Validation</CardTitle>
              </CardHeader>
              <CardContent>
                <FaceRecognitionValidator
                  eventId={selectedEventId}
                  onValidationSuccess={handleValidationSuccess}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {lastValidationResult && (
          <Card className="mt-6" data-testid="card-validation-result">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Validation Result</span>
                <Button variant="ghost" size="sm" onClick={resetValidation} data-testid="button-reset-validation">
                  Clear
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-4">
                {lastValidationResult.validationStatus === "valid" ? (
                  <CheckCircle className="w-12 h-12 text-green-500" />
                ) : (
                  <XCircle className="w-12 h-12 text-red-500" />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold" data-testid="text-validation-status">
                    {lastValidationResult.validationStatus === "valid" ? "Valid" : "Invalid"}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1" data-testid="text-validation-message">
                    {lastValidationResult.message}
                  </p>
                  {lastValidationResult.member && (
                    <div className="mt-4 space-y-2">
                      <p data-testid="text-member-name">
                        <strong>Name:</strong> {lastValidationResult.member.firstName} {lastValidationResult.member.lastName}
                      </p>
                      <p data-testid="text-member-email">
                        <strong>Email:</strong> {lastValidationResult.member.email}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
}
