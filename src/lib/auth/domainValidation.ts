import { supabase } from '@/integrations/supabase/client';

export interface DomainValidationResult {
  isAllowed: boolean;
  domain: string;
  reason?: string;
  blockType?: string;
}

/**
 * Validates if an email domain is allowed for registration
 * @param email - The email address to validate
 * @returns Promise<DomainValidationResult>
 */
export async function validateEmailDomain(email: string): Promise<DomainValidationResult> {
  try {
    // Extract domain from email
    const domain = email.toLowerCase().split('@')[1];
    
    if (!domain) {
      return {
        isAllowed: false,
        domain: '',
        reason: 'Invalid email format',
      };
    }

    // Check if domain is blocked using the database function
    const { data: isAllowed, error } = await supabase
      .rpc('is_email_domain_allowed', { _email: email });

    if (error) {
      console.error('Error checking domain:', error);
      // If there's an error, allow the registration (fail open)
      return {
        isAllowed: true,
        domain,
      };
    }

    // If domain is blocked, get the block details
    if (!isAllowed) {
      const { data: blockDetails, error: blockError } = await supabase
        .from('blocked_email_domains')
        .select('reason, block_type')
        .eq('domain', domain)
        .single();

      return {
        isAllowed: false,
        domain,
        reason: blockError ? 'Domain is blocked' : blockDetails?.reason || 'Domain is blocked',
        blockType: blockError ? undefined : blockDetails?.block_type,
      };
    }

    return {
      isAllowed: true,
      domain,
    };
  } catch (error) {
    console.error('Unexpected error in domain validation:', error);
    // Fail open - allow registration if validation fails
    return {
      isAllowed: true,
      domain: email.split('@')[1] || '',
    };
  }
}

/**
 * Enhanced signup function with domain validation
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise with signup result
 */
export async function signUpWithDomainCheck(email: string, password: string) {
  // Validate domain first
  const domainValidation = await validateEmailDomain(email);
  
  if (!domainValidation.isAllowed) {
    throw new Error(
      domainValidation.reason || 
      `Registration is not allowed for ${domainValidation.domain} domains`
    );
  }

  // If domain is allowed, proceed with signup
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
    },
  });

  if (error) {
    throw error;
  }

  // Log successful domain validation
  if (data.user) {
    try {
      await supabase.rpc('log_security_event', {
        _action: 'domain_validation_passed',
        _resource: 'user_registration',
        _success: true,
        _metadata: { 
          domain: domainValidation.domain,
          email: email,
        },
      });
    } catch (logError) {
      // Don't fail signup if logging fails
      console.warn('Failed to log domain validation event:', logError);
    }
  }

  return { data, error };
}