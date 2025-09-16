import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { OTPVerificationDialog } from "@/components/ui/otp-verification-dialog";
import { Building2, User, Mail, Phone, Globe, MapPin, CheckCircle, AlertCircle, Clock, Shield, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";

const registrationSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  description: z.string().optional(),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url("Valid URL required").optional().or(z.literal("")),
  adminUsername: z.string().min(3, "Username must be at least 3 characters"),
  adminEmail: z.string().email("Valid admin email is required"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  adminFirstName: z.string().min(1, "First name is required"),
  adminLastName: z.string().min(1, "Last name is required"),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
// Note: Email restriction removed - admin can use same email as organization contact

type RegistrationForm = z.infer<typeof registrationSchema>;

export default function OrganizationRegistration() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState<any>(null);
  
  // Email verification states
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isOTPDialogOpen, setIsOTPDialogOpen] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [otpError, setOtpError] = useState("");
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      organizationName: "",
      description: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      website: "",
      adminUsername: "",
      adminEmail: "",
      adminPassword: "",
      confirmPassword: "",
      adminFirstName: "",
      adminLastName: "",
    },
  });

  const handleSendOTP = async () => {
    const contactEmail = form.getValues("contactEmail");
    const organizationName = form.getValues("organizationName");
    
    if (!contactEmail) {
      setOtpError("Please enter your contact email first");
      return;
    }

    if (!contactEmail.includes('@')) {
      setOtpError("Please enter a valid email address");
      return;
    }

    setIsSendingOTP(true);
    setOtpError("");

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: contactEmail,
          organizationName: organizationName || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsOTPDialogOpen(true);
      } else {
        setOtpError(data.message || "Failed to send verification code");
      }
    } catch (error) {
      setOtpError("Failed to send verification code. Please try again.");
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleEmailVerified = () => {
    setIsEmailVerified(true);
    setOtpError("");
  };

  const onSubmit = async (data: RegistrationForm) => {
    if (!isEmailVerified) {
      setErrorMessage("Please verify your contact email before submitting");
      return;
    }

    setIsSubmitting(true);
    setRegistrationStatus('idle');
    setErrorMessage("");

    try {
      const response = await fetch("/api/organizations/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setRegistrationStatus('success');
        setSuccessData(result);
      } else {
        setRegistrationStatus('error');
        setErrorMessage(result.message || "Registration failed");
      }
    } catch (error) {
      setRegistrationStatus('error');
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registrationStatus === 'success') {
    return (
      <div className="container mx-auto py-12 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Registration Submitted!</CardTitle>
            <CardDescription>
              Your organization registration has been successfully submitted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Your registration is currently under review by our super admin team. 
                You will receive an email notification once your organization is approved.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Registration Details</h3>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{successData?.organization?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {successData?.organization?.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">What happens next?</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2"></div>
                    <span>Super admin will review your organization details</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2"></div>
                    <span>You'll receive email notification of approval or requests for additional information</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2"></div>
                    <span>Once approved, you can log in and start creating events</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setLocation("/login")} className="flex-1">
                Go to Login
              </Button>
              <Button variant="outline" onClick={() => setLocation("/")} className="flex-1">
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 max-w-4xl">
      <div className="text-center mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" onClick={() => setLocation("/")} className="flex items-center gap-2">
            ← Back to Home
          </Button>
          <div className="flex-1" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Register Your Organization</h1>
        <p className="text-muted-foreground">
          Join EventValidate to manage your organization's events and member validation
        </p>
      </div>

      {registrationStatus === 'error' && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Organization Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Organization Information
                </CardTitle>
                <CardDescription>
                  Tell us about your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ahmadiyya Muslim Community - Lagos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of your organization..."
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: Describe your organization's mission and activities
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email *</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input 
                              type="email" 
                              placeholder="contact@yourorganization.org"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                // Reset verification status if email changes
                                if (isEmailVerified) {
                                  setIsEmailVerified(false);
                                }
                                setOtpError("");
                              }}
                            />
                            <Button
                              type="button"
                              variant={isEmailVerified ? "default" : "outline"}
                              size="sm"
                              onClick={handleSendOTP}
                              disabled={isSendingOTP || !field.value || isEmailVerified}
                              className="min-w-[120px]"
                            >
                              {isSendingOTP ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                  Sending...
                                </>
                              ) : isEmailVerified ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Verified
                                </>
                              ) : (
                                <>
                                  <Shield className="w-3 h-3 mr-1" />
                                  Verify Email
                                </>
                              )}
                            </Button>
                          </div>
                          
                          {isEmailVerified && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span>Email verified successfully</span>
                            </div>
                          )}
                          
                          {otpError && (
                            <div className="flex items-center gap-2 text-sm text-red-600">
                              <AlertCircle className="w-4 h-4" />
                              <span>{otpError}</span>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        {isEmailVerified 
                          ? "Your contact email has been verified"
                          : "You must verify your email before submitting the registration"
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+234 xxx xxx xxxx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Full organization address..."
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://yourorganization.org"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Admin User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Admin User Account
                </CardTitle>
                <CardDescription>
                  Create the primary admin account for your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="adminFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="adminUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username *</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe" {...field} />
                      </FormControl>
                      <FormDescription>
                        This will be used to log into the admin dashboard
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adminEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Email *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="admin@yourorganization.org"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adminPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            className="pr-10"
                            {...field} 
                            data-testid="input-admin-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            aria-pressed={showPassword}
                            data-testid="button-toggle-admin-password"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Minimum 6 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showConfirmPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            className="pr-10"
                            {...field} 
                            data-testid="input-confirm-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                            aria-pressed={showConfirmPassword}
                            data-testid="button-toggle-confirm-password"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Re-enter your password to confirm
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The admin user will have full access to create events, manage members, 
                    and configure organization settings once approved.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">Review and Submit</h3>
                  <p className="text-sm text-muted-foreground">
                    Your registration will be reviewed by our super admin team
                  </p>
                </div>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="min-w-32"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    "Submit Registration"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Button variant="link" className="p-0" onClick={() => setLocation("/login")}>
            Sign in here
          </Button>
        </p>
      </div>

      {/* OTP Verification Dialog */}
      <OTPVerificationDialog
        isOpen={isOTPDialogOpen}
        onClose={() => setIsOTPDialogOpen(false)}
        email={form.getValues("contactEmail")}
        onVerificationSuccess={handleEmailVerified}
      />
    </div>
  );
}