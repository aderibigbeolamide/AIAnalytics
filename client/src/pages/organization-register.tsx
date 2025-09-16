import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { OTPVerificationDialog } from "@/components/ui/otp-verification-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, ArrowLeft, CheckCircle, AlertTriangle, Shield, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function OrganizationRegister() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  
  // Email verification states
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isOTPDialogOpen, setIsOTPDialogOpen] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [otpError, setOtpError] = useState("");
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    website: "",
    adminFirstName: "",
    adminLastName: "",
    adminUsername: "",
    adminEmail: "",
    adminPassword: "",
    adminPasswordConfirm: ""
  });

  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Reset verification status if contact email changes
    if (name === 'contactEmail' && isEmailVerified) {
      setIsEmailVerified(false);
    }
    setOtpError("");
  };

  const handleSendOTP = async () => {
    if (!formData.contactEmail) {
      setOtpError("Please enter your contact email first");
      return;
    }

    if (!formData.contactEmail.includes('@')) {
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
          email: formData.contactEmail,
          organizationName: formData.name || undefined,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Email verification check
    if (!isEmailVerified) {
      setError("Please verify your contact email before submitting");
      setLoading(false);
      return;
    }

    // Validation
    if (formData.adminPassword !== formData.adminPasswordConfirm) {
      setError("Admin passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.adminPassword.length < 6) {
      setError("Admin password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    // Email validation removed - admin can use same email as contact

    if (!formData.adminEmail) {
      setError("Admin email is required");
      setLoading(false);
      return;
    }

    try {
      await apiRequest('POST', '/api/organizations/register', {
        organizationName: formData.name,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone || "",
        address: formData.address || "",
        website: formData.website || "",
        description: formData.description || "",
        adminUsername: formData.adminUsername,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        adminFirstName: formData.adminFirstName,
        adminLastName: formData.adminLastName
      });

      setSuccess(true);
      toast({
        title: "Registration Successful",
        description: "Your organization has been registered and is pending approval.",
      });
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <div className="flex justify-center items-center mb-6">
              <div className="p-3 bg-green-600 rounded-full">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Registration Submitted!</h1>
            <p className="text-gray-600 mb-6">
              Your organization registration has been submitted successfully. 
              Our team will review your application and notify you via email once approved.
            </p>
            
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm mb-6">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Check your email and verify your account</p>
                  <p>• Our team will review your organization details</p>
                  <p>• You'll receive an approval email within 24-48 hours</p>
                  <p>• Once approved, you can login and start managing events</p>
                  <p>• Contact support if you have any questions</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Link href="/login">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Try Login (After Approval)
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Back to Homepage
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Back to Landing Page Link */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="group p-0 h-auto text-gray-600 hover:text-blue-600 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Homepage
            </Button>
          </Link>
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-6">
            <div className="p-3 bg-blue-600 rounded-full">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Register Your Organization</h1>
          <p className="text-gray-600">Join EventValidate and start managing your events efficiently</p>
        </div>
        
        {/* Registration Form */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl text-center text-gray-900">Organization Registration</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Fill out the form below to register your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Organization Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Organization Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Organization Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter organization name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="contactEmail"
                        name="contactEmail"
                        type="email"
                        value={formData.contactEmail}
                        onChange={handleInputChange}
                        placeholder="contact@organization.com"
                        required
                      />
                      <Button
                        type="button"
                        variant={isEmailVerified ? "default" : "outline"}
                        size="sm"
                        onClick={handleSendOTP}
                        disabled={isSendingOTP || !formData.contactEmail || isEmailVerified}
                        className="min-w-[120px]"
                      >
                        {isSendingOTP ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
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
                            Verify
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
                        <AlertTriangle className="w-4 h-4" />
                        <span>{otpError}</span>
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-600">
                      {isEmailVerified 
                        ? "Your contact email has been verified"
                        : "You must verify your email before submitting"
                      }
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      name="contactPhone"
                      type="tel"
                      value={formData.contactPhone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="https://www.organization.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Organization address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of your organization"
                    rows={3}
                  />
                </div>
              </div>

              {/* Admin Account */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Admin Account</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminFirstName">Admin First Name *</Label>
                    <Input
                      id="adminFirstName"
                      name="adminFirstName"
                      value={formData.adminFirstName}
                      onChange={handleInputChange}
                      placeholder="First name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="adminLastName">Admin Last Name *</Label>
                    <Input
                      id="adminLastName"
                      name="adminLastName"
                      value={formData.adminLastName}
                      onChange={handleInputChange}
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminUsername">Admin Username *</Label>
                    <Input
                      id="adminUsername"
                      name="adminUsername"
                      value={formData.adminUsername}
                      onChange={handleInputChange}
                      placeholder="Choose a username"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Admin Email *</Label>
                    <Input
                      id="adminEmail"
                      name="adminEmail"
                      type="email"
                      value={formData.adminEmail}
                      onChange={handleInputChange}
                      placeholder="admin@organization.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Admin Password *</Label>
                    <div className="relative">
                      <Input
                        id="adminPassword"
                        name="adminPassword"
                        type={showPassword ? "text" : "password"}
                        value={formData.adminPassword}
                        onChange={handleInputChange}
                        placeholder="Minimum 6 characters"
                        className="pr-10"
                        required
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
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="adminPasswordConfirm">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="adminPasswordConfirm"
                        name="adminPasswordConfirm"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.adminPasswordConfirm}
                        onChange={handleInputChange}
                        placeholder="Confirm password"
                        className="pr-10"
                        required
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
                  </div>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering Organization...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Register Organization
                  </>
                )}
              </Button>
            </form>
            
            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Already have an organization account?{" "}
                <Link href="/login">
                  <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-800">
                    Sign in here
                  </Button>
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* OTP Verification Dialog */}
        <OTPVerificationDialog
          isOpen={isOTPDialogOpen}
          onClose={() => setIsOTPDialogOpen(false)}
          email={formData.contactEmail}
          onVerificationSuccess={handleEmailVerified}
        />
      </div>
    </div>
  );
}