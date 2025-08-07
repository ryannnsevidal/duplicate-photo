import React, { useEffect, useContext, createContext, ReactNode } from 'react';
import { useMonitoring } from '@/hooks/useMonitoring';

interface SecurityContextType {
  sanitizeHtml: (html: string) => string;
  validateInput: (input: string, maxLength?: number) => string;
  isSecureContext: boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const { trackSecurityAction } = useMonitoring();

  useEffect(() => {
    // Detect if running in Lovable preview iframe
    const isLovablePreview = window.top !== window.self && 
      (document.referrer.includes('.lovable.app') || 
       window.location.hostname === 'localhost');

    // Set Content Security Policy headers via meta tags
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://www.google-analytics.com",
      "frame-src 'self' https://www.google.com",
      "frame-ancestors 'self' https://*.lovable.app http://localhost:3000",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
    
    // Only add if not already present
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      document.head.appendChild(cspMeta);
    }

    // Add X-Frame-Options protection (conditional for Lovable)
    if (!isLovablePreview) {
      const frameMeta = document.createElement('meta');
      frameMeta.httpEquiv = 'X-Frame-Options';
      frameMeta.content = 'SAMEORIGIN';
      
      if (!document.querySelector('meta[http-equiv="X-Frame-Options"]')) {
        document.head.appendChild(frameMeta);
      }
    }

    // Add X-Content-Type-Options protection
    const noSniffMeta = document.createElement('meta');
    noSniffMeta.httpEquiv = 'X-Content-Type-Options';
    noSniffMeta.content = 'nosniff';
    
    if (!document.querySelector('meta[http-equiv="X-Content-Type-Options"]')) {
      document.head.appendChild(noSniffMeta);
    }

    // Monitor for potential XSS attempts
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('script') || message.includes('eval') || message.includes('javascript:')) {
        trackSecurityAction('potential_xss_attempt', false, {
          message,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, [trackSecurityAction]);

  const sanitizeHtml = (html: string): string => {
    // Basic HTML sanitization - remove script tags and dangerous attributes
    return html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '');
  };

  const validateInput = (input: string, maxLength: number = 1000): string => {
    if (!input) return '';
    
    // Trim whitespace
    let sanitized = input.trim();
    
    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    // Remove potentially dangerous characters
    sanitized = sanitized
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/data:text\/html/gi, ''); // Remove data:text/html
    
    return sanitized;
  };

  const isSecureContext = window.isSecureContext || window.location.protocol === 'https:';

  const securityContext: SecurityContextType = {
    sanitizeHtml,
    validateInput,
    isSecureContext
  };

  return (
    <SecurityContext.Provider value={securityContext}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity(): SecurityContextType {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}

export default SecurityProvider;