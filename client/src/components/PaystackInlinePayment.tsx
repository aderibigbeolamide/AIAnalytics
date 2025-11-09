import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PaystackInlinePaymentProps {
  amount: number;
  email: string;
  currency?: string;
  description?: string;
  registrationId?: number;
  ticketId?: number;
  paymentType: 'registration' | 'ticket';
  onSuccess?: (reference: string) => void;
  onTimeout?: () => void;
  timeoutMinutes?: number;
}

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

export function PaystackInlinePayment({
  amount,
  email,
  currency = 'NGN',
  description,
  registrationId,
  ticketId,
  paymentType,
  onSuccess,
  onTimeout,
  timeoutMinutes = 20,
}: PaystackInlinePaymentProps) {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'initiated' | 'processing' | 'success' | 'failed' | 'timeout'>('idle');
  const [timeRemaining, setTimeRemaining] = useState(timeoutMinutes * 60);
  const [paymentReference, setPaymentReference] = useState<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const paymentCreatedAtRef = useRef<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (paymentStatus === 'initiated' || paymentStatus === 'processing') {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [paymentStatus]);

  const handleTimeout = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setPaymentStatus('timeout');
    toast({
      title: "Payment Timeout",
      description: "Your payment session has expired. Please try again.",
      variant: "destructive",
    });
    
    onTimeout?.();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePayment = async () => {
    if (!window.PaystackPop) {
      toast({
        title: "Payment Error",
        description: "Payment system is not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setPaymentStatus('initiated');

    try {
      const endpoint = paymentType === 'registration' 
        ? '/api/payment/initialize-registration'
        : '/api/payment/initialize-ticket';

      const requestBody = paymentType === 'registration'
        ? { registrationId, amount, email }
        : { ticketId, amount, email };

      const response = await apiRequest('POST', endpoint, requestBody);

      if (!response.ok) {
        throw new Error('Payment initialization failed');
      }

      const data = await response.json();

      if (!data.success || !data.data?.reference) {
        throw new Error(data.message || 'Invalid payment response');
      }

      const reference = data.data.reference;
      setPaymentReference(reference);
      paymentCreatedAtRef.current = new Date();
      setPaymentStatus('processing');

      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || data.data.public_key,
        email: email,
        amount: amount * 100,
        ref: reference,
        currency: currency,
        metadata: {
          custom_fields: [
            {
              display_name: description || `Payment for ${paymentType}`,
              variable_name: 'description',
              value: description || `Payment for ${paymentType}`
            }
          ]
        },
        onClose: function() {
          if (paymentStatus !== 'success') {
            toast({
              title: "Payment Cancelled",
              description: "You closed the payment window. Your session will expire in " + formatTime(timeRemaining),
              variant: "default",
            });
          }
        },
        callback: async function(response: any) {
          if (response.status === 'success') {
            await verifyPayment(response.reference);
          } else {
            setPaymentStatus('failed');
            toast({
              title: "Payment Failed",
              description: "Payment was not successful. Please try again.",
              variant: "destructive",
            });
          }
        }
      });

      handler.openIframe();
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      toast({
        title: "Payment Initialization Failed",
        description: error instanceof Error ? error.message : 'Failed to initialize payment',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (reference: string) => {
    try {
      const endpoint = paymentType === 'registration'
        ? '/api/payment/verify'
        : '/api/payment/verify-ticket';

      const requestBody = paymentType === 'registration'
        ? { reference, registrationId }
        : { reference, ticketId };

      const response = await apiRequest('POST', endpoint, requestBody);

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      const data = await response.json();

      if (data.status === 'success' || data.success) {
        setPaymentStatus('success');
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        toast({
          title: "Payment Successful",
          description: "Your payment has been verified successfully!",
        });
        onSuccess?.(reference);
      } else {
        throw new Error(data.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setPaymentStatus('failed');
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : 'Failed to verify payment',
        variant: "destructive",
      });
    }
  };

  if (paymentStatus === 'success') {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            <span className="font-medium">Payment Successful</span>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Your payment has been verified and processed successfully.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (paymentStatus === 'timeout') {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <span className="font-medium">Payment Session Expired</span>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Your payment session has expired after {timeoutMinutes} minutes of inactivity.
            Please initiate a new payment.
          </p>
          <Button 
            onClick={() => window.location.reload()}
            className="w-full mt-4"
            variant="outline"
          >
            Start New Payment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Secure Payment</span>
        </CardTitle>
        <CardDescription>
          {description || `Complete your payment of ${currency} ${amount.toLocaleString()}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(paymentStatus === 'initiated' || paymentStatus === 'processing') && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>Time remaining:</span>
                <span className="font-mono font-bold text-lg" data-testid="text-timer">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Complete your payment within {timeoutMinutes} minutes or the session will expire
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="mt-1"
              data-testid="input-email"
            />
          </div>
          
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              value={`${currency} ${amount.toLocaleString()}`}
              disabled
              className="mt-1"
              data-testid="input-amount"
            />
          </div>

          {paymentStatus === 'processing' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Payment window is open. Complete your transaction in the Paystack popup.
                If you closed the popup, click "Pay Now" again.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handlePayment}
            disabled={loading || paymentStatus === 'processing' || paymentStatus === 'timeout'}
            className="w-full"
            size="lg"
            data-testid="button-pay"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                Initializing...
              </>
            ) : paymentStatus === 'processing' ? (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Resume Payment
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pay {currency} {amount.toLocaleString()}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Secure payment powered by Paystack. Session expires in {timeoutMinutes} minutes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
