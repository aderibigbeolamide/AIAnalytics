import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, CreditCard, Building2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const bankAccountSchema = z.object({
  bankCode: z.string().min(1, "Please select a bank"),
  accountNumber: z.string().min(10, "Account number must be at least 10 digits"),
  businessName: z.string().min(2, "Business name is required"),
  businessEmail: z.string().email("Valid email is required").optional(),
  businessPhone: z.string().optional(),
  percentageCharge: z.number().min(0).max(20).default(0),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

interface Bank {
  id: number;
  name: string;
  code: string;
}

export default function BankAccountSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [verifiedAccount, setVerifiedAccount] = useState<{ accountName: string; accountNumber: string; bankName: string; bankCode: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bankCode: "",
      accountNumber: "",
      businessName: "",
      businessEmail: "",
      businessPhone: "",
      percentageCharge: 0,
    },
  });

  // Fetch banks list
  const { data: banksResponse, isLoading: banksLoading } = useQuery({
    queryKey: ["/api/banks"],
    queryFn: () => apiRequest("GET", "/api/banks"),
  });

  // Fetch existing bank account details
  const { data: existingAccount, isLoading: accountLoading } = useQuery({
    queryKey: ["/api/users/bank-account"],
    queryFn: () => apiRequest("GET", "/api/users/bank-account"),
  });

  // Smart bank verification mutation
  const smartVerifyAccountMutation = useMutation({
    mutationFn: (data: { accountNumber: string; bankCode: string }) =>
      apiRequest("POST", "/api/banks/smart-verify", data),
    onSuccess: (data: any) => {
      setVerifiedAccount({
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        bankCode: data.bankCode,
      });
      toast({
        title: "Account Verified",
        description: `${data.bankName} - ${data.accountName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Could not verify this account number with the selected bank",
        variant: "destructive",
      });
      setVerifiedAccount(null);
    },
  });

  // Setup bank account mutation
  const setupAccountMutation = useMutation({
    mutationFn: (data: BankAccountFormData) =>
      apiRequest("POST", "/api/users/setup-bank-account", data),
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

  // Watch form fields for verification
  const watchedAccountNumber = form.watch("accountNumber");
  const watchedBankCode = form.watch("bankCode");
  
  // Smart verification when both account number and bank are selected
  useEffect(() => {
    console.log("Form fields changed:", { accountNumber: watchedAccountNumber, bankCode: watchedBankCode, isVerifying });
    
    if (watchedAccountNumber && watchedAccountNumber.length === 10 && watchedBankCode && !isVerifying) {
      console.log("Triggering smart verification");
      setVerifiedAccount(null);
      setIsVerifying(true);
      
      smartVerifyAccountMutation.mutate(
        { accountNumber: watchedAccountNumber, bankCode: watchedBankCode },
        {
          onSettled: () => {
            console.log("Smart verification completed");
            setIsVerifying(false);
          },
        }
      );
    } else if (watchedAccountNumber && watchedAccountNumber.length < 10) {
      // Clear verification if account number becomes invalid
      setVerifiedAccount(null);
    }
  }, [watchedAccountNumber, watchedBankCode, isVerifying, smartVerifyAccountMutation]);

  const onSubmit = (data: BankAccountFormData) => {
    if (!verifiedAccount && data.accountNumber && data.bankCode) {
      // Try to verify one more time before submission
      setIsVerifying(true);
      smartVerifyAccountMutation.mutate(
        { accountNumber: data.accountNumber, bankCode: data.bankCode },
        {
          onSuccess: () => {
            // Verification succeeded, proceed with setup
            setupAccountMutation.mutate(data);
          },
          onError: () => {
            // Allow submission even without verification for manual verification
            toast({
              title: "Account Setup",
              description: "Proceeding with manual verification. Account details will be verified during first payment.",
            });
            setupAccountMutation.mutate(data);
          },
          onSettled: () => setIsVerifying(false),
        }
      );
      return;
    }
    
    setupAccountMutation.mutate(data);
  };

  const banks = (banksResponse as any)?.banks || [];
  const hasExistingAccount = (existingAccount as any)?.bankAccount?.paystackSubaccountCode;

  if (accountLoading || banksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bank Account Setup</h1>
          <p className="text-gray-600">
            Setup your bank account to receive payments directly from your events
          </p>
        </div>

        {hasExistingAccount ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Bank Account Connected
              </CardTitle>
              <CardDescription>
                Your bank account is setup and ready to receive payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Bank Name:</span>
                  <span className="font-medium">{(existingAccount as any)?.bankAccount?.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Account Number:</span>
                  <span className="font-medium">{(existingAccount as any)?.bankAccount?.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Account Name:</span>
                  <span className="font-medium">{(existingAccount as any)?.bankAccount?.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Business Name:</span>
                  <span className="font-medium">{(existingAccount as any)?.bankAccount?.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Platform Fee:</span>
                  <span className="font-medium">{(existingAccount as any)?.bankAccount?.percentageCharge}%</span>
                </div>
              </div>
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
                Connect your bank account to receive payments from ticket sales and registrations
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
                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your real 10-digit bank account number"
                            maxLength={10}
                            type="tel"
                          />
                        </FormControl>
                        <FormMessage />
                        {isVerifying && (
                          <p className="text-sm text-blue-600 flex items-center gap-2">
                            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                            Verifying account with selected bank...
                          </p>
                        )}
                        {verifiedAccount && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                            <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
                              <CheckCircle className="w-4 h-4" />
                              Account Verified
                            </div>
                            <div className="text-sm space-y-1">
                              <div><span className="font-medium">Bank:</span> {verifiedAccount.bankName}</div>
                              <div><span className="font-medium">Account Name:</span> {verifiedAccount.accountName}</div>
                            </div>
                          </div>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bankCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank {verifiedAccount && "(Auto-detected)"}</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!!verifiedAccount}
                          >
                            <SelectTrigger className={verifiedAccount ? "bg-gray-50" : ""}>
                              <SelectValue placeholder={verifiedAccount ? verifiedAccount.bankName : "Bank will be auto-detected"} />
                            </SelectTrigger>
                            <SelectContent>
                              {banks.map((bank: Bank) => (
                                <SelectItem key={bank.code} value={bank.code}>
                                  {bank.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                        {!verifiedAccount && watchedAccountNumber && watchedAccountNumber.length === 10 && watchedBankCode && (
                          <div className="text-xs">
                            <p className="text-amber-600">⚠️ Automatic verification failed. You can still proceed - your account will be verified during the first payment.</p>
                          </div>
                        )}
                        {!verifiedAccount && (!watchedAccountNumber || watchedAccountNumber.length < 10 || !watchedBankCode) && (
                          <div className="text-xs text-gray-500">
                            <p>Enter account number first, then select your bank for automatic verification</p>
                            <p className="mt-1 text-amber-600">💡 Make sure to use a real bank account number for verification</p>
                          </div>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business/Organization Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your business or organization name"
                          />
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
                          <Input
                            {...field}
                            type="email"
                            placeholder="business@example.com"
                          />
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
                          <Input
                            {...field}
                            placeholder="+234 xxx xxx xxxx"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">How Multi-Tenant Payments Work:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Each event organizer receives payments directly to their own bank account</li>
                      <li>• No mixing of funds between different organizations</li>
                      <li>• Instant settlement to your account after successful payments</li>
                      <li>• Complete financial separation for multi-tenant usage</li>
                      <li>• Platform fee: 0% (Currently free for all users)</li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    disabled={setupAccountMutation.isPending || !verifiedAccount}
                    className="w-full"
                  >
                    {setupAccountMutation.isPending ? (
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
      </div>
    </div>
  );
}