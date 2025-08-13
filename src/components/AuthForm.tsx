import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User, Chrome } from 'lucide-react';

function validateEmail(email: string) {
  // Simple email regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  const { signInWithEmail, signInWithGoogle, signUp, loading, user } = useAuth();

  // Check if we're in demo mode
  const isDemoMode = !import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL.includes('your-project') ||
    import.meta.env.VITE_SUPABASE_URL.includes('demo-project');

  if (user) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Clear previous errors first
    setErrors({});
    
    let hasError = false;
    const newErrors: { email?: string; password?: string; fullName?: string } = {};
    
    // Debug logging
    console.log('Validating email:', email);
    console.log('Email validation result:', validateEmail(email));
    
    // Validate email synchronously
    if (!email) {
      newErrors.email = 'Email is required';
      hasError = true;
    } else if (!validateEmail(email)) {
      // Match test expectation exactly - use consistent message
      newErrors.email = 'Please enter a valid email address';
      hasError = true;
    }
    
    // Validate password
    if (!password) {
      newErrors.password = 'Password is required';
      hasError = true;
    } else if (isSignUp && password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      hasError = true;
    }
    
    // Validate full name for sign up
    if (isSignUp && !fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      hasError = true;
    }
    
    // Set errors synchronously before early return
    console.log('Setting errors:', newErrors);
    console.log('Has error:', hasError);
    setErrors(newErrors);
    
    if (hasError) {
      setIsLoading(false);
      return;
    }
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Account created successfully! Please check your email to verify your account.');
        }
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Welcome back!');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);

    try {
      if (isDemoMode) {
        toast.info('Demo Mode: Google OAuth is not available. Use demo@example.com / demo123 to sign in.');
        return;
      }

      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.message);
      } else {
        toast.info('Redirecting to Google for authentication...');
        // The OAuth flow will handle the redirect
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? 'Sign up to start detecting duplicate photos'
              : 'Sign in to your duplicate photo detector'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleAuth}
            disabled={loading || isLoading}
          >
            <Chrome className="w-4 h-4 mr-2" />
            Continue with Google
          </Button>
          <div className="relative">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-white px-2 text-sm text-muted-foreground">
                or
              </span>
            </div>
          </div>
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required={isSignUp}
                  />
                </div>
                {errors.fullName && <div className="text-red-600 text-xs">{errors.fullName}</div>}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && (
                <div 
                  id="email-error"
                  data-testid="email-error"
                  role="alert"
                  aria-live="assertive"
                  className="text-red-600 text-xs"
                >
                  {errors.email}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <div className="text-red-600 text-xs">{errors.password}</div>}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || isLoading}
            >
              {loading || isLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>
          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : 'Create Account'}
            </Button>
          </div>
          {/* Demo credentials hint */}
          {isDemoMode && !isSignUp && (
            <div className="text-center text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg border space-y-2">
              <p className="font-medium mb-1">Demo Mode Credentials:</p>
              <div className="space-y-1">
                <p><strong>User:</strong> demo@example.com / demo123</p>
                <p><strong>Admin:</strong> admin@example.com / admin123</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}