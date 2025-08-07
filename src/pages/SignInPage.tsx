import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, CheckCircle, XCircle, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CaptchaVerification } from '@/components/CaptchaVerification';
import CaptchaWrapper from '@/components/CaptchaWrapper';
import { useBruteForceProtection } from '@/hooks/useBruteForceProtection';
import { signUpWithDomainCheck } from '@/lib/auth/domainValidation';

// Password strength validator
const validatePassword = (password: string) => {
  const requirements = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const score = Object.values(requirements).filter(Boolean).length;
  return { requirements, score, isValid: score === 5 };
};

export function SignInPage() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    isBlocked, 
    attemptCount, 
    timeRemaining, 
    recordFailedAttempt, 
    resetAttempts 
  } = useBruteForceProtection();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const passwordValidation = validatePassword(password);

  // Auto-redirect authenticated users to appropriate page
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (user && !loading) {
        console.log('✅ User authenticated, checking admin role for redirect...');
        
        try {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();

          const isAdmin = !!data && !error;
          
          if (isAdmin) {
            console.log('🔄 Redirecting admin user to admin dashboard');
            navigate('/admin', { replace: true });
          } else {
            console.log('🔄 Redirecting regular user to dashboard');
            navigate('/', { replace: true });
          }
        } catch (error) {
          console.error('Error checking admin role:', error);
          navigate('/', { replace: true });
        }
      }
    };

    checkAndRedirect();
  }, [user, loading, navigate]);

  // Show CAPTCHA if multiple failed attempts or brute force detected
  useEffect(() => {
    if (attemptCount >= 3 || isBlocked) {
      setCaptchaRequired(true);
    }
  }, [attemptCount, isBlocked]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 User clicked Google sign in...');
      
      const { error } = await signInWithGoogle();
      if (error) {
        console.error('❌ Google sign in error:', error);
        toast({
          title: "Authentication failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
      }
      // Don't set loading to false on success - let the auth state change handle it
    } catch (error: any) {
      console.error('❌ Unexpected Google sign in error:', error);
      toast({
        title: "Sign in failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (isSignUp && !passwordValidation.isValid) {
      toast({
        title: "Weak password",
        description: "Password must meet all security requirements",
        variant: "destructive",
      });
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    // Check if account is blocked
    if (isBlocked) {
      toast({
        title: "Account Temporarily Locked",
        description: `Too many failed attempts. Try again in ${Math.ceil(timeRemaining / 60)} minutes.`,
        variant: "destructive",
      });
      return;
    }

    // Require CAPTCHA if needed
    if (captchaRequired && !captchaToken) {
      toast({
        title: "CAPTCHA Required",
        description: "Please complete the CAPTCHA verification",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      if (isSignUp) {
        // Sign up with domain validation and email confirmation
        const { error } = await signUpWithDomainCheck(email, password);

        if (error) throw error;

        setEmailSent(true);
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link to complete your registration",
        });
      } else {
        // Sign in
        const { error } = await signInWithEmail(email, password);

        if (error) {
          // Record failed attempt for brute force protection (temporarily disabled for debugging)
          try {
            await recordFailedAttempt();
          } catch (bruteForceError) {
            console.error('Brute force protection error (non-blocking):', bruteForceError);
            // Don't block login due to brute force errors
          }
          
          // Check if we need CAPTCHA for failed attempts
          if (error.message.includes('rate limit') || error.message.includes('too many')) {
            setCaptchaRequired(true);
          }
          throw error;
        }

        // Reset attempts on successful login
        await resetAttempts();

        toast({
          title: "Welcome back!",
          description: "Successfully signed in to your account",
        });
      }
    } catch (error: any) {
      toast({
        title: isSignUp ? "Sign up failed" : "Sign in failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner only during actual auth operations or user redirect
  if ((loading && user) || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">
            {user ? 'Redirecting...' : 'Signing you in...'}
          </p>
        </div>
      </div>
    );
  }

  // Show account locked screen
  if (isBlocked && timeRemaining > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Account Temporarily Locked</CardTitle>
            <CardDescription>
              Too many failed login attempts detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your account has been temporarily locked for security. Please try again in {Math.ceil(timeRemaining / 60)} minutes.
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Time remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We've sent a confirmation link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Click the link in your email to complete your registration and sign in.
              </AlertDescription>
            </Alert>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => {
                setEmailSent(false);
                setIsSignUp(false);
              }}
            >
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10 p-4">
      <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Smart Deduplication</CardTitle>
        <CardDescription>
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Security Warnings */}
        {attemptCount > 0 && !isBlocked && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {attemptCount >= 3 ? (
                "Multiple failed attempts detected. CAPTCHA verification required."
              ) : (
                `${5 - attemptCount} attempts remaining before account lockout.`
              )}
            </AlertDescription>
          </Alert>
        )}

        {captchaRequired && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-sm font-medium">Security Verification Required</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Please complete the CAPTCHA to continue
              </p>
            </div>
            <CaptchaWrapper
              onVerify={(token) => setCaptchaToken(token)}
              action={isSignUp ? 'signup' : 'login'}
              className="flex justify-center"
            />
          </div>
        )}

          <Tabs value={isSignUp ? 'signup' : 'signin'} onValueChange={(value) => setIsSignUp(value === 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {/* Password strength indicator */}
                  {password && (
                    <div className="space-y-2 text-xs">
                      <div className="space-y-1">
                        <div className={`flex items-center gap-2 ${passwordValidation.requirements.length ? 'text-green-600' : 'text-red-500'}`}>
                          {passwordValidation.requirements.length ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          At least 12 characters
                        </div>
                        <div className={`flex items-center gap-2 ${passwordValidation.requirements.uppercase ? 'text-green-600' : 'text-red-500'}`}>
                          {passwordValidation.requirements.uppercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          At least one uppercase letter
                        </div>
                        <div className={`flex items-center gap-2 ${passwordValidation.requirements.lowercase ? 'text-green-600' : 'text-red-500'}`}>
                          {passwordValidation.requirements.lowercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          At least one lowercase letter
                        </div>
                        <div className={`flex items-center gap-2 ${passwordValidation.requirements.number ? 'text-green-600' : 'text-red-500'}`}>
                          {passwordValidation.requirements.number ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          At least one number
                        </div>
                        <div className={`flex items-center gap-2 ${passwordValidation.requirements.symbol ? 'text-green-600' : 'text-red-500'}`}>
                          {passwordValidation.requirements.symbol ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          At least one symbol
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !passwordValidation.isValid || password !== confirmPassword}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}