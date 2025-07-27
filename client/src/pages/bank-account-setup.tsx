import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, CreditCard, Building2, AlertCircle, Search, Loader2, ArrowLeft, Edit, DollarSign } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const bankAccountSchema = z.object({
  bankCode: z.string().min(1, "Please select a bank"),
  accountNumber: z.string().min(10, "Account number must be at least 10 digits"),
  businessName: z.string().min(2, "Business name is required"),
  businessEmail: z.string().email("Valid email is required").or(z.literal("")).optional(),
  businessPhone: z.string().optional(),
  percentageCharge: z.number().min(0).max(20).default(2), // Default 2% platform fee
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

interface Bank {
  id: number;
  name: string;
  code: string;
  type?: string;
}

export default function BankAccountSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [verifiedAccount, setVerifiedAccount] = useState<{ accountName: string; accountNumber: string; bankName: string; bankCode: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [bankSearchTerm] = useState("");
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit bank account mutation
  const editBankAccountMutation = useMutation({
    mutationFn: async (data: BankAccountFormData) => {
      const response = await apiRequest("PUT", "/api/users/bank-account", data);
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
      bankCode: "",
      accountNumber: "",
      businessName: "",
      businessEmail: "",
      businessPhone: "",
      percentageCharge: 2,
    },
  });

  // Fetch banks list with comprehensive data
  const { data: banksResponse, isLoading: banksLoading, error: banksError } = useQuery({
    queryKey: ["/api/banks"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/banks");
      return await response.json();
    },
  });
  


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

  // Manual bank verification mutation
  const verifyBankAccountMutation = useMutation({
    mutationFn: async (data: { accountNumber: string; bankCode: string }) => {
      try {
        console.log("Making verification request with:", data);
        const response = await apiRequest("POST", "/api/banks/verify", data);
        const result = await response.json();
        console.log("Verification API response:", result);
        return result;
      } catch (error) {
        console.error("Verification API error:", error);
        throw error;
      }
    },
    onSuccess: (data: any) => {
      const bankValue = form.getValues("bankCode");
      const [bankCode, bankName, bankId] = bankValue.split('|');
      console.log("Account verification successful:", data);
      
      if (data.success && data.accountName) {
        setVerifiedAccount({
          accountName: data.accountName,
          accountNumber: data.accountNumber,
          bankName: bankName || "Unknown Bank",
          bankCode: bankCode,
        });
        toast({
          title: "Account Verified",
          description: `${bankName} - ${data.accountName}`,
        });
      } else {
        console.error("Verification response missing required data:", data);
        setVerifiedAccount(null);
        toast({
          title: "Verification Failed",
          description: data.message || "Invalid response from verification service",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Bank verification failed:", error);
      const errorMessage = error.message || "Could not verify account details";
      
      // Handle specific error cases
      let userMessage = errorMessage;
      if (errorMessage.includes("401")) {
        userMessage = "Authentication required. Please refresh the page and try again.";
      } else if (errorMessage.includes("timeout") || errorMessage.includes("ECONNREFUSED")) {
        userMessage = "Network error. Please check your connection and try again.";
      } else if (errorMessage.includes("invalid_account")) {
        userMessage = "Invalid account number. Please check your account number and try again.";
      } else if (errorMessage.includes("invalid_bank_code")) {
        userMessage = "Invalid bank selection. Please select your bank and try again.";
      }
      
      toast({
        title: "Verification Failed",
        description: userMessage,
        variant: "destructive",
      });
      setVerifiedAccount(null);
    },
  });

  // Setup bank account mutation
  const setupAccountMutation = useMutation({
    mutationFn: async (data: BankAccountFormData) => {
      const response = await apiRequest("POST", "/api/users/setup-bank-account", data);
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

  // Watch form fields for verification
  const watchedAccountNumber = form.watch("accountNumber");
  const watchedBankCodeWithName = form.watch("bankCode");
  const watchedBankCode = watchedBankCodeWithName ? watchedBankCodeWithName.split('|')[0] : "";
  
  // Clear verification when account number or bank changes
  useEffect(() => {
    if (watchedAccountNumber && watchedAccountNumber.length !== 10) {
      setVerifiedAccount(null);
      setHasAttemptedVerification(false);
    }
  }, [watchedAccountNumber]);

  // Reset verification when bank changes
  useEffect(() => {
    setVerifiedAccount(null);
    setHasAttemptedVerification(false);
  }, [watchedBankCode]);

  // Stable verification function
  const performVerification = useCallback((accountNumber: string, bankCode: string) => {
    // Extract just the bank code from the combined value (format: code|name|id)
    const cleanBankCode = bankCode.split('|')[0];
    console.log("Performing verification for:", { accountNumber, bankCode: cleanBankCode });
    setIsVerifying(true);
    setHasAttemptedVerification(true);
    
    verifyBankAccountMutation.mutate(
      { accountNumber, bankCode: cleanBankCode },
      {
        onSettled: () => {
          console.log("Bank verification mutation settled");
          setIsVerifying(false);
        },
      }
    );
  }, [verifyBankAccountMutation]);

  // Verify account when both bank and account number are provided (only once per combination)
  useEffect(() => {
    console.log("useEffect - Verification check:", {
      accountNumber: watchedAccountNumber,
      accountLength: watchedAccountNumber?.length,
      bankCode: watchedBankCode,
      verifiedAccount: !!verifiedAccount,
      isVerifying,
      isPending: verifyBankAccountMutation.isPending,
      hasAttempted: hasAttemptedVerification
    });
    
    if (watchedAccountNumber && 
        watchedAccountNumber.length === 10 && 
        watchedBankCode && 
        !verifiedAccount && 
        !isVerifying && 
        !verifyBankAccountMutation.isPending && 
        !hasAttemptedVerification) {
      
      console.log("✅ All conditions met - Starting verification immediately");
      console.log("Account Number:", watchedAccountNumber);
      console.log("Bank Code:", watchedBankCode);
      
      // Trigger verification immediately without timeout
      performVerification(watchedAccountNumber, watchedBankCode);
    }
  }, [watchedBankCode, watchedAccountNumber, verifiedAccount, isVerifying, hasAttemptedVerification, verifyBankAccountMutation.isPending, performVerification]);

  const onSubmit = (data: BankAccountFormData) => {
    if (!verifiedAccount) {
      toast({
        title: "Account Verification Required",
        description: "Please verify your account details before proceeding.",
        variant: "destructive",
      });
      return;
    }
    
    // Extract just the bank code from the combined value
    const bankCode = data.bankCode.split('|')[0];
    const formDataWithCleanBankCode = {
      ...data,
      bankCode: bankCode
    };
    
    console.log("Submitting bank account data:", formDataWithCleanBankCode);
    setupAccountMutation.mutate(formDataWithCleanBankCode);
  };

  const banks = (banksResponse as any)?.banks || [];
  const bankStats = (banksResponse as any)?.statistics || { total: 0, commercial: 0, microfinance: 0 };
  const hasExistingAccount = (existingAccount as any)?.bankAccount && (existingAccount as any)?.bankAccount?.accountNumber;

  // Enhanced bank search with common name mappings
  const filteredBanks = banks.filter((bank: Bank) => {
    const searchTerm = bankSearchTerm.toLowerCase();
    const bankName = bank.name.toLowerCase();
    
    // Direct name match
    if (bankName.includes(searchTerm)) {
      return true;
    }
    
    // Common bank name mappings for easier search
    const bankMappings: { [key: string]: string[] } = {
      'alat': ['alat by wema', 'wema bank'],
      'wema': ['alat by wema', 'wema bank'],
      'gtbank': ['guaranty trust bank', 'gtb'],
      'gtb': ['guaranty trust bank', 'gtb'],
      'uba': ['united bank for africa'],
      'fcmb': ['first city monument bank'],
      'zenith': ['zenith bank'],
      'access': ['access bank'],
      'fidelity': ['fidelity bank'],
      'union': ['union bank'],
      'sterling': ['sterling bank'],
      'polaris': ['polaris bank'],
      'keystone': ['keystone bank'],
      'providus': ['providus bank'],
      'kuda': ['kuda microfinance bank'],
      'opay': ['opay digital services limited'],
      'palmpay': ['palmpay limited'],
      'carbon': ['carbon microfinance bank'],
      'mint': ['mint microfinance bank'],
      'moniepoint': ['moniepoint microfinance bank'],
      'rubies': ['rubies microfinance bank'],
      'sparkle': ['sparkle microfinance bank'],
      'eyowo': ['eyowo microfinance bank']
    };
    
    // Check if search term matches any mapping
    for (const [key, variations] of Object.entries(bankMappings)) {
      if (searchTerm.includes(key)) {
        return variations.some(variation => bankName.includes(variation));
      }
    }
    
    return false;
  });

  // Categorize banks and ensure absolutely unique keys
  const commercialBanks = filteredBanks
    .filter((bank: Bank) => !bank.name.toLowerCase().includes('microfinance') && !bank.name.toLowerCase().includes('micro finance'))
    .map((bank: Bank, index: number) => ({ ...bank, uniqueKey: `commercial-${index}-${bank.id}-${bank.code}` }));
  
  const microfinanceBanks = filteredBanks
    .filter((bank: Bank) => bank.name.toLowerCase().includes('microfinance') || bank.name.toLowerCase().includes('micro finance'))
    .map((bank: Bank, index: number) => ({ ...bank, uniqueKey: `micro-${index}-${bank.id}-${bank.code}` }));

  if (accountLoading || banksLoading) {
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
            <TabsTrigger value="bank-account">Bank Account</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
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
                        bankCode: `${bankAccount?.bankCode}|${bankAccount?.bankName}|${bankAccount?.id || ''}`,
                        accountNumber: bankAccount?.accountNumber || '',
                        businessName: bankAccount?.businessName || '',
                        businessEmail: bankAccount?.businessEmail || '',
                        businessPhone: bankAccount?.businessPhone || '',
                        percentageCharge: bankAccount?.percentageCharge || 2,
                      });
                    }}
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
                              <SelectContent className="max-h-80">
                                {filteredBanks.map((bank: Bank) => (
                                  <SelectItem key={bank.id} value={`${bank.code}|${bank.name}|${bank.id}`}>
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
                            <Input {...field} placeholder="1234567890" />
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
                            <Input {...field} placeholder="Your business name" />
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
                            <Input {...field} type="email" placeholder="business@example.com" />
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
                            <Input {...field} placeholder="+234 xxx xxx xxxx" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={editBankAccountMutation.isPending}
                        className="flex-1"
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
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
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
                  {/* Step 1: Bank Selection FIRST */}
                  <FormField
                    control={form.control}
                    name="bankCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Your Bank</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!!verifiedAccount}
                          >
                            <SelectTrigger className={verifiedAccount ? "bg-gray-50" : ""}>
                              <SelectValue placeholder={verifiedAccount ? verifiedAccount.bankName : "Choose your bank first"} />
                            </SelectTrigger>
                            <SelectContent className="max-h-80">
                              {bankSearchTerm && (
                                <div className="sticky top-0 bg-white p-2 border-b">
                                  <div className="text-sm text-gray-600">
                                    Search for "{bankSearchTerm}" - {filteredBanks.length} results
                                  </div>
                                </div>
                              )}
                              
                              {/* Commercial Banks */}
                              {commercialBanks.length > 0 && (
                                <>
                                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Commercial Banks ({commercialBanks.length})
                                  </div>
                                  {commercialBanks.map((bank: any) => (
                                    <SelectItem key={bank.uniqueKey} value={`${bank.code}|${bank.name}|${bank.id}`}>
                                      <div className="flex items-center justify-between w-full">
                                        <span>{bank.name}</span>
                                        <Badge variant="secondary" className="ml-2 text-xs">
                                          Commercial
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              
                              {/* Microfinance Banks */}
                              {microfinanceBanks.length > 0 && (
                                <>
                                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Microfinance Banks ({microfinanceBanks.length})
                                  </div>
                                  {microfinanceBanks.map((bank: any) => (
                                    <SelectItem key={bank.uniqueKey} value={`${bank.code}|${bank.name}|${bank.id}`}>
                                      <div className="flex items-center justify-between w-full">
                                        <span>{bank.name}</span>
                                        <Badge variant="outline" className="ml-2 text-xs">
                                          Microfinance
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              
                              {filteredBanks.length === 0 && (
                                <div className="px-2 py-4 text-center text-sm text-gray-500">
                                  No banks found matching "{bankSearchTerm}"
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                        {!watchedBankCode && (
                          <div className="text-xs text-gray-500">
                            <p>🏦 Select your bank from the {bankStats.total} supported banks (including {bankStats.microfinance} microfinance banks)</p>
                          </div>
                        )}
                        {watchedBankCode && !watchedAccountNumber && (
                          <div className="text-xs text-blue-600">
                            <p>✅ Bank selected! Now enter your account number below for verification</p>
                          </div>
                        )}
                      </FormItem>
                    )}
                  />

                  {/* Step 2: Account Number SECOND (after bank selection) */}
                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your 10-digit account number"
                            maxLength={10}
                            type="tel"
                            disabled={!watchedBankCode}
                          />
                        </FormControl>
                        <FormMessage />
                        {!watchedBankCode && (
                          <p className="text-xs text-gray-500">
                            Please select your bank first, then enter your account number
                          </p>
                        )}
                        {isVerifying && (
                          <p className="text-sm text-blue-600 flex items-center gap-2">
                            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                            Verifying account with {banks.find((b: Bank) => b.code === watchedBankCode)?.name}...
                          </p>
                        )}
                        {verifiedAccount && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                            <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
                              <CheckCircle className="w-4 h-4" />
                              Account Verified Successfully
                            </div>
                            <div className="text-sm space-y-1">
                              <div><span className="font-medium">Bank:</span> {verifiedAccount.bankName}</div>
                              <div><span className="font-medium">Account Name:</span> <span className="text-green-700 font-semibold">{verifiedAccount.accountName}</span></div>
                              <div><span className="font-medium">Account Number:</span> {verifiedAccount.accountNumber}</div>
                            </div>
                          </div>
                        )}
                        {watchedAccountNumber && watchedAccountNumber.length === 10 && watchedBankCode && !verifiedAccount && !isVerifying && hasAttemptedVerification && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                            <div className="flex items-center gap-2 text-sm text-red-600 mb-2">
                              <AlertCircle className="w-4 h-4" />
                              Automatic verification failed. Please try again or verify manually.
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setHasAttemptedVerification(false);
                                setVerifiedAccount(null);
                              }}
                              className="mr-2"
                            >
                              Try Again
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const bankValue = form.getValues("bankCode");
                                const accountNum = form.getValues("accountNumber");
                                const [bankCode, bankName] = bankValue.split('|');
                                
                                // Prompt user for account name since verification failed
                                const accountName = prompt("Since automatic verification failed, please enter your account name as it appears on your bank statement:");
                                if (accountName && accountName.trim()) {
                                  setVerifiedAccount({
                                    accountName: accountName.trim(),
                                    accountNumber: accountNum,
                                    bankName: bankName || "Selected Bank",
                                    bankCode: bankCode,
                                  });
                                  toast({
                                    title: "Manual Verification Complete",
                                    description: `Account name set to: ${accountName.trim()}`,
                                  });
                                }
                              }}
                            >
                              Enter Account Name Manually
                            </Button>
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

                  <FormField
                    control={form.control}
                    name="percentageCharge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Platform Fee (%)
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="20"
                            step="0.1"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            placeholder="2.0"
                          />
                        </FormControl>
                        <FormMessage />
                        <div className="text-xs text-gray-600">
                          Platform fee charged on each transaction (0-20%). Default: 2%
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Revenue Sharing System
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="bg-white/70 p-3 rounded-md border border-green-100">
                        <h5 className="font-medium text-green-800 mb-2">How Platform Fees Work:</h5>
                        <ul className="text-green-700 space-y-1">
                          <li>• You earn {form.watch("percentageCharge") || 2}% from every successful payment</li>
                          <li>• Event organizers keep {100 - (form.watch("percentageCharge") || 2)}% of their event revenue</li>
                          <li>• Fees are automatically deducted during payment processing</li>
                          <li>• Platform fees go to your designated platform account</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white/70 p-3 rounded-md border border-blue-100">
                        <h5 className="font-medium text-blue-800 mb-2">Example Revenue Calculation:</h5>
                        <div className="text-blue-700 space-y-1">
                          <p>Event ticket price: ₦5,000</p>
                          <p>Platform fee ({form.watch("percentageCharge") || 2}%): <span className="font-semibold text-green-600">₦{((form.watch("percentageCharge") || 2) / 100 * 5000).toFixed(0)}</span></p>
                          <p>Event organizer receives: <span className="font-semibold text-blue-600">₦{(5000 - ((form.watch("percentageCharge") || 2) / 100 * 5000)).toFixed(0)}</span></p>
                        </div>
                      </div>

                      <div className="bg-white/70 p-3 rounded-md border border-purple-100">
                        <h5 className="font-medium text-purple-800 mb-2">Multi-Tenant Benefits:</h5>
                        <ul className="text-purple-700 space-y-1">
                          <li>• Complete financial separation between organizations</li>
                          <li>• No mixing of funds - each organization has its own account</li>
                          <li>• Instant settlement to organizer accounts</li>
                          <li>• Transparent fee structure for all users</li>
                          <li>• Scalable revenue model for the platform</li>
                        </ul>
                      </div>
                    </div>
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

        {/* Bank Information Panel */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Supported Banks
            </CardTitle>
            <CardDescription>
              We support all Nigerian banks including microfinance banks for account verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{bankStats.total}</div>
                <div className="text-sm text-blue-700">Total Banks</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{bankStats.commercial}</div>
                <div className="text-sm text-green-700">Commercial Banks</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{bankStats.microfinance}</div>
                <div className="text-sm text-purple-700">Microfinance Banks</div>
              </div>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Account Verification Process:</strong>
                <ol className="mt-2 space-y-1 text-sm">
                  <li>1. Enter your 10-digit account number - we'll try to auto-detect your bank</li>
                  <li>2. If auto-detection fails, manually select your bank from the searchable list</li>
                  <li>3. We'll verify your account name with the bank for security</li>
                  <li>4. Once verified, you can receive payments directly to your account</li>
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
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : !hasExistingAccount ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Set up your bank account first to start receiving payments</p>
                    <Button onClick={() => {
                      const bankAccountTab = document.querySelector('[value="bank-account"]') as HTMLElement;
                      bankAccountTab?.click();
                    }}>
                      Setup Bank Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(!paymentsData?.payments || paymentsData.payments.length === 0) ? (
                      <div className="text-center py-8">
                        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No payments received yet</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Payments will appear here when users pay for your events
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {paymentsData.payments.map((payment: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{payment.eventName || 'Event Payment'}</h4>
                                <p className="text-sm text-gray-600">
                                  {payment.registrationData?.guestName || 'Anonymous'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Ref: {payment.reference}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">
                                  ₦{(payment.amount / 100).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(payment.createdAt).toLocaleDateString()}
                                </p>
                                <Badge variant={payment.status === 'success' ? 'default' : 'secondary'}>
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