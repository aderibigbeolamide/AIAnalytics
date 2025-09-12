import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { QrCode, ArrowLeft, Lock, User, Shield, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trackLogin } from "@/lib/gtm";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ username: "", password: "" });
  const { login } = useAuthStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setFieldErrors({ username: "", password: "" });

    // Client-side validation
    const newFieldErrors = { username: "", password: "" };
    if (!username.trim()) {
      newFieldErrors.username = "Username is required";
    }
    if (!password.trim()) {
      newFieldErrors.password = "Password is required";
    }
    
    if (newFieldErrors.username || newFieldErrors.password) {
      setFieldErrors(newFieldErrors);
      setIsLoading(false);
      return;
    }

    try {
      await login(username.trim(), password.trim());
      
      // Track successful login
      trackLogin('form');
      
      toast({
        title: "Welcome back!",
        description: "Successfully signed in to Eventify AI",
      });
      // Small delay to ensure state is updated before redirect
      setTimeout(() => {
        setLocation("/dashboard");
      }, 100);
    } catch (error) {
      setError("Invalid username or password. Please check your credentials and try again.");
      toast({
        title: "Sign in failed",
        description: "Invalid username or password. Please contact your administrator for assistance.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Enhanced Back to Landing Page Link */}
        <div className="mb-8">
          <Link href="/landing">
            <Button variant="ghost" className="group p-0 h-auto text-gray-600 hover:text-blue-600 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Homepage
            </Button>
          </Link>
        </div>
        
        {/* Enhanced Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-6">
            <img
              className="h-16 w-auto"
              src="/logo.png"
              alt="EventValidate"
            />
            <span className="ml-3 text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              EventValidate
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to access your event management dashboard</p>
          <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
            <Shield className="h-4 w-4 mr-2 text-green-600" />
            Secure login protected by enterprise-grade encryption
          </div>
        </div>
        
        {/* Enhanced Login Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-gray-900">Sign In</CardTitle>
            <p className="text-sm text-gray-600 text-center">
              Enter your credentials to continue
            </p>
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Sign in failed</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold text-gray-700">
                  Username *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: "" }));
                    }}
                    placeholder="Enter your username"
                    className={`pl-10 h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${
                      fieldErrors.username ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                    aria-describedby={fieldErrors.username ? "username-error" : undefined}
                    required
                  />
                </div>
                {fieldErrors.username && (
                  <p id="username-error" className="text-sm text-red-600 flex items-center mt-1">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {fieldErrors.username}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: "" }));
                    }}
                    placeholder="Enter your password"
                    className={`pl-10 h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${
                      fieldErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    required
                  />
                </div>
                {fieldErrors.password && (
                  <p id="password-error" className="text-sm text-red-600 flex items-center mt-1">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {fieldErrors.password}
                  </p>
                )}
              </div>
              
              <Button
                type="submit"
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in securely...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Sign In Securely
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Registration and Access Links */}
        <div className="text-center mt-8 space-y-4">
          <div className="p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-3">
              New to EventValidate?
            </p>
            <Link href="/organization-register">
              <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold">
                Create an Organization Account
              </Button>
            </Link>
          </div>
          
          <Link href="/landing">
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              ← Back to Homepage
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
