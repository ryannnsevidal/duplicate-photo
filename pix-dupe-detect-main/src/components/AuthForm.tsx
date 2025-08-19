import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { signInWithPassword, signUp, signInWithGitHub } from '@/lib/auth';
import { Github } from 'lucide-react';

interface AuthFormProps {
  onAuthSuccess?: () => void;
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      let result;
      
      if (authMode === 'signin') {
        result = await signInWithPassword(email, password);
      } else {
        result = await signUp(email, password);
      }

      if (result.success) {
        if (result.message) {
          // Sign-up with email confirmation
          toast({
            title: "Account created!",
            description: result.message,
          });
          setAuthMode('signin');
        } else {
          // Successful sign-in
          toast({
            title: "Welcome back!",
            description: "You have been successfully signed in.",
          });
          onAuthSuccess?.();
        }
      } else {
        setAuthError(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const result = await signInWithGitHub();
      
      if (result.success) {
        // GitHub OAuth will redirect to callback page
        console.log('GitHub OAuth initiated');
      } else {
        setAuthError(result.error || 'GitHub authentication failed');
      }
    } catch (error) {
      console.error('GitHub auth error:', error);
      setAuthError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          {authMode === 'signin' ? 'Sign In' : 'Create Account'}
        </CardTitle>
        <CardDescription className="text-center">
          {authMode === 'signin' 
            ? 'Enter your credentials to access your account'
            : 'Create a new account to get started'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* GitHub OAuth Button */}
        <div className="space-y-2">
          <Button 
            type="button"
            variant="outline" 
            className="w-full" 
            onClick={handleGitHubSignIn}
            disabled={isLoading}
          >
            <Github className="mr-2 h-4 w-4" />
            Continue with GitHub
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as 'signin' | 'signup')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  data-testid="email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  data-testid="password-input"
                />
              </div>
              
              {authError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md" data-testid="auth-error">
                  {authError}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="auth-submit"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  data-testid="email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  placeholder="Create a password (min 6 characters)"
                  required
                  minLength={6}
                  data-testid="password-input"
                />
              </div>
              
              {authError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md" data-testid="auth-error">
                  {authError}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="auth-submit"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}