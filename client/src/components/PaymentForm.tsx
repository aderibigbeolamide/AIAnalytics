import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CreditCard, Receipt, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PaymentFormProps {
  event: {
    id: number;
    name: string;
    paymentSettings?: {
      requiresPayment: boolean;
      amount?: string;
      currency?: string;
      paymentMethods: string[];
      paymentRules: {
        member: boolean;
        guest: boolean;
        invitee: boolean;
      };
      allowManualReceipt: boolean;
      paymentDescription?: string;
    };
  };
  registrationId: number;
  registrationType: 'member' | 'guest' | 'invitee';
  userEmail: string;
  onPaymentComplete?: (paymentData: any) => void;
}

export function PaymentForm({ 
  event, 
  registrationId, 
  registrationType, 
  userEmail, 
  onPaymentComplete 
}: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const paymentSettings = event.paymentSettings;
  
  // Check if payment is required for this registration type
  const paymentRequired = paymentSettings?.requiresPayment && paymentSettings?.paymentRules[registrationType];
  
  if (!paymentRequired) {
    return null;
  }

  const amount = paymentSettings?.amount || '0';
  const currency = paymentSettings?.currency || 'NGN';
  const availableMethods = paymentSettings?.paymentMethods || [];
  const allowManualReceipt = paymentSettings?.allowManualReceipt !== false;

  const handlePaystackPayment = async () => {
    setLoading(true);
    setPaymentStatus('processing');

    try {
      // Initialize payment
      const response = await apiRequest('POST', '/api/payment/initialize', {
        registrationId,
        amount: parseFloat(amount),
        email: userEmail
      });

      if (response.ok) {
        const data = await response.json();
        
        // Redirect to Paystack checkout
        if (data.success && data.data?.authorization_url) {
          window.location.href = data.data.authorization_url;
        } else {
          throw new Error(data.message || 'Payment initialization failed');
        }
      } else {
        throw new Error('Payment initialization failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : 'Payment initialization failed',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptUpload = async () => {
    if (!receiptFile) {
      toast({
        title: "No File Selected",
        description: "Please select a receipt file to upload",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('receipt', receiptFile);

      const response = await fetch(`/api/payment/upload-receipt/${registrationId}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setPaymentStatus('success');
        setUploadProgress(100);
        toast({
          title: "Receipt Uploaded",
          description: "Your payment receipt has been uploaded successfully. It will be reviewed by an administrator.",
        });
        
        onPaymentComplete?.({ method: 'manual_receipt', status: 'pending' });
      } else {
        throw new Error('Receipt upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setPaymentStatus('failed');
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'Receipt upload failed',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select a JPEG, PNG, or PDF file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setReceiptFile(file);
    }
  };

  if (paymentStatus === 'success') {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            <span className="font-medium">Payment Submitted Successfully</span>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Your payment has been processed. You should receive a confirmation shortly.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Payment Required</span>
        </CardTitle>
        <CardDescription>
          {paymentSettings?.paymentDescription || `Payment of ${currency} ${amount} is required for this event`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Amount: {currency} {amount}</strong>
            {paymentSettings?.paymentDescription && (
              <div className="mt-1">{paymentSettings.paymentDescription}</div>
            )}
          </AlertDescription>
        </Alert>

        <Tabs defaultValue={availableMethods.includes('paystack') ? 'paystack' : 'receipt'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            {availableMethods.includes('paystack') && (
              <TabsTrigger value="paystack">Pay Online</TabsTrigger>
            )}
            {allowManualReceipt && (
              <TabsTrigger value="receipt">Upload Receipt</TabsTrigger>
            )}
          </TabsList>

          {availableMethods.includes('paystack') && (
            <TabsContent value="paystack" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userEmail}
                    disabled
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    value={`${currency} ${amount}`}
                    disabled
                    className="mt-1"
                  />
                </div>

                <Button 
                  onClick={handlePaystackPayment}
                  disabled={loading || paymentStatus === 'processing'}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay {currency} {amount}
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Secure payment powered by Paystack
                </p>
              </div>
            </TabsContent>
          )}

          {allowManualReceipt && (
            <TabsContent value="receipt" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="receipt-upload">Upload Payment Receipt</Label>
                  <div className="mt-2">
                    <Input
                      id="receipt-upload"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepted formats: JPEG, PNG, PDF (max 5MB)
                  </p>
                </div>

                {receiptFile && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Receipt className="h-4 w-4" />
                      <span className="text-sm font-medium">{receiptFile.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Size: {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Please upload a clear image or PDF of your payment receipt. 
                    Your registration will be pending until the payment is verified by an administrator.
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={handleReceiptUpload}
                  disabled={!receiptFile || loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      Uploading... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Receipt
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}