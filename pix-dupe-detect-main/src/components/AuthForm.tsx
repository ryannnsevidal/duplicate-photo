import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { signInWithPassword as supaSignIn } from '@/lib/auth';

interface AuthFormProps {
  onAuthSuccess: () => void;
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailError, setEmailError] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const { toast } = useToast();

  const validateEmail = (v: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setAuthError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Optional: could add signUp here later; keep minimal now.
        toast({ title: 'Sign up not enabled', description: 'Please use an existing test account.', variant: 'destructive' });
      } else {
        const { error } = await supaSignIn(email, password);
        if (error) {
          setAuthError(error.message || 'Authentication failed');
          toast({ title: 'Authentication failed', description: error.message, variant: 'destructive' });
          return;
        }
        onAuthSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </CardTitle>
        <CardDescription>
          {isSignUp 
            ? 'Create an account to start checking for duplicate images'
            : 'Sign in to access your duplicate image checker'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              data-testid="email-input"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {emailError && (
              <div
                id="email-error"
                data-testid="email-error"
                role="alert"
                aria-live="assertive"
                className="text-destructive text-sm mt-1"
              >
                {emailError}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              minLength={6}
              data-testid="password-input"
            />
          </div>

          {authError && (
            <div data-testid="auth-error" role="alert" className="text-destructive text-sm">
              {authError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading} data-testid="auth-submit">
            {isLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsSignUp(!isSignUp)}
            data-testid="toggle-auth-mode"
          >
            {isSignUp 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Sign up"
            }
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}