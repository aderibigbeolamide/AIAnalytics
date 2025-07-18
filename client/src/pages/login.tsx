import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { QrCode, ArrowLeft, Lock, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trackLogin } from "../../lib/gtm";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(username.trim(), password.trim());
      
      // Track successful login
      trackLogin('form');
      
      toast({
        title: "Welcome back!",
        description: "Successfully signed in to EventValidate",
      });
      // Small delay to ensure state is updated before redirect
      setTimeout(() => {
        setLocation("/dashboard");
      }, 100);
    } catch (error) {
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
        </div>
        
        {/* Enhanced Login Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-gray-900">Sign In</CardTitle>
            <p className="text-sm text-gray-600 text-center">
              Enter your credentials to continue
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold text-gray-700">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="pl-10 h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
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
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Access Link */}
        <div className="text-center mt-8">
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
