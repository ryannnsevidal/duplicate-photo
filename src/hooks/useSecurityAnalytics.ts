import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityMetrics {
  total_threats_blocked: number;
  active_sessions: number;
  failed_login_attempts: number;
  suspicious_activities: number;
  mfa_enabled_users: number;
  last_updated: string;
}

interface ThreatTimeline {
  timestamp: string;
  threat_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  user_id?: string;
  ip_address?: string;
  status: 'blocked' | 'monitored' | 'resolved';
}

interface SecurityInsights {
  top_threat_types: { type: string; count: number }[];
  geographic_threats: { country: string; count: number }[];
  hourly_activity: { hour: number; threats: number }[];
  security_score: number;
}

export function useSecurityAnalytics() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [timeline, setTimeline] = useState<ThreatTimeline[]>([]);
  const [insights, setInsights] = useState<SecurityInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch security metrics
  const fetchSecurityMetrics = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('advanced-security-manager', {
        body: {
          action: 'get_security_metrics'
        }
      });

      if (error) throw error;
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch security metrics:', error);
    }
  }, []);

  // Fetch threat timeline
  const fetchThreatTimeline = useCallback(async (limit = 50) => {
    try {
      const { data, error } = await supabase.functions.invoke('advanced-security-manager', {
        body: {
          action: 'get_threat_timeline',
          data: { limit }
        }
      });

      if (error) throw error;
      setTimeline(data);
    } catch (error) {
      console.error('Failed to fetch threat timeline:', error);
    }
  }, []);

  // Fetch security insights
  const fetchSecurityInsights = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('advanced-security-manager', {
        body: {
          action: 'get_security_insights'
        }
      });

      if (error) throw error;
      setInsights(data);
    } catch (error) {
      console.error('Failed to fetch security insights:', error);
    }
  }, []);

  // Refresh all analytics data
  const refreshAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSecurityMetrics(),
        fetchThreatTimeline(),
        fetchSecurityInsights()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchSecurityMetrics, fetchThreatTimeline, fetchSecurityInsights]);

  // Auto-refresh analytics
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshAnalytics, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, refreshAnalytics]);

  // Initial data load
  useEffect(() => {
    refreshAnalytics();
  }, [refreshAnalytics]);

  return {
    metrics,
    timeline,
    insights,
    loading,
    autoRefresh,
    setAutoRefresh,
    refreshAnalytics,
    fetchSecurityMetrics,
    fetchThreatTimeline,
    fetchSecurityInsights
  };
}