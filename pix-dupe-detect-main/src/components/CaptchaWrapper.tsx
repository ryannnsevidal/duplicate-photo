import React, { useCallback, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

interface CaptchaWrapperProps {
  onVerify: (token: string | null) => void;
  action?: string;
  size?: 'compact' | 'normal' | 'invisible';
  theme?: 'light' | 'dark';
  className?: string;
}

// reCAPTCHA v2 Site Key - Secure configuration
// Get from: https://www.google.com/recaptcha/admin/create
// Choose "Invisible reCAPTCHA v2" for best UX
const RECAPTCHA_SITE_KEY = process.env.NODE_ENV === 'production' 
  ? (window as any).__RECAPTCHA_SITE_KEY__ // Set by secure script in production
  : '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Test key for development only

// Security check - prevent deployment with test key in production
const hasValidKey = RECAPTCHA_SITE_KEY && 
  RECAPTCHA_SITE_KEY !== '' && 
  (process.env.NODE_ENV !== 'production' || RECAPTCHA_SITE_KEY !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI');

export function CaptchaWrapper({ 
  onVerify, 
  action = 'submit',
  size = 'normal',
  theme = 'light',
  className = ''
}: CaptchaWrapperProps) {
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleVerify = useCallback((token: string | null) => {
    console.log('reCAPTCHA token received:', token ? 'Valid' : 'Invalid');
    onVerify(token);
  }, [onVerify]);

  const handleExpired = useCallback(() => {
    console.log('reCAPTCHA expired');
    onVerify(null);
  }, [onVerify]);

  const handleError = useCallback(() => {
    console.error('reCAPTCHA error occurred');
    onVerify(null);
  }, [onVerify]);

  // Don't render if no valid key
  if (!hasValidKey) {
    console.warn('reCAPTCHA site key not configured - widget disabled');
    return (
      <div className={`flex justify-center items-center p-4 text-muted-foreground ${className}`}>
        <span className="text-sm">Security verification unavailable</span>
      </div>
    );
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={RECAPTCHA_SITE_KEY}
        onChange={handleVerify}
        onExpired={handleExpired}
        onError={handleError}
        size={size}
        theme={theme}
        data-action={action}
      />
    </div>
  );
}

export default CaptchaWrapper;