import { useEffect, useState } from 'react';

interface SecureConfigScriptProps {
  recaptchaSiteKey?: string;
}

/**
 * Enhanced secure configuration script with nonce-based CSP and advanced security headers
 */
export function SecureConfigScript({ recaptchaSiteKey }: SecureConfigScriptProps) {
  const [nonce, setNonce] = useState<string>('');

  useEffect(() => {
    // Generate cryptographically secure nonce
    const generateNonce = () => {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    };

    const currentNonce = generateNonce();
    setNonce(currentNonce);

    // Set up secure global configuration
    if (process.env.NODE_ENV === 'production' && recaptchaSiteKey) {
      (window as any).__RECAPTCHA_SITE_KEY__ = recaptchaSiteKey;
    }

    // Enhanced Content Security Policy with nonce support
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    
    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${currentNonce}' https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://accounts.google.com https://apis.google.com https://www.dropbox.com`,
      `style-src 'self' 'unsafe-inline' 'nonce-${currentNonce}' https://fonts.googleapis.com`,
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://api.ipify.org https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://apis.google.com https://api.dropboxapi.com https://content.dropboxapi.com",
      "frame-src 'self' https://www.google.com https://accounts.google.com https://www.dropbox.com",
      "frame-ancestors 'self' https://*.lovable.app http://localhost:3000",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
      "block-all-mixed-content"
    ];

    // Add report-uri for CSP violations in production
    if (process.env.NODE_ENV === 'production') {
      cspDirectives.push("report-uri /api/csp-violation-report");
    }

    cspMeta.content = cspDirectives.join('; ');
    
    // Only add if not already present
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      document.head.appendChild(cspMeta);
    }

    // Enhanced security headers
    const securityHeaders = [
      { name: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { name: 'X-Content-Type-Options', value: 'nosniff' },
      { name: 'X-XSS-Protection', value: '1; mode=block' },
      { name: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { name: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' }
    ];

    securityHeaders.forEach(({ name, value }) => {
      if (!document.querySelector(`meta[http-equiv="${name}"]`)) {
        const meta = document.createElement('meta');
        meta.httpEquiv = name;
        meta.content = value;
        document.head.appendChild(meta);
      }
    });

    // Set nonce attribute for inline scripts and styles
    const inlineScripts = document.querySelectorAll('script:not([src])');
    inlineScripts.forEach(script => {
      script.setAttribute('nonce', currentNonce);
    });

    const inlineStyles = document.querySelectorAll('style');
    inlineStyles.forEach(style => {
      style.setAttribute('nonce', currentNonce);
    });

    // Enhanced security monitoring
    const securityObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Monitor for suspicious script additions
              if (element.tagName === 'SCRIPT' && !element.hasAttribute('nonce')) {
                console.warn('Unauthorized script element detected:', element);
                // Log security event
                fetch('/api/security-alert', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'unauthorized_script',
                    element: element.outerHTML,
                    timestamp: new Date().toISOString()
                  })
                }).catch(console.error);
              }
            }
          });
        }
      });
    });

    // Start monitoring DOM for security threats
    securityObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'href', 'onclick', 'onload']
    });

    // Cleanup function
    return () => {
      securityObserver.disconnect();
    };
  }, [recaptchaSiteKey]);

  return null; // This component doesn't render anything
}