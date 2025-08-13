import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';
import { CaptchaWrapper } from './CaptchaWrapper';

interface SecureAuthFormProps {
  onAuthSuccess: () => void;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
}

export function SecureAuthForm({ onAuthSuccess }: SecureAuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [securityLevel, setSecurityLevel] = useState(1);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [], color: 'red' });
  
  const { toast } = useToast();
  const { 
    checkEnhancedRateLimit, 
    validateEmailDomain, 
    isHighRiskAction,
    getSecurityLevel 
  } = useEnhancedSecurity();

  // Password strength validation
  const validatePasswordStrength = useCallback((pass: string): PasswordStrength => {
    let score = 0;
    const feedback: string[] = [];
    
    if (pass.length >= 8) score += 1;
    else feedback.push('At least 8 characters');
    
    if (/[A-Z]/.test(pass)) score += 1;
    else feedback.push('At least one uppercase letter');
    
    if (/[a-z]/.test(pass)) score += 1;
    else feedback.push('At least one lowercase letter');
    
    if (/\d/.test(pass)) score += 1;
    else feedback.push('At least one number');
    
    if (/[^A-Za-z\d]/.test(pass)) score += 1;
    else feedback.push('At least one special character');
    
    const colors = ['red', 'red', 'orange', 'yellow', 'green'];
    const color = colors[score] || 'red';
    
    return { score, feedback, color };
  }, []);

  useEffect(() => {
    if (password) {
      setPasswordStrength(validatePasswordStrength(password));
    }
  }, [password, validatePasswordStrength]);

  const checkSecurityRequirements = useCallback(async (action: string) => {
    const userAgent = navigator.userAgent;
    const isHighRisk = isHighRiskAction(action, userAgent);
    const currentSecurityLevel = getSecurityLevel(action, userAgent);
    
    setSecurityLevel(currentSecurityLevel);
    
    // Check rate limits
    const rateLimitResult = await checkEnhancedRateLimit({
      action_type: action,
      max_attempts: isHighRisk ? 3 : 5,
      window_minutes: 60,
      severity_level: currentSecurityLevel
    });
    
    if (!rateLimitResult || (typeof rateLimitResult === 'object' && !rateLimitResult.allowed)) {
      setRequiresCaptcha(true);
      return false;
    }
    
    // Require CAPTCHA for high-risk actions or high security levels
    if (isHighRisk || currentSecurityLevel >= 3) {
      setRequiresCaptcha(true);
    }
    
    return true;
  }, [checkEnhancedRateLimit, isHighRiskAction, getSecurityLevel]);

  const handleCaptchaChange = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  const validateInputs = useCallback(async () => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }

    // Domain validation for sign-up
    if (isSignUp) {
      const isDomainAllowed = await validateEmailDomain(email);
      if (!isDomainAllowed) {
        return false; // Toast already shown in hook
      }
    }

    // Password validation for sign-up
    if (isSignUp) {
      if (passwordStrength.score < 3) {
        toast({
          title: "Weak Password",
          description: "Please choose a stronger password",
          variant: "destructive",
        });
        return false;
      }

      if (password !== confirmPassword) {
        toast({
          title: "Passwords Don't Match",
          description: "Please ensure both passwords are identical",
          variant: "destructive",
        });
        return false;
      }
    }

    // CAPTCHA validation when required
    if (requiresCaptcha && !captchaToken) {
      toast({
        title: "CAPTCHA Required",
        description: "Please complete the CAPTCHA verification",
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [email, password, confirmPassword, isSignUp, passwordStrength, requiresCaptcha, captchaToken, validateEmailDomain, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    const action = isSignUp ? 'signup' : 'signin';
    
    // Check security requirements
    const securityCheckPassed = await checkSecurityRequirements(action);
    if (!securityCheckPassed) {
      toast({
        title: "Security Check Failed",
        description: "Please complete the security verification",
        variant: "destructive",
      });
      return;
    }
    
    // Validate inputs
    const inputsValid = await validateInputs();
    if (!inputsValid) return;
    
    setLoading(true);
    
    try {
      if (isSignUp) {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });
        
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: "Account Exists",
              description: "This email is already registered. Try signing in instead.",
              variant: "destructive",
            });
            setIsSignUp(false);
          } else {
            throw error;
          }
        } else {
          toast({
            title: "Account Created",
            description: "Please check your email to verify your account.",
          });
          onAuthSuccess();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        });
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: "Invalid Credentials",
              description: "Please check your email and password.",
              variant: "destructive",
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: "Welcome back!",
            description: "You have been successfully signed in.",
          });
          onAuthSuccess();
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        title: "Authentication Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSecurityLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'text-green-600';
      case 2: return 'text-yellow-600';
      case 3: return 'text-orange-600';
      case 4: return 'text-red-600';
      case 5: return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  const getSecurityLevelText = (level: number) => {
    switch (level) {
      case 1: return 'Standard Security';
      case 2: return 'Enhanced Security';
      case 3: return 'High Security';
      case 4: return 'Maximum Security';
      case 5: return 'Critical Security';
      default: return 'Unknown';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Shield className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
        </div>
        <CardDescription className="text-center">
          {isSignUp ? 'Sign up for a secure account' : 'Sign in to your account'}
        </CardDescription>
        
        {/* Security Level Indicator */}
        <div className="flex items-center justify-center space-x-2 p-2 bg-muted rounded-md">
          <Shield className={`h-4 w-4 ${getSecurityLevelColor(securityLevel)}`} />
          <span className={`text-sm font-medium ${getSecurityLevelColor(securityLevel)}`}>
            {getSecurityLevelText(securityLevel)}
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full"
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
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className="w-full pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Password Strength Indicator */}
            {isSignUp && password && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 bg-${passwordStrength.color}-500`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium text-${passwordStrength.color}-600`}>
                    {passwordStrength.score}/5
                  </span>
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {passwordStrength.feedback.map((item, index) => (
                      <li key={index} className="flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full"
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600 flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Passwords do not match</span>
                </p>
              )}
            </div>
          )}
          
          {/* CAPTCHA when required */}
          {requiresCaptcha && (
            <div className="space-y-2">
              <Label>Security Verification</Label>
              <CaptchaWrapper
                onVerify={handleCaptchaChange}
                action={isSignUp ? 'signup' : 'signin'}
                className="flex justify-center"
              />
            </div>
          )}
          
          <Button
            type="submit"
            className="w-full"
            disabled={loading || (requiresCaptcha && !captchaToken)}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </Button>
          
          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setPassword('');
                setConfirmPassword('');
                setCaptchaToken(null);
                setRequiresCaptcha(false);
              }}
              className="text-sm"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </Button>
          </div>
        </form>
        
        {/* Security Notice */}
        <Alert className="mt-4">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Your connection is secured with industry-standard encryption and advanced threat protection.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default SecureAuthForm;