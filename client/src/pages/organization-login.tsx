import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, ArrowLeft, Eye, EyeOff, AlertTriangle, Lock, Shield } from "lucide-react";

export default function OrganizationLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { login, isAuthenticated, user } = useAuthStore();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user?.role !== 'super_admin') {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(username.trim(), password.trim());

      toast({
        title: "Login Successful",
        description: "Welcome back to your organization dashboard!",
      });
      
      setLocation('/dashboard');
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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
            <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full shadow-lg">
              <Building2 className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">EventValidate</h1>
          <p className="text-gray-600 text-lg">Organization Portal</p>
          <div className="flex items-center justify-center mt-3 text-green-600 text-sm">
            <Shield className="h-4 w-4 mr-1" />
            <span>Secure Login</span>
          </div>
        </div>
        
        {/* Login Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center text-gray-900">Welcome Back</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Enter your organization credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700">Username or Email</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  required
                  autoComplete="username"
                  aria-describedby="username-help"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-700">Password</Label>
                  <div className="flex items-center text-xs text-gray-500">
                    <Lock className="h-3 w-3 mr-1" />
                    <span>Encrypted</span>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your secure password"
                    className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium py-3"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in securely...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Sign In Securely
                  </>
                )}
              </Button>
            </form>
            
            {/* Register Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Don't have an organization account?{" "}
                <Link href="/register">
                  <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-800 font-medium">
                    Create an Organization Account
                  </Button>
                </Link>
              </p>
            </div>
            
            {/* Security Notice */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500 flex items-center justify-center">
                <Shield className="h-3 w-3 mr-1" />
                Your data is protected with enterprise-grade security
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Status Badge */}
        <div className="mt-6 text-center space-y-2">
          <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
            ✅ Trusted by 500+ Organizations
          </Badge>
          <p className="text-xs text-gray-400">EventValidate - AI-Powered Member Validation</p>
        </div>
      </div>
    </div>
  );
}