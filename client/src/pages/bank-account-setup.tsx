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
  const [verifiedAccount, setVerifiedAccount] = useState<{ accountName: string; accountNumber: string } | null>(null);
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

  // Verify bank account mutation
  const verifyAccountMutation = useMutation({
    mutationFn: (data: { accountNumber: string; bankCode: string }) =>
      apiRequest("POST", "/api/banks/verify", data),
    onSuccess: (data) => {
      setVerifiedAccount({
        accountName: data.accountName,
        accountNumber: data.accountNumber,
      });
      toast({
        title: "Account Verified",
        description: `Account belongs to ${data.accountName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Could not verify bank account",
        variant: "destructive",
      });
      setVerifiedAccount(null);
    },
  });

  // Setup bank account mutation
  const setupAccountMutation = useMutation({
    mutationFn: (data: BankAccountFormData) =>
      apiRequest("POST", "/api/users/setup-bank-account", data),
    onSuccess: (data) => {
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

  // Auto-verify when bank and account number are filled
  useEffect(() => {
    const bankCode = form.watch("bankCode");
    const accountNumber = form.watch("accountNumber");

    if (bankCode && accountNumber && accountNumber.length >= 10 && !isVerifying) {
      setIsVerifying(true);
      verifyAccountMutation.mutate(
        { bankCode, accountNumber },
        {
          onSettled: () => setIsVerifying(false),
        }
      );
    }
  }, [form.watch("bankCode"), form.watch("accountNumber")]);

  const onSubmit = (data: BankAccountFormData) => {
    if (!verifiedAccount) {
      toast({
        title: "Account Not Verified",
        description: "Please verify your bank account first",
        variant: "destructive",
      });
      return;
    }
    setupAccountMutation.mutate(data);
  };

  const banks = banksResponse?.banks || [];
  const hasExistingAccount = existingAccount?.bankAccount?.paystackSubaccountCode;

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
                  <span className="font-medium">{existingAccount.bankAccount.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Account Number:</span>
                  <span className="font-medium">{existingAccount.bankAccount.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Account Name:</span>
                  <span className="font-medium">{existingAccount.bankAccount.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Business Name:</span>
                  <span className="font-medium">{existingAccount.bankAccount.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Platform Fee:</span>
                  <span className="font-medium">{existingAccount.bankAccount.percentageCharge}%</span>
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
                    name="bankCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your bank" />
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
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your account number"
                            maxLength={10}
                          />
                        </FormControl>
                        <FormMessage />
                        {isVerifying && (
                          <p className="text-sm text-blue-600">Verifying account...</p>
                        )}
                        {verifiedAccount && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            Verified: {verifiedAccount.accountName}
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