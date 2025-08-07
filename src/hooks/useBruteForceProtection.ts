import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BruteForceState {
  isBlocked: boolean;
  attemptCount: number;
  blockUntil: Date | null;
  timeRemaining: number;
}

export function useBruteForceProtection() {
  const [state, setState] = useState<BruteForceState>({
    isBlocked: false,
    attemptCount: 0,
    blockUntil: null,
    timeRemaining: 0
  });
  const { toast } = useToast();

  // Get client IP address (simplified - in production use proper IP detection)
  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Failed to get IP:', error);
      return '0.0.0.0';
    }
  };

  // Check IP reputation status
  const checkIPStatus = async () => {
    try {
      const ip = await getClientIP();
      
      const { data, error } = await supabase
        .from('ip_reputation')
        .select('*')
        .eq('ip_address', ip)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        console.error('IP check error:', error);
        return;
      }

      if (data) {
        const now = new Date();
        const blockedUntil = data.blocked_until ? new Date(data.blocked_until) : null;
        
        if (blockedUntil && now < blockedUntil) {
          const timeRemaining = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000);
          
          setState({
            isBlocked: true,
            attemptCount: data.abuse_count || 0,
            blockUntil: blockedUntil,
            timeRemaining
          });

          toast({
            title: "Account Temporarily Locked",
            description: `Too many failed attempts. Try again in ${Math.ceil(timeRemaining / 60)} minutes.`,
            variant: "destructive",
          });
        } else {
          setState({
            isBlocked: false,
            attemptCount: data.abuse_count || 0,
            blockUntil: null,
            timeRemaining: 0
          });
        }
      }
    } catch (error) {
      console.error('Brute force check failed:', error);
    }
  };

  // Record failed login attempt
  const recordFailedAttempt = async () => {
    try {
      const ip = await getClientIP();
      
      // Call edge function to handle brute force logic
      const { data, error } = await supabase.functions.invoke('enhanced-security-manager', {
        body: {
          action: 'record_failed_attempt',
          ip_address: ip,
          user_agent: navigator.userAgent
        }
      });

      if (error) {
        console.error('Failed to record attempt:', error);
        return;
      }

      // Check if IP got blocked
      if (data?.blocked) {
        setState(prev => ({
          ...prev,
          isBlocked: true,
          attemptCount: data.attempt_count,
          blockUntil: new Date(data.blocked_until),
          timeRemaining: data.time_remaining
        }));

        toast({
          title: "Account Locked",
          description: `Too many failed attempts. Account locked for 6 hours.`,
          variant: "destructive",
        });
      } else {
        setState(prev => ({
          ...prev,
          attemptCount: data?.attempt_count || prev.attemptCount + 1
        }));

        if (data?.attempt_count >= 3) {
          toast({
            title: "Warning",
            description: `${5 - data.attempt_count} attempts remaining before account lockout.`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Failed to record failed attempt:', error);
    }
  };

  // Reset attempts on successful login
  const resetAttempts = async () => {
    try {
      const ip = await getClientIP();
      
      await supabase.functions.invoke('enhanced-security-manager', {
        body: {
          action: 'reset_attempts',
          ip_address: ip
        }
      });

      setState({
        isBlocked: false,
        attemptCount: 0,
        blockUntil: null,
        timeRemaining: 0
      });
    } catch (error) {
      console.error('Failed to reset attempts:', error);
    }
  };

  // Timer for blocked state
  useEffect(() => {
    if (state.isBlocked && state.timeRemaining > 0) {
      const timer = setInterval(() => {
        setState(prev => {
          const newTimeRemaining = prev.timeRemaining - 1;
          
          if (newTimeRemaining <= 0) {
            return {
              ...prev,
              isBlocked: false,
              timeRemaining: 0,
              blockUntil: null
            };
          }
          
          return {
            ...prev,
            timeRemaining: newTimeRemaining
          };
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [state.isBlocked, state.timeRemaining]);

  // Check IP status on mount
  useEffect(() => {
    checkIPStatus();
  }, []);

  return {
    isBlocked: state.isBlocked,
    attemptCount: state.attemptCount,
    timeRemaining: state.timeRemaining,
    recordFailedAttempt,
    resetAttempts,
    checkIPStatus
  };
}