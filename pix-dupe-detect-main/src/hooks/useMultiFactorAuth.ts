import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MFASetup {
  qr_code: string;
  secret: string;
  recovery_codes: string[];
}

interface MFAStatus {
  enabled: boolean;
  last_used?: string;
  backup_codes_remaining: number;
}

export function useMultiFactorAuth() {
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Check MFA status
  const checkMFAStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('advanced-security-manager', {
        body: {
          action: 'get_mfa_status'
        }
      });

      if (error) throw error;
      setMfaStatus(data);
    } catch (error: any) {
      console.error('Failed to check MFA status:', error);
    }
  }, []);

  // Setup MFA
  const setupMFA = useCallback(async (): Promise<MFASetup | null> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('advanced-security-manager', {
        body: {
          action: 'setup_mfa'
        }
      });

      if (error) throw error;
      
      toast({
        title: "MFA Setup Initiated",
        description: "Scan the QR code with your authenticator app.",
      });

      return data;
    } catch (error: any) {
      console.error('MFA setup failed:', error);
      toast({
        title: "MFA Setup Failed",
        description: error.message || "Could not setup multi-factor authentication.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Verify MFA setup
  const verifyMFASetup = useCallback(async (token: string, secret: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('advanced-security-manager', {
        body: {
          action: 'verify_mfa_setup',
          data: { token, secret }
        }
      });

      if (error) throw error;
      
      if (data.success) {
        await checkMFAStatus();
        toast({
          title: "MFA Enabled Successfully",
          description: "Two-factor authentication is now active for your account.",
        });
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('MFA verification failed:', error);
      toast({
        title: "MFA Verification Failed",
        description: "Invalid verification code. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [checkMFAStatus, toast]);

  // Verify MFA token during login
  const verifyMFAToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('advanced-security-manager', {
        body: {
          action: 'verify_mfa_token',
          data: { token }
        }
      });

      if (error) throw error;
      return data.valid;
    } catch (error: any) {
      console.error('MFA token verification failed:', error);
      return false;
    }
  }, []);

  // Disable MFA
  const disableMFA = useCallback(async (password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('advanced-security-manager', {
        body: {
          action: 'disable_mfa',
          data: { password }
        }
      });

      if (error) throw error;
      
      if (data.success) {
        await checkMFAStatus();
        toast({
          title: "MFA Disabled",
          description: "Two-factor authentication has been disabled.",
        });
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('MFA disable failed:', error);
      toast({
        title: "MFA Disable Failed",
        description: error.message || "Could not disable MFA.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [checkMFAStatus, toast]);

  // Generate backup codes
  const generateBackupCodes = useCallback(async (): Promise<string[] | null> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('advanced-security-manager', {
        body: {
          action: 'generate_backup_codes'
        }
      });

      if (error) throw error;
      
      toast({
        title: "Backup Codes Generated",
        description: "Save these codes in a secure location.",
      });

      return data.codes;
    } catch (error: any) {
      console.error('Backup codes generation failed:', error);
      toast({
        title: "Backup Codes Failed",
        description: "Could not generate backup codes.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    checkMFAStatus();
  }, [checkMFAStatus]);

  return {
    mfaStatus,
    loading,
    setupMFA,
    verifyMFASetup,
    verifyMFAToken,
    disableMFA,
    generateBackupCodes,
    checkMFAStatus
  };
}