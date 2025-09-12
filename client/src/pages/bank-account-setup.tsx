import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, CreditCard, Building2, AlertCircle, Loader2, ArrowLeft, Edit, DollarSign } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/lib/auth";

const bankAccountSchema = z.object({
  accountNumber: z.string().min(10, "Account number must be at least 10 digits").max(10, "Account number must be exactly 10 digits"),
  businessName: z.string().min(2, "Business name is required"),
  businessEmail: z.string().email("Valid email is required").or(z.literal("")).optional(),
  businessPhone: z.string().optional(),
  percentageCharge: z.number().min(0).max(20).default(2), // Default 2% platform fee
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

export default function BankAccountSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const [detectedBankInfo, setDetectedBankInfo] = useState<{ accountName: string; accountNumber: string; bankName: string; bankCode: string } | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasAttemptedDetection, setHasAttemptedDetection] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if current user is super admin
  const isSuperAdmin = user?.role === "super_admin";

  // Edit bank account mutation
  const editBankAccountMutation = useMutation({
    mutationFn: async (data: BankAccountFormData) => {
      // Only include percentageCharge if user is super admin
      const submitData = isSuperAdmin 
        ? { ...data }
        : { ...data, percentageCharge: undefined };
      const response = await apiRequest("PUT", "/api/users/bank-account", submitData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bank account updated successfully",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users/bank-account"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bank account",
        variant: "destructive",
      });
    },
  });

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      accountNumber: "",
      businessName: "",
      businessEmail: "",
      businessPhone: "",
      percentageCharge: 2,
    },
  });

  // OPay-style bank detection mutation using free NUBAN API
  const detectBankMutation = useMutation({
    mutationFn: async (accountNumber: string) => {
      console.log("Making OPay-style bank detection request");
      const response = await apiRequest("POST", "/api/banks/detect-opay-style", { accountNumber });
      const result = await response.json();
      console.log("OPay-style detection response:", result.success ? "success" : "failed");
      return result;
    },
    onSuccess: (data: any) => {
      console.log("Bank detection successful");
      
      if (data.success && data.accountName) {
        setDetectedBankInfo({
          accountName: data.accountName,
          accountNumber: data.accountNumber,
          bankName: data.bankName,
          bankCode: data.bankCode
        });
        setDetectionError(null);
        toast({
          title: "Bank Detected!",
          description: `${data.bankName} - ${data.accountName}`,
        });
      } else {
        console.error("Detection response missing required data");
        setDetectedBankInfo(null);
        setDetectionError(data.message || "Unable to detect bank for this account number");
        toast({
          title: "Detection Failed",
          description: data.message || "Could not detect bank for this account number",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Bank detection failed");
      const errorMessage = error.message || "Could not detect bank details";
      setDetectedBankInfo(null);
      setDetectionError(errorMessage);
      
      toast({
        title: "Detection Failed",
        description: "Unable to detect bank. Please verify your account number and try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      console.log("Bank detection mutation settled");
      setIsDetecting(false);
      setHasAttemptedDetection(true);
    }
  });

  // Function to perform OPay-style bank detection
  const performBankDetection = useCallback((accountNumber: string) => {
    console.log("Performing OPay-style bank detection for 10-digit account");
    setIsDetecting(true);
    detectBankMutation.mutate(accountNumber);
  }, [detectBankMutation]);

  // Watch account number for automatic detection
  const watchedAccountNumber = form.watch("accountNumber");

  // Debounced auto-detection when account number is 10 digits
  useEffect(() => {
    console.log("useEffect - Detection check:", {
      accountLength: watchedAccountNumber?.length,
      detectedBank: !!detectedBankInfo,
      isDetecting,
      isPending: detectBankMutation.isPending,
      hasAttempted: hasAttemptedDetection
    });
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Clear state when account number changes
    if (watchedAccountNumber !== detectedBankInfo?.accountNumber) {
      setDetectedBankInfo(null);
      setDetectionError(null);
      setHasAttemptedDetection(false);
    }

    // Auto-detect when we have a valid 10-digit account number
    if (watchedAccountNumber?.length === 10 && 
        !detectedBankInfo && 
        !isDetecting && 
        !detectBankMutation.isPending && 
        !hasAttemptedDetection) {
      
      console.log("✅ All conditions met - Starting debounced OPay-style detection for 10-digit account");
      
      // Add 800ms debounce to prevent rapid API calls
      debounceTimeoutRef.current = setTimeout(() => {
        performBankDetection(watchedAccountNumber);
      }, 800);
    }
  }, [watchedAccountNumber, detectedBankInfo, isDetecting, detectBankMutation.isPending, hasAttemptedDetection, performBankDetection]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Fetch existing bank account details
  const { data: existingAccount, isLoading: accountLoading } = useQuery({
    queryKey: ["/api/users/bank-account"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users/bank-account");
      return await response.json();
    },
  });

  // Fetch user's own events to filter payments
  const { data: userEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/events");
      return await response.json();
    },
    enabled: !!((existingAccount as any)?.bankAccount?.paystackSubaccountCode),
  });

  // Fetch payment transactions only for user's own events
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/payments/my-events"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/payments/my-events");
      return await response.json();
    },
    enabled: !!((existingAccount as any)?.bankAccount?.paystackSubaccountCode),
  });

  // Update setup bank account mutation to include detected bank info
  const updatedSetupAccountMutation = useMutation({
    mutationFn: async (data: BankAccountFormData) => {
      // Include detected bank information if available
      const formData = {
        ...data,
        bankCode: detectedBankInfo?.bankCode,
        accountName: detectedBankInfo?.accountName
      };
      
      // Only include percentageCharge if user is super admin
      const submitData = isSuperAdmin 
        ? formData
        : { ...formData, percentageCharge: undefined };
      
      const response = await apiRequest("POST", "/api/users/setup-bank-account", submitData);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Bank Account Setup Complete",
        description: `Your account is now ready to receive payments from your events`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/bank-account"] });
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed", 
        description: error.message || "Failed to setup bank account",
        variant: "destructive",
      });
    },
  });

  // OPay-style form submission handler
  const onSubmit = (data: BankAccountFormData) => {
    if (!detectedBankInfo) {
      toast({
        title: "Bank Detection Required",
        description: "Please enter your 10-digit account number to detect your bank.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Submitting OPay-style bank account setup form");
    updatedSetupAccountMutation.mutate(data);
  };

  // Constants for the simplified OPay workflow
  const hasExistingAccount = (existingAccount as any)?.bankAccount && (existingAccount as any)?.bankAccount?.accountNumber;

  if (accountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Management</h1>
          <p className="text-gray-600">
            Manage your bank account and track payments from your events
          </p>
        </div>

        <Tabs defaultValue="bank-account" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bank-account" data-testid="tab-bank-account">Bank Account</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="bank-account" className="space-y-6 mt-6">
            {hasExistingAccount ? (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Bank Account Connected
                    </div>
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditing(true);
                          // Pre-populate form with existing data
                          const bankAccount = (existingAccount as any)?.bankAccount;
                          form.reset({
                            accountNumber: bankAccount?.accountNumber || '',
                            businessName: bankAccount?.businessName || '',
                            businessEmail: bankAccount?.businessEmail || '',
                            businessPhone: bankAccount?.businessPhone || '',
                            percentageCharge: bankAccount?.percentageCharge || 2,
                          });
                        }}
                        data-testid="button-edit"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isEditing ? "Update your bank account details. Your information remains private and secure." : "Your bank account is setup and ready to receive payments. 🔒 Private and secure - only you can see these details."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit((data) => editBankAccountMutation.mutate(data))} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Bank</Label>
                          <div className="text-sm text-gray-600">
                            {(existingAccount as any)?.bankAccount?.bankName}
                          </div>
                        </div>

                        <FormField
                          control={form.control}
                          name="accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Number</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="1234567890" data-testid="input-account-number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="businessName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Your business name" data-testid="input-business-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="businessEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Email (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" placeholder="business@example.com" data-testid="input-business-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="businessPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Phone (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="+234 xxx xxx xxxx" data-testid="input-business-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {isSuperAdmin && (
                          <FormField
                            control={form.control}
                            name="percentageCharge"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Platform Fee (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    min="0"
                                    max="20"
                                    step="0.1"
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    data-testid="input-percentage-charge"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            disabled={editBankAccountMutation.isPending}
                            className="flex-1"
                            data-testid="button-update-account"
                          >
                            {editBankAccountMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              "Update Account"
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                            disabled={editBankAccountMutation.isPending}
                            data-testid="button-cancel-edit"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <div className="space-y-2" data-testid="existing-account-details">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Bank Name:</span>
                        <span className="font-medium" data-testid="text-bank-name">{(existingAccount as any)?.bankAccount?.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Account Number:</span>
                        <span className="font-medium" data-testid="text-account-number">{(existingAccount as any)?.bankAccount?.accountNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Account Name:</span>
                        <span className="font-medium" data-testid="text-account-name">{(existingAccount as any)?.bankAccount?.accountName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Business Name:</span>
                        <span className="font-medium" data-testid="text-business-name">{(existingAccount as any)?.bankAccount?.businessName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Platform Fee:</span>
                        <span className="font-medium" data-testid="text-platform-fee">{(existingAccount as any)?.bankAccount?.percentageCharge}%</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Setup Your Bank Account
                  </CardTitle>
                  <CardDescription>
                    Connect your bank account to receive payments from ticket sales and registrations.
                    <br />
                    🔒 <strong>Privacy Protected:</strong> Your bank details are private and only visible to you. Platform admins can only see the 2% platform fee deducted from transactions, never your full revenue amounts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-6">
                    <Building2 className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Multi-Tenant Payment System:</strong> When users pay for your events, 
                      the money goes directly to your bank account. This ensures complete payment separation 
                      between different event organizers on the platform.
                    </AlertDescription>
                  </Alert>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* OPay-style Account Number Input with Auto-Detection */}
                      <FormField
                        control={form.control}
                        name="accountNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Number</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  placeholder="Enter your 10-digit account number"
                                  className={`pr-10 ${detectedBankInfo ? 'border-green-500' : ''}`}
                                  maxLength={10}
                                  data-testid="input-account-number"
                                />
                                {isDetecting && (
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                                  </div>
                                )}
                                {detectedBankInfo && (
                                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-500 mt-1">
                              We'll automatically detect your bank when you enter a valid 10-digit account number
                            </p>
                          </FormItem>
                        )}
                      />

                      {/* Display Detected Bank Info */}
                      {detectedBankInfo && (
                        <Alert data-testid="detected-bank-info">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-700">
                            <div className="space-y-1">
                              <div><span className="font-medium">Bank:</span> <span data-testid="detected-bank-name">{detectedBankInfo.bankName}</span></div>
                              <div><span className="font-medium">Account Name:</span> <span className="text-green-700 font-semibold" data-testid="detected-account-name">{detectedBankInfo.accountName}</span></div>
                              <div><span className="font-medium">Account Number:</span> <span data-testid="detected-account-number">{detectedBankInfo.accountNumber}</span></div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Display Detection Error */}
                      {detectionError && hasAttemptedDetection && (
                        <Alert variant="destructive" data-testid="detection-error">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {detectionError}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Business Information Fields */}
                      <FormField
                        control={form.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Your business or organization name" data-testid="input-business-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Email (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="business@example.com" data-testid="input-business-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="+234 xxx xxx xxxx" data-testid="input-business-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {isSuperAdmin && (
                        <FormField
                          control={form.control}
                          name="percentageCharge"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Platform Fee (%)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  max="20"
                                  step="0.1"
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  data-testid="input-percentage-charge"
                                />
                              </FormControl>
                              <FormMessage />
                              <div className="bg-blue-50 p-4 rounded-md mt-2">
                                <h5 className="font-medium text-blue-800 mb-2">Platform Revenue Model:</h5>
                                <ul className="text-blue-700 text-sm space-y-1">
                                  <li>• You earn {form.watch("percentageCharge") || 2}% from every successful payment</li>
                                  <li>• Event organizers keep {100 - (form.watch("percentageCharge") || 2)}% of their event revenue</li>
                                  <li>• Fees are automatically deducted during payment processing</li>
                                  <li>• Platform fees go to your designated platform account</li>
                                </ul>
                              </div>
                            </FormItem>
                          )}
                        />
                      )}

                      <Button
                        type="submit"
                        disabled={updatedSetupAccountMutation.isPending || !detectedBankInfo}
                        className="w-full"
                        data-testid="button-setup-account"
                      >
                        {updatedSetupAccountMutation.isPending ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                            Setting up account...
                          </>
                        ) : (
                          "Setup Bank Account"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Bank Information Panel */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Auto Bank Detection
                </CardTitle>
                <CardDescription>
                  We automatically detect your bank when you enter a valid Nigerian bank account number
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>How it works:</strong>
                    <ol className="mt-2 space-y-1 text-sm">
                      <li>1. Enter your 10-digit account number</li>
                      <li>2. We automatically detect your bank and verify your account name</li>
                      <li>3. Fill in your business details</li>
                      <li>4. Start receiving payments directly to your account</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Why Setup a Bank Account?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Direct Payments</h4>
                    <p className="text-sm text-gray-600">
                      Receive payments directly from ticket sales and event registrations
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Financial Separation</h4>
                    <p className="text-sm text-gray-600">
                      Your money stays separate from other organizations using the platform
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Instant Settlement</h4>
                    <p className="text-sm text-gray-600">
                      Funds are settled to your account automatically after successful payments
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment History
                </CardTitle>
                <CardDescription>
                  Track payments received from your events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="flex items-center justify-center py-8" data-testid="payments-loading">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : !hasExistingAccount ? (
                  <div className="text-center py-8" data-testid="no-bank-account">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Set up your bank account first to start receiving payments</p>
                    <Button onClick={() => {
                      const bankAccountTab = document.querySelector('[value="bank-account"]') as HTMLElement;
                      bankAccountTab?.click();
                    }} data-testid="button-setup-bank-account">
                      Setup Bank Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(!paymentsData?.payments || paymentsData.payments.length === 0) ? (
                      <div className="text-center py-8" data-testid="no-payments">
                        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No payments received yet</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Payments will appear here when users pay for your events
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3" data-testid="payments-list">
                        {paymentsData.payments.map((payment: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4" data-testid={`payment-item-${index}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium" data-testid={`payment-event-${index}`}>{payment.eventName || 'Event Payment'}</h4>
                                <p className="text-sm text-gray-600" data-testid={`payment-guest-${index}`}>
                                  {payment.registrationData?.guestName || 'Anonymous'}
                                </p>
                                <p className="text-xs text-gray-500" data-testid={`payment-reference-${index}`}>
                                  Ref: {payment.reference}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600" data-testid={`payment-amount-${index}`}>
                                  ₦{(payment.amount / 100).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500" data-testid={`payment-date-${index}`}>
                                  {new Date(payment.createdAt).toLocaleDateString()}
                                </p>
                                <Badge variant={payment.status === 'success' ? 'default' : 'secondary'} data-testid={`payment-status-${index}`}>
                                  {payment.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}