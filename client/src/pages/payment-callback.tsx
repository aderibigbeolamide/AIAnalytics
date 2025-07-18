import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [paymentData, setPaymentData] = useState<any>(null);

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
      <Card className="w-full max-w-md">
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
            <div className="space-y-4">
              <p className="text-green-600 font-medium">
                Your payment has been processed successfully!
              </p>
              <div className="bg-green-50 p-4 rounded-lg text-left space-y-2">
                <p className="text-sm"><strong>Amount:</strong> ₦{paymentData?.amount ? (paymentData.amount / 100).toLocaleString() : 'N/A'}</p>
                <p className="text-sm"><strong>Reference:</strong> {paymentData?.reference}</p>
                <p className="text-sm"><strong>Status:</strong> {paymentData?.status}</p>
              </div>
              <p className="text-sm text-gray-600">
                Your registration is now complete. You will receive a confirmation email with your QR code shortly.
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