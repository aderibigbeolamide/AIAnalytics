import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Download, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [qrImageBase64, setQrImageBase64] = useState<string>("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    const trxref = urlParams.get('trxref');
    
    const paymentReference = reference || trxref;
    
    if (paymentReference) {
      verifyPayment(paymentReference);
    } else {
      setStatus('failed');
      toast({
        title: "Payment Error",
        description: "No payment reference found",
        variant: "destructive",
      });
    }
  }, []);

  const verifyPayment = async (reference: string) => {
    try {
      const response = await fetch(`/api/payment/verify/${reference}`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.status === 'success') {
        setStatus('success');
        setPaymentData(data.data);
        setRegistrationData(data.data.registration);
        
        // If registration was completed with payment, get QR code
        if (data.data.registration) {
          fetchQRCode(data.data.registration.id);
        }
        
        toast({
          title: "Payment Successful",
          description: "Your registration has been completed!",
        });
      } else {
        setStatus('failed');
        toast({
          title: "Payment Failed",
          description: data.message || "Payment verification failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      setStatus('failed');
      toast({
        title: "Verification Error",
        description: "Failed to verify payment",
        variant: "destructive",
      });
    }
  };

  const fetchQRCode = async (registrationId: number) => {
    try {
      const response = await fetch(`/api/registrations/${registrationId}/qr`);
      if (response.ok) {
        const data = await response.json();
        setQrImageBase64(data.qrImageData);
      }
    } catch (error) {
      console.error("Failed to fetch QR code:", error);
    }
  };

  const downloadQRCode = () => {
    if (!qrImageBase64) return;
    
    const link = document.createElement('a');
    link.download = `event-registration-qr-${registrationData?.id || 'code'}.png`;
    link.href = qrImageBase64;
    link.click();
  };

  const handleContinue = () => {
    if (status === 'success') {
      // Redirect to events page or dashboard
      setLocation('/events');
    } else {
      // Go back to try again
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Verifying Payment
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="h-6 w-6 text-green-600" />
                Payment Successful
              </>
            )}
            {status === 'failed' && (
              <>
                <XCircle className="h-6 w-6 text-red-600" />
                Payment Failed
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <p className="text-gray-600">
              Please wait while we verify your payment...
            </p>
          )}
          
          {status === 'success' && (
            <div className="space-y-6">
              <p className="text-green-600 font-medium text-lg">
                Your payment has been processed successfully!
              </p>
              
              <div className="bg-green-50 p-4 rounded-lg text-left space-y-2">
                <p className="text-sm"><strong>Amount:</strong> ₦{paymentData?.amount ? (paymentData.amount / 100).toLocaleString() : 'N/A'}</p>
                <p className="text-sm"><strong>Reference:</strong> {paymentData?.reference}</p>
                <p className="text-sm"><strong>Status:</strong> {paymentData?.status}</p>
                {registrationData && (
                  <>
                    <p className="text-sm"><strong>Registration ID:</strong> {registrationData.uniqueId || registrationData.id}</p>
                    <p className="text-sm"><strong>Name:</strong> {registrationData.guestName}</p>
                  </>
                )}
              </div>

              {qrImageBase64 && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <QrCode className="h-5 w-5" />
                      <h3 className="font-semibold">Your Event QR Code</h3>
                    </div>
                    <div className="flex justify-center mb-4">
                      <img
                        src={qrImageBase64}
                        alt="Registration QR Code"
                        className="w-48 h-48 border rounded-lg"
                      />
                    </div>
                    <Button onClick={downloadQRCode} variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download QR Code
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Show this QR code at the event entrance for validation.
                  </p>
                </div>
              )}
              
              <p className="text-sm text-gray-600">
                Your registration is now complete. Save your QR code and bring it to the event.
              </p>
            </div>
          )}
          
          {status === 'failed' && (
            <div className="space-y-4">
              <p className="text-red-600">
                There was an issue processing your payment.
              </p>
              <p className="text-sm text-gray-600">
                Please try again or contact support if the problem persists.
              </p>
            </div>
          )}
          
          <Button onClick={handleContinue} className="w-full">
            {status === 'success' ? 'Continue to Events' : 'Try Again'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}