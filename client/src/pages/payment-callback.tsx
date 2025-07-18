import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PaymentCallback() {
  const [, params] = useRoute('/payment/callback');
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [paymentData, setPaymentData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get reference from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const reference = urlParams.get('reference');
        const trxref = urlParams.get('trxref');
        
        const paymentReference = reference || trxref;
        
        if (!paymentReference) {
          setStatus('failed');
          toast({
            title: "Payment Verification Failed",
            description: "No payment reference found",
            variant: "destructive",
          });
          return;
        }

        // Verify payment with backend
        const response = await apiRequest('POST', '/api/payment/verify', {
          reference: paymentReference
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStatus('success');
            setPaymentData(data.data);
            toast({
              title: "Payment Successful",
              description: "Your payment has been verified successfully",
            });
          } else {
            setStatus('failed');
            toast({
              title: "Payment Failed",
              description: data.message || "Payment verification failed",
              variant: "destructive",
            });
          }
        } else {
          setStatus('failed');
          toast({
            title: "Payment Verification Failed",
            description: "Could not verify payment",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        toast({
          title: "Verification Error",
          description: "An error occurred while verifying your payment",
          variant: "destructive",
        });
      }
    };

    verifyPayment();
  }, [toast]);

  const handleReturnToDashboard = () => {
    window.location.href = '/dashboard';
  };

  const handleReturnToEvents = () => {
    window.location.href = '/events';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              </div>
              <CardTitle>Verifying Payment</CardTitle>
              <CardDescription>
                Please wait while we verify your payment...
              </CardDescription>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <CardTitle className="text-green-700">Payment Successful!</CardTitle>
              <CardDescription>
                Your payment has been processed successfully
              </CardDescription>
            </>
          )}
          
          {status === 'failed' && (
            <>
              <div className="flex justify-center mb-4">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <CardTitle className="text-red-700">Payment Failed</CardTitle>
              <CardDescription>
                There was an issue processing your payment
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {status === 'success' && paymentData && (
            <div className="bg-green-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Amount:</span>
                <span>₦{(paymentData.amount / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Reference:</span>
                <span className="font-mono text-xs">{paymentData.reference}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Status:</span>
                <span className="capitalize text-green-600">{paymentData.status}</span>
              </div>
            </div>
          )}
          
          {status === 'failed' && (
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-700">
                Your payment could not be processed. Please try again or contact support if the issue persists.
              </p>
            </div>
          )}
          
          <div className="flex flex-col space-y-2">
            {status === 'success' && (
              <Button onClick={handleReturnToDashboard} className="w-full">
                Return to Dashboard
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleReturnToEvents}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {status === 'success' ? 'View All Events' : 'Back to Events'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}