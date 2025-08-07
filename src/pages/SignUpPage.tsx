import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdvancedInputValidation } from '@/hooks/useAdvancedInputValidation';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';
import { CaptchaWrapper } from '@/components/CaptchaWrapper';

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
}

export function SignUpPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    color: 'bg-gray-200'
  });
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { validateInput } = useAdvancedInputValidation();
  const { validateEmailDomain, checkEnhancedRateLimit } = useEnhancedSecurity();

  const validatePasswordStrength = (password: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score++;
    else feedback.push("At least 8 characters");

    if (/[a-z]/.test(password)) score++;
    else feedback.push("One lowercase letter");

    if (/[A-Z]/.test(password)) score++;
    else feedback.push("One uppercase letter");

    if (/\d/.test(password)) score++;
    else feedback.push("One number");

    if (/[@$!%*?&]/.test(password)) score++;
    else feedback.push("One special character (@$!%*?&)");

    const colors = [
      'bg-red-500',
      'bg-red-400',
      'bg-yellow-500',
      'bg-yellow-400',
      'bg-green-400',
      'bg-green-500'
    ];

    return {
      score,
      feedback,
      color: colors[score] || 'bg-gray-200'
    };
  };

  const handlePasswordChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, password: value }));
    
    const strength = validatePasswordStrength(value);
    setPasswordStrength(strength);
    
    // Validate password
    if (value) {
      await validateInput(value, 'password', 'signup_password');
    }
  };

  const handleEmailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, email: value }));
    
    // Validate email and check domain
    if (value && value.includes('@')) {
      const emailValidation = await validateInput(value, 'email', 'signup_email');
      if (emailValidation.isValid) {
        const domainCheck = await validateEmailDomain(value);
        if (!domainCheck) {
          toast({
            title: "Email Domain Blocked",
            description: "This email domain is not allowed for registration.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      
      // Check rate limits first
      const rateLimitCheck = await checkEnhancedRateLimit({
        action_type: 'google_signup',
        max_attempts: 3,
        window_minutes: 60
      });
      
      if (!rateLimitCheck) {
        toast({
          title: "Rate Limit Exceeded",
          description: "Too many signup attempts. Please try again later.",
          variant: "destructive",
        });
        return;
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) throw error;
      
    } catch (error: any) {
      toast({
        title: "Google Sign Up Failed",
        description: error.message || "Unable to sign up with Google.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limits
    const rateLimitCheck = await checkEnhancedRateLimit({
      action_type: 'email_signup',
      max_attempts: 5,
      window_minutes: 60
    });
    
    if (!rateLimitCheck) {
      setRequiresCaptcha(true);
      toast({
        title: "Rate Limit Exceeded",
        description: "Too many signup attempts. Please complete CAPTCHA.",
        variant: "destructive",
      });
      return;
    }

    // Validate all inputs
    const emailValidation = await validateInput(formData.email, 'email', 'signup_email');
    const passwordValidation = await validateInput(formData.password, 'password', 'signup_password');
    const firstNameValidation = await validateInput(formData.firstName, 'username', 'signup_firstname');
    const lastNameValidation = await validateInput(formData.lastName, 'username', 'signup_lastname');

    if (!emailValidation.isValid) {
      toast({
        title: "Invalid Email",
        description: emailValidation.errors?.[0] || "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (!passwordValidation.isValid) {
      toast({
        title: "Weak Password",
        description: passwordValidation.errors?.[0] || "Please create a stronger password.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    if (passwordStrength.score < 4) {
      toast({
        title: "Password Too Weak",
        description: "Please create a stronger password meeting all requirements.",
        variant: "destructive",
      });
      return;
    }

    // Check email domain
    const isDomainAllowed = await validateEmailDomain(formData.email);
    if (!isDomainAllowed) {
      toast({
        title: "Email Domain Not Allowed",
        description: "This email domain is blocked for registration.",
        variant: "destructive",
      });
      return;
    }

    // Check CAPTCHA if required
    if (requiresCaptcha && !captchaToken) {
      toast({
        title: "CAPTCHA Required",
        description: "Please complete the security verification.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email: emailValidation.sanitizedValue!,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstNameValidation.sanitizedValue,
            last_name: lastNameValidation.sanitizedValue,
            full_name: `${firstNameValidation.sanitizedValue} ${lastNameValidation.sanitizedValue}`.trim()
          }
        }
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: "Account Already Exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user && !data.session) {
        setEmailConfirmationSent(true);
        toast({
          title: "Account Created Successfully!",
          description: "Please check your email to confirm your account.",
        });
      } else if (data.session) {
        toast({
          title: "Welcome!",
          description: "Your account has been created successfully.",
        });
        navigate('/');
      }
      
    } catch (error: any) {
      toast({
        title: "Sign Up Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCaptchaVerify = (token: string | null) => {
    setCaptchaToken(token);
  };

  if (emailConfirmationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle className="text-green-600">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a confirmation link to {formData.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the link in your email to confirm your account and start using the platform.
            </p>
            <div className="space-y-2">
              <Button onClick={() => setEmailConfirmationSent(false)} variant="outline" className="w-full">
                Back to Sign Up
              </Button>
              <Link to="/signin">
                <Button variant="ghost" className="w-full">
                  Already confirmed? Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-primary to-blue-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Join us to start managing your files securely
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Button
            onClick={handleGoogleSignUp}
            variant="outline"
            className="w-full h-11"
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleEmailChange}
                placeholder="Enter your email"
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handlePasswordChange}
                  placeholder="Create a strong password"
                  required
                  disabled={loading}
                  className="h-11 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Progress value={(passwordStrength.score / 5) * 100} className="flex-1 h-2" />
                    <Badge variant={passwordStrength.score >= 4 ? "default" : "secondary"}>
                      {passwordStrength.score < 2 ? "Weak" : 
                       passwordStrength.score < 4 ? "Fair" : "Strong"}
                    </Badge>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Missing: {passwordStrength.feedback.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm your password"
                  required
                  disabled={loading}
                  className="h-11 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <XCircle className="h-3 w-3" />
                  Passwords don't match
                </div>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Passwords match
                </div>
              )}
            </div>

            {requiresCaptcha && (
              <div className="flex justify-center">
                <CaptchaWrapper
                  onVerify={handleCaptchaVerify}
                  action="signup"
                />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11" 
              disabled={loading || passwordStrength.score < 4 || (requiresCaptcha && !captchaToken)}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/signin" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}