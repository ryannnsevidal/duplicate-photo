import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SessionFingerprint {
  userAgent: string;
  language: string;
  timezone: string;
  screen: string;
  colorDepth: number;
  hardwareConcurrency: number;
}

interface SessionSecurity {
  sessionToken: string;
  fingerprint: SessionFingerprint;
  ipAddress?: string;
  deviceInfo: string;
  isVerified: boolean;
}

export function useAdvancedSessionSecurity() {
  const [sessionSecurity, setSessionSecurity] = useState<SessionSecurity | null>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Generate device fingerprint
  const generateFingerprint = useCallback((): SessionFingerprint => {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      hardwareConcurrency: navigator.hardwareConcurrency || 0
    };
  }, []);

  // Create secure session token
  const createSessionToken = useCallback(async (): Promise<string> => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }, []);

  // Initialize session security
  const initializeSessionSecurity = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      
      const fingerprint = generateFingerprint();
      const sessionToken = await createSessionToken();
      
      // Get client IP address
      let ipAddress: string | undefined;
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip;
      } catch (error) {
        console.warn('Could not fetch IP address:', error);
      }

      const deviceInfo = `${fingerprint.userAgent.split(' ')[0]} on ${navigator.platform}`;

      // Store session in database
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          ip_address: ipAddress,
          user_agent: fingerprint.userAgent,
          country_code: null, // Could be enriched with IP geolocation
          city: null,
          mfa_verified: false,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      const security: SessionSecurity = {
        sessionToken,
        fingerprint,
        ipAddress,
        deviceInfo,
        isVerified: true
      };

      setSessionSecurity(security);
      
      // Store fingerprint in localStorage for comparison
      localStorage.setItem('session_fingerprint', JSON.stringify(fingerprint));
      
      // Log security event
      await supabase.functions.invoke('enhanced-security-manager', {
        body: {
          action: 'track_user_session',
          data: {
            session_id: data.id,
            fingerprint,
            ip_address: ipAddress,
            device_info: deviceInfo
          }
        }
      });

      // Only show toast once per session
      const sessionKey = `session_security_${userId}`;
      const toastShown = sessionStorage.getItem(sessionKey);
      
      if (!toastShown) {
        sessionStorage.setItem(sessionKey, 'true');
        console.log('🔐 Secure connection established for user:', userId);
        toast({
          title: "Secure Session Established",
          description: "Your session has been secured with advanced protection.",
        });
      }

    } catch (error: any) {
      console.error('Session security initialization failed:', error);
      toast({
        title: "Session Security Warning",
        description: "Could not establish secure session. Some features may be limited.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [generateFingerprint, createSessionToken, toast]);

  // Validate session integrity
  const validateSessionIntegrity = useCallback(async (): Promise<boolean> => {
    if (!sessionSecurity) return false;

    try {
      const currentFingerprint = generateFingerprint();
      const storedFingerprint = JSON.parse(localStorage.getItem('session_fingerprint') || '{}');

      // Check for significant fingerprint changes
      const fingerprintChanged = 
        currentFingerprint.userAgent !== storedFingerprint.userAgent ||
        currentFingerprint.screen !== storedFingerprint.screen ||
        currentFingerprint.timezone !== storedFingerprint.timezone;

      if (fingerprintChanged) {
        console.warn('Session fingerprint changed - potential session hijacking');
        
        await supabase.functions.invoke('enhanced-security-manager', {
          body: {
            action: 'log_security_event',
            data: {
              action: 'session_fingerprint_mismatch',
              metadata: {
                current: currentFingerprint,
                stored: storedFingerprint,
                security_level: 'high'
              }
            }
          }
        });

        toast({
          title: "Session Security Alert",
          description: "Unusual session activity detected. Please re-authenticate.",
          variant: "destructive",
        });

        return false;
      }

      // Validate session token with server
      const { data, error } = await supabase.functions.invoke('enhanced-security-manager', {
        body: {
          action: 'validate_session',
          data: {
            session_token: sessionSecurity.sessionToken,
            fingerprint: currentFingerprint
          }
        }
      });

      if (error || !data?.valid) {
        console.warn('Session validation failed');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }, [sessionSecurity, generateFingerprint, toast]);

  // Get active sessions for user
  const getActiveSessions = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setActiveSessions(data || []);
    } catch (error: any) {
      console.error('Failed to fetch active sessions:', error);
      toast({
        title: "Session Error",
        description: "Could not load session information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Terminate specific session
  const terminateSession = useCallback(async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;

      setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
      
      toast({
        title: "Session Terminated",
        description: "The selected session has been terminated.",
      });
    } catch (error: any) {
      console.error('Failed to terminate session:', error);
      toast({
        title: "Termination Failed",
        description: "Could not terminate the session.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Terminate all other sessions
  const terminateAllOtherSessions = useCallback(async () => {
    if (!sessionSecurity) return;

    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .neq('session_token', sessionSecurity.sessionToken)
        .eq('is_active', true);

      if (error) throw error;

      await getActiveSessions();
      
      toast({
        title: "All Other Sessions Terminated",
        description: "All other active sessions have been terminated.",
      });
    } catch (error: any) {
      console.error('Failed to terminate sessions:', error);
      toast({
        title: "Termination Failed",
        description: "Could not terminate other sessions.",
        variant: "destructive",
      });
    }
  }, [sessionSecurity, getActiveSessions, toast]);

  // Monitor for suspicious activity
  useEffect(() => {
    if (!sessionSecurity) return;

    const interval = setInterval(async () => {
      const isValid = await validateSessionIntegrity();
      if (!isValid) {
        // Force logout on suspicious activity
        await supabase.auth.signOut();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [sessionSecurity, validateSessionIntegrity]);

  return {
    sessionSecurity,
    activeSessions,
    loading,
    initializeSessionSecurity,
    validateSessionIntegrity,
    getActiveSessions,
    terminateSession,
    terminateAllOtherSessions
  };
}