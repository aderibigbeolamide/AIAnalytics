import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Mail, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'already_verified'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const tokenParam = urlParams.get('token');

    if (!emailParam || !tokenParam) {
      setVerificationStatus('error');
      setMessage('Invalid verification link. Please check your email and try again.');
      return;
    }

    setEmail(emailParam);
    setToken(tokenParam);

    // Verify email
    verifyEmail(emailParam, tokenParam);
  }, []);

  const verifyEmail = async (email: string, token: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVerificationStatus('success');
        setMessage('Your email has been verified successfully! You can now proceed to login.');
      } else if (response.status === 400 && data.message.includes('already verified')) {
        setVerificationStatus('already_verified');
        setMessage('Your email is already verified. You can proceed to login.');
      } else {
        setVerificationStatus('error');
        setMessage(data.message || 'Email verification failed. The link may be expired or invalid.');
      }
    } catch (error) {
      setVerificationStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  const resendVerification = async () => {
    if (!email) return;

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('A new verification email has been sent. Please check your inbox.');
      } else {
        setMessage(data.message || 'Failed to resend verification email.');
      }
    } catch (error) {
      setMessage('Network error. Please try again later.');
    }
  };

  const handleGoToLogin = () => {
    setLocation('/organization-login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            {verificationStatus === 'loading' && (
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            )}
            {verificationStatus === 'success' && (
              <CheckCircle className="h-8 w-8 text-green-600" />
            )}
            {verificationStatus === 'already_verified' && (
              <CheckCircle className="h-8 w-8 text-blue-600" />
            )}
            {verificationStatus === 'error' && (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
          </div>
          
          <CardTitle className="text-2xl text-gray-900">
            {verificationStatus === 'loading' && 'Verifying Your Email'}
            {verificationStatus === 'success' && 'Email Verified!'}
            {verificationStatus === 'already_verified' && 'Already Verified'}
            {verificationStatus === 'error' && 'Verification Failed'}
          </CardTitle>
          
          <CardDescription className="text-gray-600">
            {verificationStatus === 'loading' && 'Please wait while we verify your email address...'}
            {verificationStatus === 'success' && 'Your email has been successfully verified'}
            {verificationStatus === 'already_verified' && 'Your email is already verified'}
            {verificationStatus === 'error' && 'There was an issue verifying your email'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert className={`${
            verificationStatus === 'success' || verificationStatus === 'already_verified' 
              ? 'border-green-200 bg-green-50' 
              : verificationStatus === 'error' 
              ? 'border-red-200 bg-red-50' 
              : 'border-blue-200 bg-blue-50'
          }`}>
            <AlertDescription className={`${
              verificationStatus === 'success' || verificationStatus === 'already_verified' 
                ? 'text-green-800' 
                : verificationStatus === 'error' 
                ? 'text-red-800' 
                : 'text-blue-800'
            }`}>
              {message}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {(verificationStatus === 'success' || verificationStatus === 'already_verified') && (
              <Button 
                onClick={handleGoToLogin}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="button-go-to-login"
              >
                Continue to Login
              </Button>
            )}

            {verificationStatus === 'error' && (
              <>
                <Button 
                  onClick={resendVerification}
                  variant="outline" 
                  className="w-full"
                  data-testid="button-resend-verification"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </Button>
                <Button 
                  onClick={handleGoToLogin}
                  variant="ghost" 
                  className="w-full"
                  data-testid="button-back-to-login"
                >
                  Back to Login
                </Button>
              </>
            )}
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>Having trouble? Contact support at <br />
            <a href="mailto:admin@eventifyai.com" className="text-blue-600 hover:underline">
              admin@eventifyai.com
            </a></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}