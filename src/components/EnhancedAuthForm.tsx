import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';
import { useToast } from '@/hooks/use-toast';
import { CaptchaWrapper } from '@/components/CaptchaWrapper';
import { motion } from 'framer-motion';

interface EnhancedAuthFormProps {
  onAuthSuccess: () => void;
}

export function EnhancedAuthForm({ onAuthSuccess }: EnhancedAuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [securityLevel, setSecurityLevel] = useState(1);
  
  const { 
    checkEnhancedRateLimit, 
    validateEmailDomain, 
    logCaptchaAttempt,
    trackUserSession,
    getSecurityLevel,
    isHighRiskAction 
  } = useEnhancedSecurity();
  const { toast } = useToast();

  const handleCaptchaChange = useCallback((token: string | null) => {
    setCaptchaToken(token);
    if (token) {
      logCaptchaAttempt({
        action_type: isSignUp ? 'signup' : 'signin',
        success: true
      });
    }
  }, [isSignUp, logCaptchaAttempt]);

  const checkSecurityRequirements = async (action: 'signin' | 'signup') => {
    const userAgent = navigator.userAgent;
    const level = getSecurityLevel(action, userAgent);
    const isHighRisk = isHighRiskAction(action, userAgent);
    
    setSecurityLevel(level);

    // Check rate limits with enhanced security
    const rateLimitResult = await checkEnhancedRateLimit({
      action_type: action,
      max_attempts: action === 'signup' ? 3 : 5, // Stricter limits for signup
      window_minutes: 60,
      severity_level: level
    });

    if (!rateLimitResult.allowed) {
      if (rateLimitResult.captcha_required) {
        setRequiresCaptcha(true);
        toast({
          title: "Security Verification Required",
          description: "Please complete the security verification to continue.",
          variant: "destructive",
        });
      }
      return false;
    }

    // Require CAPTCHA for high-risk actions or high severity levels
    if (isHighRisk || level >= 3 || rateLimitResult.captcha_required) {
      setRequiresCaptcha(true);
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check security requirements
      const securityCheckPassed = await checkSecurityRequirements(isSignUp ? 'signup' : 'signin');
      if (!securityCheckPassed) {
        setLoading(false);
        return;
      }

      // Validate email domain for signup
      if (isSignUp) {
        const domainAllowed = await validateEmailDomain(email);
        if (!domainAllowed) {
          setLoading(false);
          return;
        }
      }

      // Require CAPTCHA for high-security actions
      if (requiresCaptcha && !captchaToken) {
        toast({
          title: "CAPTCHA Required",
          description: "Please complete the security verification.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      let result;
      
      if (isSignUp) {
        // Enhanced signup with email confirmation
        result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        
        if (result.error) throw result.error;
        
        if (result.data.user && !result.data.session) {
          toast({
            title: "Check your email",
            description: "We've sent you a confirmation link to complete your registration.",
          });
        } else {
          // Track user session if immediately logged in
          await trackUserSession();
          onAuthSuccess();
        }
      } else {
        // Enhanced signin
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (result.error) throw result.error;
        
        // Track successful session
        await trackUserSession();
        onAuthSuccess();
      }

      toast({
        title: isSignUp ? "Account created!" : "Welcome back!",
        description: isSignUp 
          ? "Please check your email for verification." 
          : "You have been signed in successfully.",
      });

    } catch (error: unknown) {
      console.error('Auth error:', error);
      
      // Log failed attempt for security monitoring
      await logCaptchaAttempt({
        action_type: isSignUp ? 'signup' : 'signin',
        success: false
      });

      let errorMessage = "An unexpected error occurred.";
      
      if (error instanceof Error) {
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. Please try again.";
        } else if (error.message.includes("Email rate limit exceeded")) {
          errorMessage = "Too many attempts. Please try again later.";
        } else if (error.message.includes("Password should be at least")) {
          errorMessage = "Password must be at least 6 characters long.";
        } else if (error.message.includes("User already registered")) {
          errorMessage = "An account with this email already exists.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Authentication failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setCaptchaToken(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    try {
      // Check security requirements for OAuth
      const securityCheckPassed = await checkSecurityRequirements('signin');
      if (!securityCheckPassed) {
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) throw error;
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to sign in with Google.";
      toast({
        title: "Google sign-in failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSecurityIndicator = () => {
    if (securityLevel <= 2) {
      return { icon: CheckCircle, color: 'text-green-500', text: 'Standard Security' };
    } else if (securityLevel <= 3) {
      return { icon: Shield, color: 'text-yellow-500', text: 'Enhanced Security' };
    } else {
      return { icon: AlertTriangle, color: 'text-red-500', text: 'High Security Mode' };
    }
  };

  const SecurityIndicator = getSecurityIndicator();

  return (
    <Card className="w-full shadow-elegant border-0 bg-card/80 backdrop-blur-sm relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary-variant/5 pointer-events-none"></div>
      
      <CardHeader className="text-center pb-8 relative z-10">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
          className="w-16 h-16 bg-gradient-to-br from-primary to-primary-variant rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-glow"
        >
          <Shield className="h-8 w-8 text-white" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CardTitle className="text-3xl font-bold mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-lg">
            {isSignUp 
              ? 'Join the secure deduplication platform' 
              : 'Access your secure dashboard'
            }
          </CardDescription>
        </motion.div>
        
        {/* Security Level Indicator */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2 mt-6 p-3 bg-gradient-to-r from-accent/50 to-primary/10 rounded-xl border border-primary/20"
        >
          <SecurityIndicator.icon className={`h-5 w-5 ${SecurityIndicator.color}`} />
          <span className="font-medium">{SecurityIndicator.text}</span>
        </motion.div>
      </CardHeader>
        
      <CardContent className="space-y-6 relative z-10">
        {/* Google Sign-In Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="outline"
            className="w-full h-12 text-base border-2 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
        </motion.div>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 text-muted-foreground font-medium">
              Or continue with email
            </span>
          </div>
        </div>

        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 border-2 focus:border-primary/50 transition-colors"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 border-2 focus:border-primary/50 transition-colors pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* CAPTCHA - Show when required */}
          {requiresCaptcha && (
            <div className="space-y-2">
              <Label>Security Verification</Label>
              <CaptchaWrapper
                onVerify={handleCaptchaChange}
                action={isSignUp ? 'signup' : 'signin'}
                theme="light"
              />
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Enhanced security verification is required for this action.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <Button
            type="submit"
            className="w-full h-12 text-base bg-gradient-to-r from-primary to-primary-variant hover:from-primary/90 hover:to-primary-variant/90 shadow-lg hover:shadow-xl transition-all duration-300"
            disabled={loading || (requiresCaptcha && !captchaToken)}
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </div>
            ) : (
              <span className="font-semibold">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </span>
            )}
          </Button>
        </motion.form>
        
        <div className="text-center">
          <Button
            variant="link"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setRequiresCaptcha(false);
              setCaptchaToken(null);
              setSecurityLevel(1);
            }}
            className="text-sm text-primary hover:text-primary-variant"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"
            }
          </Button>
        </div>

        {/* Security Notice */}
        <Alert className="bg-gradient-to-r from-primary/10 to-primary-variant/10 border-primary/20">
          <Shield className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm text-foreground/90">
            Your connection is secured with enterprise-grade encryption and monitoring.
            We protect against fraud, abuse, and unauthorized access.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}