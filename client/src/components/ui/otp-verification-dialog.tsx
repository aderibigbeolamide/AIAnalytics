import { useState, useEffect } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";
import { Alert, AlertDescription } from "./alert";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";

interface OTPVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onVerificationSuccess: () => void;
}

export function OTPVerificationDialog({ 
  isOpen, 
  onClose, 
  email, 
  onVerificationSuccess 
}: OTPVerificationDialogProps) {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setOtp("");
      setError("");
      setSuccess(false);
      checkOTPStatus();
    }
  }, [isOpen, email]);

  // Timer for remaining time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeRemaining]);

  const checkOTPStatus = async () => {
    try {
      const response = await fetch(`/api/otp/status/${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (data.success && data.hasValidOTP) {
        setTimeRemaining(data.remainingTime);
      }
    } catch (error) {
      console.error("Error checking OTP status:", error);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: otp,
        }),
      });

      const data = await response.json();

      if (data.success && data.verified) {
        setSuccess(true);
        setTimeout(() => {
          onVerificationSuccess();
          onClose();
        }, 1500);
      } else {
        setError(data.message || "Invalid verification code");
      }
    } catch (error) {
      setError("Failed to verify code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        checkOTPStatus();
        setError("");
      } else {
        setError(data.message || "Failed to resend code");
      }
    } catch (error) {
      setError("Failed to resend verification code");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Clock className="w-5 h-5 text-blue-600" />
            )}
            {success ? "Email Verified!" : "Verify Your Email"}
          </DialogTitle>
          <DialogDescription>
            {success 
              ? "Your email has been successfully verified."
              : `Enter the 6-digit verification code sent to ${email}`
            }
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-green-600 font-medium">Verification Successful!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="otp" className="text-sm font-medium">
                Verification Code
              </label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                  setError("");
                }}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                autoComplete="one-time-code"
              />
            </div>

            {timeRemaining > 0 && (
              <div className="text-center text-sm text-muted-foreground">
                Code expires in {formatTime(timeRemaining)}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleVerifyOTP}
                disabled={isVerifying || otp.length !== 6}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleResendOTP}
                disabled={timeRemaining > 0}
                className="w-full"
              >
                {timeRemaining > 0 
                  ? `Resend Code (${formatTime(timeRemaining)})` 
                  : "Resend Code"
                }
              </Button>
            </div>

            <div className="text-xs text-center text-muted-foreground">
              Didn't receive the code? Check your spam folder or try resending.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}