import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EnhancedRateLimitCheck {
  action_type: string;
  max_attempts?: number;
  window_minutes?: number;
  severity_level?: number;
}

export interface IPReputationUpdate {
  ip_address?: string;
  score_delta: number;
  block_reason?: string;
}

export interface SessionTrackingData {
  country_code?: string;
  city?: string;
}

export interface CaptchaLog {
  action_type: 'signup' | 'signin' | 'recover';
  success: boolean;
}

export interface SecurityStats {
  total_logs: number;
  failed_logs: number;
  blocked_ips: number;
  active_sessions: number;
  recent_violations: any[];
}

export function useEnhancedSecurity() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callSecurityAPI = useCallback(async (action: string, data: any) => {
    try {
      setLoading(true);
      
      const { data: result, error } = await supabase.functions.invoke('enhanced-security-manager', {
        body: { action, data }
      });

      if (error) throw error;
      return result;
    } catch (error: any) {
      console.error(`Security API call failed (${action}):`, error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkIPReputation = useCallback(async (ipAddress?: string) => {
    try {
      return await callSecurityAPI('check_ip_reputation', { ip_address: ipAddress });
    } catch (error: any) {
      console.error('IP reputation check failed:', error);
      return { score: 100, blocked: false, abuse_count: 0 };
    }
  }, [callSecurityAPI]);

  const updateIPReputation = useCallback(async (data: IPReputationUpdate) => {
    try {
      return await callSecurityAPI('update_ip_reputation', data);
    } catch (error: any) {
      toast({
        title: "IP Reputation Update Failed",
        description: error.message || "Unable to update IP reputation",
        variant: "destructive",
      });
      return false;
    }
  }, [callSecurityAPI, toast]);

  const checkEnhancedRateLimit = useCallback(async (params: EnhancedRateLimitCheck) => {
    try {
      const result = await callSecurityAPI('check_enhanced_rate_limit', params);
      
      if (!result.allowed && result.captcha_required) {
        toast({
          title: "Security Check Required",
          description: "Please complete the security verification to continue.",
          variant: "destructive",
        });
      } else if (!result.allowed) {
        toast({
          title: "Rate Limit Exceeded",
          description: `Please wait ${Math.round(result.retry_after_seconds / 60)} minutes before trying again.`,
          variant: "destructive",
        });
      }
      
      return result;
    } catch (error: any) {
      console.error('Enhanced rate limit check failed:', error);
      return { allowed: false, captcha_required: true, severity_level: 5 };
    }
  }, [callSecurityAPI, toast]);

  const validateEmailDomain = useCallback(async (email: string) => {
    try {
      const result = await callSecurityAPI('validate_email_domain', { email });
      
      if (!result.allowed) {
        toast({
          title: "Email Domain Blocked",
          description: "This email domain is not allowed. Please use a different email address.",
          variant: "destructive",
        });
      }
      
      return result.allowed;
    } catch (error: any) {
      console.error('Email domain validation failed:', error);
      // Fail open for better user experience
      return true;
    }
  }, [callSecurityAPI, toast]);

  const trackUserSession = useCallback(async (data: SessionTrackingData = {}) => {
    try {
      return await callSecurityAPI('track_session', data);
    } catch (error: any) {
      console.error('Session tracking failed:', error);
      return null;
    }
  }, [callSecurityAPI]);

  const logCaptchaAttempt = useCallback(async (data: CaptchaLog) => {
    try {
      return await callSecurityAPI('log_captcha', data);
    } catch (error: any) {
      console.error('Captcha logging failed:', error);
      return false;
    }
  }, [callSecurityAPI]);

  const getSecurityStats = useCallback(async (): Promise<SecurityStats | null> => {
    try {
      return await callSecurityAPI('get_security_stats', {});
    } catch (error: any) {
      toast({
        title: "Security Stats Failed",
        description: "Unable to fetch security statistics. Check permissions.",
        variant: "destructive",
      });
      return null;
    }
  }, [callSecurityAPI, toast]);

  // Advanced security utilities
  const isHighRiskAction = useCallback((action: string, userAgent?: string) => {
    const highRiskActions = ['upload', 'delete', 'admin_action'];
    const suspiciousAgents = ['bot', 'crawler', 'scraper'];
    
    const isRiskyAction = highRiskActions.some(risky => action.includes(risky));
    const isSuspiciousAgent = userAgent && suspiciousAgents.some(
      suspicious => userAgent.toLowerCase().includes(suspicious)
    );
    
    return isRiskyAction || isSuspiciousAgent;
  }, []);

  const getSecurityLevel = useCallback((action: string, userAgent?: string) => {
    if (isHighRiskAction(action, userAgent)) return 4;
    if (action.includes('auth') || action.includes('login')) return 3;
    if (action.includes('upload') || action.includes('modify')) return 2;
    return 1;
  }, [isHighRiskAction]);

  return {
    loading,
    checkIPReputation,
    updateIPReputation,
    checkEnhancedRateLimit,
    validateEmailDomain,
    trackUserSession,
    logCaptchaAttempt,
    getSecurityStats,
    isHighRiskAction,
    getSecurityLevel
  };
}