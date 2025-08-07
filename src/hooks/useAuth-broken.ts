import { supabase } from '@/integrations/supabase/client';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  session_timeout_minutes: number;
  last_activity: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
}

const SESSION_TIMEOUT_DEFAULT = 30; // minutes

export function useAuth(): AuthState & {
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshSession: () => Promise<void>;
  checkSessionTimeout: () => boolean;
} {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Check if we're in demo mode
  const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || 
    import.meta.env.VITE_SUPABASE_URL.includes('your-project') || 
    import.meta.env.VITE_SUPABASE_URL.includes('demo-project');

  // Load user profile
  const loadUserProfile = useCallback(async (userId: string) => {
    if (isDemoMode) {
      setProfile({
        id: userId,
        email: 'demo@example.com',
        full_name: 'Demo User',
        avatar_url: null,
        role: 'user',
        session_timeout_minutes: 30,
        last_activity: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      // Map database profile to our UserProfile interface
      const profileData = data as any;
      const mappedProfile: UserProfile = {
        id: profileData.id,
        email: profileData.email,
        full_name: profileData.full_name || null,
        avatar_url: profileData.avatar_url || null,
        role: profileData.role || 'user',
        session_timeout_minutes: profileData.session_timeout_minutes || 30,
        last_activity: profileData.last_activity || new Date().toISOString(),
        created_at: profileData.created_at || new Date().toISOString(),
        updated_at: profileData.updated_at || new Date().toISOString(),
      };

      setProfile(mappedProfile);
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    }
  }, []);

  // Check session timeout
  const checkSessionTimeout = useCallback(() => {
    const now = Date.now();
    const timeoutMs = (profile?.session_timeout_minutes || SESSION_TIMEOUT_DEFAULT) * 60 * 1000;
    const isExpired = now - lastActivity > timeoutMs;
    
    if (isExpired && user) {
      console.log('Session expired due to inactivity');
      toast.info('Session expired due to inactivity. Please sign in again.');
      signOut();
      return true;
    }
    return false;
  }, [lastActivity, profile?.session_timeout_minutes, user]);

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    
    // Update last_activity in database every 5 minutes
    if (user && !isDemoMode && now - lastActivity > 5 * 60 * 1000) {
      supabase
        .from('profiles')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.warn('Failed to update last activity:', error);
        });
    }
  }, [user, isDemoMode, lastActivity]);
  }, []);

  // Check for session timeout
  const checkSessionTimeout = useCallback(() => {
    if (!profile) return false;

    const timeoutMinutes = profile.session_timeout_minutes || SESSION_TIMEOUT_DEFAULT;
    const inactiveTime = Date.now() - lastActivity;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    return inactiveTime > timeoutMs;
  }, [profile, lastActivity]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // In demo mode, simulate a logged-in user
        if (isDemoMode) {
          const demoUser = {
            id: 'demo-user-id',
            email: 'demo@example.com',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: { full_name: 'Demo User' },
            aud: 'authenticated',
            role: 'authenticated',
            updated_at: new Date().toISOString(),
          } as unknown as User;

          if (mounted) {
            setUser(demoUser);
            setLoading(false);
            await loadUserProfile(demoUser.id);
          }
          return;
        }

        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          return;
        }

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          if (initialSession?.user) {
            await loadUserProfile(initialSession.user.id);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);

        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user.id);
          updateActivity();
          toast.success('Successfully signed in!');
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          toast.info('Signed out successfully');
        } else if (event === 'TOKEN_REFRESHED') {
          updateActivity();
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile, updateActivity]);

  // Monitor user activity and session timeout
  useEffect(() => {
    if (!user || !profile) return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => {
      updateActivity();

      // Occasionally update database
      if (Math.random() < 0.01) { // 1% chance to avoid too many requests
        supabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() } as any)
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.error('Error updating last activity:', error);
          });
      }
    };

    // Add activity listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Check for timeout periodically
    const timeoutInterval = setInterval(() => {
      if (checkSessionTimeout()) {
        toast.warning('Session expired due to inactivity');
        signOut();
      }
    }, 60000); // Check every minute

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(timeoutInterval);
    };
  }, [user, profile, checkSessionTimeout, updateActivity]);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (!error) {
        toast.success('Check your email for the confirmation link!');
      }

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();

      // Clear local state
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Update local state
      if (profile) {
        setProfile({ ...profile, ...updates });
      }

      toast.success('Profile updated successfully!');
      return { error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { error: new Error(errorMsg) };
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Error refreshing session:', error);
        return;
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        updateActivity();
      }
    } catch (error) {
      console.error('Error in refreshSession:', error);
    }
  };

  const isAdmin = profile?.role === 'admin';

  return {
    // State
    user,
    profile,
    session,
    loading,
    isAdmin,

    // Actions
    signInWithEmail,
    signInWithGoogle,
    signUp,
    signOut,
    updateProfile,
    refreshSession,
    checkSessionTimeout,
  };
}