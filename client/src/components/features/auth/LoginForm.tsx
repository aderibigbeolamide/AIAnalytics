import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  type?: 'organization' | 'super_admin';
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  type = 'organization', 
  onSuccess 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login } = useAuthStore();
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.auth.login(data);
      
      if (response.user && response.token) {
        // Check if user role matches expected login type
        if (type === 'super_admin' && response.user.role !== 'super_admin') {
          setError('Invalid credentials for super admin login');
          return;
        }
        
        if (type === 'organization' && response.user.role === 'super_admin') {
          setError('Super admin users should use the super admin login');
          return;
        }

        // Store auth data
        login(response.user, response.token);
        
        toast({
          title: 'Login successful',
          description: `Welcome back, ${response.user.firstName || response.user.username}!`,
        });

        onSuccess?.();
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'super_admin':
        return 'Super Admin Login';
      default:
        return 'Organization Login';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'super_admin':
        return 'Access platform administration features';
      default:
        return 'Sign in to your organization account';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="login-form">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          {getTitle()}
        </CardTitle>
        <CardDescription className="text-center">
          {getDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive" data-testid="error-message">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              data-testid="input-username"
              {...register('username')}
            />
            {errors.username && (
              <p className="text-sm text-red-500" data-testid="error-username">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                data-testid="input-password"
                {...register('password')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                data-testid="button-toggle-password"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500" data-testid="error-password">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid="button-login"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {type === 'organization' && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an organization account?{' '}
              <a 
                href="/organization-register" 
                className="text-blue-600 hover:underline"
                data-testid="link-register"
              >
                Register here
              </a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};