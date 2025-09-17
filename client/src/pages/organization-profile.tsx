import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuthStore, getAuthHeaders } from "@/lib/auth";
import { 
  ArrowLeft, 
  Camera, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Lock,
  Save,
  Upload,
  User,
  CreditCard,
  FileText,
  Users,
  Eye,
  EyeOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const organizationSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  website: z.string().url("Please enter a valid website URL").optional().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const usernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username must be less than 50 characters"),
  currentPassword: z.string().min(1, "Current password is required for username changes"),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type UsernameFormData = z.infer<typeof usernameSchema>;

export default function OrganizationProfile() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Password visibility states
  const [showUsernameCurrentPassword, setShowUsernameCurrentPassword] = useState(false);
  const [showPasswordCurrentPassword, setShowPasswordCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Fetch organization profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/organization/profile'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/organization/profile');
      const data = await response.json();
      console.log('Profile data received:', data);
      return data;
    },
  });

  // Organization profile form
  const organizationForm = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      businessName: profile?.businessName || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      description: profile?.description || "",
      website: profile?.website || "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Username form
  const usernameForm = useForm<UsernameFormData>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: user?.username || "",
      currentPassword: "",
    },
  });

  // Update organization profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      const response = await apiRequest('PUT', '/api/organization/profile', data);
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your organization profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/organization/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const response = await apiRequest('PUT', '/api/organization/password', data);
      if (!response.ok) {
        throw new Error('Failed to update password');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully.",
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Password Update Failed",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update username mutation
  const updateUsernameMutation = useMutation({
    mutationFn: async (data: UsernameFormData) => {
      const response = await apiRequest('PUT', '/api/organization/username', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update username');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Username Updated",
        description: "Your username has been updated successfully.",
      });
      usernameForm.reset({
        username: data.username,
        currentPassword: "",
      });
      // Update auth store with new token and user data
      if (data.token && data.user) {
        // Save to localStorage manually and update store state
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        localStorage.setItem('auth_timestamp', Date.now().toString());
        localStorage.setItem('auth_last_activity', Date.now().toString());
      }
      // Invalidate auth to refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: any) => {
      toast({
        title: "Username Update Failed",
        description: error.message || "Failed to update username. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Profile image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);
      
      // Use direct fetch for file uploads instead of apiRequest
      const authHeaders = getAuthHeaders();
      const response = await fetch('/api/organization/profile-image', {
        method: 'POST',
        headers: {
          ...authHeaders,
          // Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      return await response.json();
    },
    onSuccess: async (data) => {
      // Force immediate state update
      setProfileImage(data.imageUrl);
      
      // Invalidate and refetch profile data
      await queryClient.invalidateQueries({ queryKey: ['/api/organization/profile'] });
      await queryClient.refetchQueries({ queryKey: ['/api/organization/profile'] });
      
      toast({
        title: "Profile Image Updated",
        description: "Your profile image has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Pro upgrade request mutation
  const upgradeRequestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/organizations/request-pro-upgrade', {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send upgrade request');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upgrade Request Sent!",
        description: data.message || "Your Pro plan upgrade request has been sent to our team. We'll contact you within 24-48 hours.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description: error.message || "Failed to send upgrade request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (data: OrganizationFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handlePasswordSubmit = (data: PasswordFormData) => {
    updatePasswordMutation.mutate(data);
  };

  const handleUsernameSubmit = (data: UsernameFormData) => {
    updateUsernameMutation.mutate(data);
  };

  const handleUpgradeRequest = () => {
    upgradeRequestMutation.mutate();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      uploadImageMutation.mutate(file);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Organization Profile</h1>
        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
          Manage your organization details, profile image, and account settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="text-xs sm:text-sm">Profile Information</TabsTrigger>
          <TabsTrigger value="subscription" className="text-xs sm:text-sm">Subscription Plan</TabsTrigger>
          <TabsTrigger value="security" className="text-xs sm:text-sm">Security Settings</TabsTrigger>
          <TabsTrigger value="image" className="text-xs sm:text-sm">Profile Image</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Organization Details
              </CardTitle>
              <CardDescription>
                Update your organization's public information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...organizationForm}>
                <form onSubmit={organizationForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={organizationForm.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter organization name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={organizationForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="organization@example.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={organizationForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Phone number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={organizationForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://www.example.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={organizationForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Organization address" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={organizationForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Brief description of your organization" rows={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Plan
              </CardTitle>
              <CardDescription>
                Manage your organization's subscription plan and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profile ? (
                <div className="space-y-4">
                  {/* Current Plan */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Current Plan</h4>
                      <Badge variant={profile.subscriptionPlan === 'pro' ? 'default' : 'secondary'} className="text-lg px-3 py-1">
                        {profile.subscriptionPlan === 'pro' ? '✨ Pro Plan' : '🏷️ Basic Plan'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Events Limit</h4>
                      <div className="text-2xl font-bold text-blue-600">
                        {profile.maxEvents === -1 ? '∞' : profile.maxEvents}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {profile.maxEvents === -1 ? 'Unlimited events' : 'events allowed'}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Members Limit</h4>
                      <div className="text-2xl font-bold text-green-600">
                        {profile.maxMembers === -1 ? '∞' : profile.maxMembers.toLocaleString()}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {profile.maxMembers === -1 ? 'Unlimited members' : 'members/registrations allowed'}
                      </p>
                    </div>
                  </div>

                  {/* Plan Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Basic Plan */}
                    <Card className={profile.subscriptionPlan === 'basic' ? 'ring-2 ring-blue-500' : ''}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          🏷️ Basic Plan
                          {profile.subscriptionPlan === 'basic' && (
                            <Badge variant="default">Current</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>Perfect for small organizations</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Up to 10 events
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Up to 5,000 members/registrations
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            QR Code validation
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Email support
                          </li>
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Pro Plan */}
                    <Card className={profile.subscriptionPlan === 'pro' ? 'ring-2 ring-green-500' : 'border-green-200'}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          ✨ Pro Plan
                          {profile.subscriptionPlan === 'pro' && (
                            <Badge variant="default">Current</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>For growing organizations</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Up to 100 events
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            <strong>Unlimited</strong> members/registrations
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Advanced analytics
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            Priority support
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            All Basic features
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Upgrade Button */}
                  {profile.subscriptionPlan === 'basic' && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-green-200">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                          <h4 className="font-medium text-green-800">Ready to grow?</h4>
                          <p className="text-sm text-green-600 mt-1">
                            Upgrade to Pro for unlimited members and 100 events
                          </p>
                        </div>
                        <Button 
                          onClick={handleUpgradeRequest}
                          disabled={upgradeRequestMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          data-testid="button-upgrade-to-pro"
                        >
                          {upgradeRequestMutation.isPending ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Sending Request...
                            </>
                          ) : (
                            <>
                              ✨ Request Pro Upgrade
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {profile.subscriptionPlan === 'pro' && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🎉</span>
                        <div>
                          <h4 className="font-medium text-green-800">You're on Pro!</h4>
                          <p className="text-sm text-green-600">
                            Enjoy unlimited members and up to 100 events
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading subscription information...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            {/* Username Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Username Settings
                </CardTitle>
                <CardDescription>
                  Change your account username
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...usernameForm}>
                  <form onSubmit={usernameForm.handleSubmit(handleUsernameSubmit)} className="space-y-6">
                    <FormField
                      control={usernameForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter new username" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={usernameForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                {...field} 
                                type={showUsernameCurrentPassword ? "text" : "password"} 
                                placeholder="Enter current password to confirm" 
                                className="pr-10"
                                data-testid="input-username-current-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
                                onClick={() => setShowUsernameCurrentPassword(!showUsernameCurrentPassword)}
                                aria-label={showUsernameCurrentPassword ? "Hide password" : "Show password"}
                                aria-pressed={showUsernameCurrentPassword}
                                data-testid="button-toggle-username-current-password"
                              >
                                {showUsernameCurrentPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={updateUsernameMutation.isPending}
                      className="w-full md:w-auto"
                    >
                      {updateUsernameMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4 mr-2" />
                          Update Username
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Password Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Password Settings
                </CardTitle>
                <CardDescription>
                  Change your account password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              type={showPasswordCurrentPassword ? "text" : "password"} 
                              placeholder="Enter current password" 
                              className="pr-10"
                              data-testid="input-password-current-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
                              onClick={() => setShowPasswordCurrentPassword(!showPasswordCurrentPassword)}
                              aria-label={showPasswordCurrentPassword ? "Hide password" : "Show password"}
                              aria-pressed={showPasswordCurrentPassword}
                              data-testid="button-toggle-password-current-password"
                            >
                              {showPasswordCurrentPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" aria-hidden="true" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              type={showNewPassword ? "text" : "password"} 
                              placeholder="Enter new password" 
                              className="pr-10"
                              data-testid="input-new-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              aria-label={showNewPassword ? "Hide password" : "Show password"}
                              aria-pressed={showNewPassword}
                              data-testid="button-toggle-new-password"
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" aria-hidden="true" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              type={showConfirmNewPassword ? "text" : "password"} 
                              placeholder="Confirm new password" 
                              className="pr-10"
                              data-testid="input-confirm-new-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
                              onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                              aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                              aria-pressed={showConfirmNewPassword}
                              data-testid="button-toggle-confirm-new-password"
                            >
                              {showConfirmNewPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" aria-hidden="true" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={updatePasswordMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {updatePasswordMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Update Password
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="image">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Profile Image
              </CardTitle>
              <CardDescription>
                Upload or change your organization's profile image
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-24 h-24 sm:w-32 sm:h-32">
                    <AvatarImage 
                      src={profileImage || profile?.profileImage || undefined} 
                      alt="Organization profile"
                      className="object-cover object-center w-full h-full"
                    />
                    <AvatarFallback className="text-2xl bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                      <User className="w-12 h-12 sm:w-16 sm:h-16" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="space-y-3 text-center sm:text-left w-full sm:w-auto">
                  <Label htmlFor="profile-image" className="cursor-pointer">
                    <Button asChild disabled={uploadImageMutation.isPending} className="w-full sm:w-auto">
                      <span>
                        {uploadImageMutation.isPending ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Image
                          </>
                        )}
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    JPG, PNG or GIF. Maximum size 5MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}