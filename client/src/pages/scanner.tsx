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
