import { useCallback } from 'react';
import { z, ZodSchema } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Input validation schemas
const schemas = {
  email: z.string().email('Invalid email format').max(254, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number, and special character'),
  filename: z.string()
    .max(255, 'Filename too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid characters in filename'),
  text: z.string().max(10000, 'Text too long'),
  url: z.string().url('Invalid URL format').max(2048, 'URL too long'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscore, and dash')
};

interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: string;
  errors?: string[];
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface InputSecurityMetrics {
  xssAttempts: number;
  sqlInjectionAttempts: number;
  suspiciousPatterns: number;
  rateLimit: number;
}

export function useAdvancedInputValidation() {
  const { toast } = useToast();

  // XSS detection patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /data:text\/html/gi,
    /expression\s*\(/gi,
    /@import/gi,
    /behavior\s*:/gi
  ];

  // SQL injection detection patterns
  const sqlInjectionPatterns = [
    /(\bunion\b.*\bselect\b)/gi,
    /(\bdrop\b.*\btable\b)/gi,
    /(\bdelete\b.*\bfrom\b)/gi,
    /(\binsert\b.*\binto\b)/gi,
    /(\bupdate\b.*\bset\b)/gi,
    /(\bexec\b.*\()/gi,
    /(\bexecute\b.*\()/gi,
    /('.*'.*=.*'.*')/gi,
    /(--)/gi,
    /(\b(or|and)\b.*\b(like|=)\b.*('|"))/gi
  ];

  // Advanced sanitization function
  const sanitizeInput = useCallback((input: string, type: keyof typeof schemas): string => {
    if (!input) return '';

    let sanitized = input.trim();

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/\x00/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Type-specific sanitization
    switch (type) {
      case 'email':
        // Basic email sanitization
        sanitized = sanitized.toLowerCase();
        break;
      
      case 'filename':
        // Remove path traversal attempts
        sanitized = sanitized.replace(/\.\./g, '').replace(/[\/\\]/g, '');
        break;
      
      case 'text':
        // Enhanced HTML entity encoding
        sanitized = sanitized
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
        break;
      
      case 'url':
        // URL validation and protocol restriction
        try {
          const url = new URL(sanitized);
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Invalid protocol');
          }
          sanitized = url.toString();
        } catch {
          sanitized = '';
        }
        break;
    }

    return sanitized;
  }, []);

  // Security pattern detection
  const detectSecurityPatterns = useCallback((input: string): InputSecurityMetrics => {
    const metrics: InputSecurityMetrics = {
      xssAttempts: 0,
      sqlInjectionAttempts: 0,
      suspiciousPatterns: 0,
      rateLimit: 0
    };

    // Detect XSS attempts
    xssPatterns.forEach(pattern => {
      const matches = input.match(pattern);
      if (matches) {
        metrics.xssAttempts += matches.length;
      }
    });

    // Detect SQL injection attempts
    sqlInjectionPatterns.forEach(pattern => {
      const matches = input.match(pattern);
      if (matches) {
        metrics.sqlInjectionAttempts += matches.length;
      }
    });

    // Detect other suspicious patterns
    const suspiciousPatterns = [
      /\beval\s*\(/gi,
      /\bFunction\s*\(/gi,
      /\bsetTimeout\s*\(/gi,
      /\bsetInterval\s*\(/gi,
      /document\.(write|cookie)/gi,
      /window\.(location|open)/gi,
      /%[0-9a-f]{2}/gi, // URL encoding
      /\\x[0-9a-f]{2}/gi, // Hex encoding
      /\\u[0-9a-f]{4}/gi, // Unicode encoding
    ];

    suspiciousPatterns.forEach(pattern => {
      const matches = input.match(pattern);
      if (matches) {
        metrics.suspiciousPatterns += matches.length;
      }
    });

    return metrics;
  }, []);

  // Validate input with advanced security checks
  const validateInput = useCallback(async (
    input: string,
    type: keyof typeof schemas,
    context?: string
  ): Promise<ValidationResult> => {
    try {
      // Basic schema validation
      const schema = schemas[type];
      const result = schema.safeParse(input);

      if (!result.success) {
        return {
          isValid: false,
          errors: result.error.issues.map(issue => issue.message),
          securityLevel: 'low'
        };
      }

      // Security pattern detection
      const securityMetrics = detectSecurityPatterns(input);
      
      // Determine security level
      let securityLevel: ValidationResult['securityLevel'] = 'low';
      
      if (securityMetrics.xssAttempts > 0 || securityMetrics.sqlInjectionAttempts > 0) {
        securityLevel = 'critical';
      } else if (securityMetrics.suspiciousPatterns > 2) {
        securityLevel = 'high';
      } else if (securityMetrics.suspiciousPatterns > 0) {
        securityLevel = 'medium';
      }

      // Log security events for medium+ threats
      if (securityLevel !== 'low') {
        await supabase.functions.invoke('enhanced-security-manager', {
          body: {
            action: 'log_security_event',
            data: {
              action: 'suspicious_input_detected',
              metadata: {
                input_type: type,
                context,
                security_level: securityLevel,
                metrics: securityMetrics,
                input_length: input.length,
                timestamp: new Date().toISOString()
              }
            }
          }
        });
      }

      // Rate limiting for suspicious inputs
      if (securityLevel === 'critical') {
        await supabase.functions.invoke('enhanced-security-manager', {
          body: {
            action: 'check_enhanced_rate_limit',
            data: {
              action_type: 'suspicious_input',
              severity_level: 5,
              max_attempts: 3,
              window_minutes: 60
            }
          }
        });

        toast({
          title: "Security Alert",
          description: "Suspicious input detected. Your activity is being monitored.",
          variant: "destructive",
        });
      }

      // Sanitize the input
      const sanitizedValue = sanitizeInput(input, type);

      return {
        isValid: true,
        sanitizedValue,
        securityLevel
      };

    } catch (error) {
      console.error('Input validation error:', error);
      return {
        isValid: false,
        errors: ['Validation error occurred'],
        securityLevel: 'high'
      };
    }
  }, [sanitizeInput, detectSecurityPatterns, toast]);

  // Batch validate multiple inputs
  const validateBatch = useCallback(async (
    inputs: { value: string; type: keyof typeof schemas; context?: string }[]
  ): Promise<ValidationResult[]> => {
    const results = await Promise.all(
      inputs.map(({ value, type, context }) => validateInput(value, type, context))
    );
    
    return results;
  }, [validateInput]);

  // Real-time input sanitization for forms
  const createSanitizedChangeHandler = useCallback((
    type: keyof typeof schemas,
    onChange: (value: string) => void
  ) => {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const sanitized = sanitizeInput(event.target.value, type);
      onChange(sanitized);
    };
  }, [sanitizeInput]);

  return {
    validateInput,
    validateBatch,
    sanitizeInput,
    createSanitizedChangeHandler,
    schemas
  };
}