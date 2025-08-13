import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SecurityEvent {
  action: string;
  resource?: string;
  success?: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface RateLimitCheck {
  action_type: string;
  max_attempts?: number;
  window_minutes?: number;
}

export function useSecurity() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkRateLimit = useCallback(async (params: RateLimitCheck): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('security-manager', {
        body: {
          action: 'check_rate_limit',
          data: params
        }
      });

      if (error) throw error;
      
      return data?.allowed || false;
    } catch (error: any) {
      console.error('Rate limit check failed:', error);
      toast({
        title: "Security Check Failed",
        description: "Unable to verify rate limits. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const logSecurityEvent = useCallback(async (event: SecurityEvent): Promise<void> => {
    try {
      const { error } = await supabase.functions.invoke('security-manager', {
        body: {
          action: 'log_security_event',
          data: event
        }
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Security logging failed:', error);
      // Don't show toast for logging failures to avoid spam
    }
  }, []);

  const assignRole = useCallback(async (userId: string, role: 'admin' | 'user'): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('security-manager', {
        body: {
          action: 'assign_role',
          data: { user_id: userId, role }
        }
      });

      if (error) throw error;
      
      toast({
        title: "Role Assigned",
        description: `User role updated to ${role}`,
      });
      
      return true;
    } catch (error: any) {
      console.error('Role assignment failed:', error);
      toast({
        title: "Role Assignment Failed",
        description: error.message || "Unable to assign role. Check permissions.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getAuditLogs = useCallback(async (limit = 100) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('security-manager', {
        body: {
          action: 'get_audit_logs',
          data: { limit }
        }
      });

      if (error) throw error;
      
      return data?.logs || [];
    } catch (error: any) {
      console.error('Audit logs fetch failed:', error);
      toast({
        title: "Audit Logs Failed",
        description: "Unable to fetch security logs. Check permissions.",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    checkRateLimit,
    logSecurityEvent,
    assignRole,
    getAuditLogs
  };
}