import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReCAPTCHA from 'react-google-recaptcha';

interface CaptchaVerificationProps {
  onVerified: (token: string) => void;
  action: string;
  required?: boolean;
}

export function CaptchaVerification({ onVerified, action, required = false }: CaptchaVerificationProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCaptchaChange = (token: string | null) => {
    if (token) {
      setCaptchaToken(token);
      setIsVerified(true);
      onVerified(token);
      toast({
        title: "Verification complete",
        description: "CAPTCHA verified successfully",
      });
    } else {
      setCaptchaToken(null);
      setIsVerified(false);
    }
  };

  // Get reCAPTCHA site key from environment or use test key in development
  const siteKey = process.env.NODE_ENV === 'production' 
    ? (window as any).__RECAPTCHA_SITE_KEY__ 
    : "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"; // Test key for development only

  if (!required) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {isVerified ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-orange-600" />
          )}
          Security Verification
        </CardTitle>
        <CardDescription>
          Complete the verification to continue with {action}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <ReCAPTCHA
          sitekey={siteKey}
          onChange={handleCaptchaChange}
          theme="light"
        />
        {isVerified && (
          <div className="text-sm text-green-600 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Verification successful
          </div>
        )}
      </CardContent>
    </Card>
  );
}