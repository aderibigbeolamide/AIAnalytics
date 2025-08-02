import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XCircle, RefreshCcw, Home, Mail } from "lucide-react";

export default function PaymentFailed() {
  const [, setLocation] = useLocation();
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  
  const error = searchParams.get('error');
  
  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'missing_reference':
        return 'Payment reference is missing. This might be a technical issue.';
      case 'verification_failed':
        return 'Payment verification failed. Your payment may not have been processed successfully.';
      case 'system_error':
        return 'A system error occurred while processing your payment.';
      default:
        return 'An unexpected error occurred during payment processing.';
    }
  };

  const getErrorTitle = (errorCode: string | null) => {
    switch (errorCode) {
      case 'missing_reference':
        return 'Missing Payment Reference';
      case 'verification_failed':
        return 'Payment Verification Failed';
      case 'system_error':
        return 'System Error';
      default:
        return 'Payment Failed';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Error Header */}
        <div className="text-center mb-8">
          <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Payment Failed
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            We couldn't process your payment at this time
          </p>
        </div>

        {/* Error Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              {getErrorTitle(error)}
            </CardTitle>
            <CardDescription>
              Details about what went wrong with your payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <AlertDescription className="text-red-800 dark:text-red-200">
                {getErrorMessage(error)}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* What to do next */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What happens next?</CardTitle>
            <CardDescription>
              Here are your options to resolve this issue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Immediate Actions:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>Check your internet connection and try again</li>
                <li>Verify your payment method has sufficient funds</li>
                <li>Ensure your card details are correct</li>
                <li>Try using a different payment method</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">If the problem persists:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>Contact your bank to ensure the transaction isn't blocked</li>
                <li>Wait a few minutes and try the payment again</li>
                <li>Contact our support team for assistance</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Button 
            onClick={() => window.history.back()} 
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Try Payment Again
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setLocation('/')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Back to Events
          </Button>
        </div>

        {/* Support Information */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Need Help?
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  If you continue to experience issues, please contact our support team with the following information:
                </p>
                <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>Error code: {error || 'unknown'}</li>
                  <li>Time of failed payment: {new Date().toLocaleString()}</li>
                  <li>Payment method used</li>
                  <li>Event or ticket you were trying to purchase</li>
                </ul>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">
                  Email: support@eventvalidate.com
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}