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
      // Demo profiles based on user ID
      if (userId === 'admin-demo-id') {
        setProfile({
          id: userId,
          email: 'admin@example.com',
          full_name: 'Admin Demo',
          avatar_url: null,
          role: 'admin',
          session_timeout_minutes: 30,
          last_activity: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
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
      }
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
  }, [isDemoMode]);

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

  // Check session timeout
  const checkSessionTimeout = useCallback(() => {
    if (!user || isDemoMode) return false;
    
    const now = Date.now();
    const timeoutMs = (profile?.session_timeout_minutes || SESSION_TIMEOUT_DEFAULT) * 60 * 1000;
    const isExpired = now - lastActivity > timeoutMs;
    
    if (isExpired) {
      console.log('Session expired due to inactivity');
      toast.info('Session expired due to inactivity. Please sign in again.');
      signOut();
      return true;
    }
    return false;
  }, [user, isDemoMode, profile?.session_timeout_minutes, lastActivity]);

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

    return () => {
      mounted = false;
    };
  }, [isDemoMode, loadUserProfile]);

  // Listen for auth changes
  useEffect(() => {
    if (isDemoMode) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadUserProfile(session.user.id);
          updateActivity();
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [isDemoMode, loadUserProfile, updateActivity]);

  // Activity tracking
  useEffect(() => {
    if (!user || isDemoMode) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Check for session timeout every minute
    const timeoutInterval = setInterval(() => {
      checkSessionTimeout();
    }, 60 * 1000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearInterval(timeoutInterval);
    };
  }, [user, isDemoMode, updateActivity, checkSessionTimeout]);

  // Auth actions
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (isDemoMode) {
      // Demo mode authentication
      if (email === 'demo@example.com' && password === 'demo123') {
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

        setUser(demoUser);
        await loadUserProfile(demoUser.id);
        updateActivity();
        toast.success('Demo mode: Signed in successfully');
        return { error: null };
      } else if (email === 'admin@example.com' && password === 'admin123') {
        const adminUser = {
          id: 'admin-demo-id',
          email: 'admin@example.com',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: { full_name: 'Admin Demo' },
          aud: 'authenticated',
          role: 'authenticated',
          updated_at: new Date().toISOString(),
        } as unknown as User;

        setUser(adminUser);
        await loadUserProfile(adminUser.id);
        updateActivity();
        toast.success('Demo mode: Admin signed in successfully');
        return { error: null };
      } else {
        toast.error('Demo mode: Use demo@example.com/demo123 or admin@example.com/admin123');
        return { error: { message: 'Invalid demo credentials' } as AuthError };
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      updateActivity();
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as AuthError };
    }
  }, [isDemoMode, updateActivity, loadUserProfile]);

  const signInWithGoogle = useCallback(async () => {
    if (isDemoMode) {
      toast.info('Demo mode: Google sign-in would redirect to OAuth flow');
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('Google sign in error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { error: error as AuthError };
    }
  }, [isDemoMode]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (isDemoMode) {
      toast.success('Demo mode: Account created successfully');
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        return { error };
      }

      if (data.user && !data.session) {
        toast.info('Please check your email to confirm your account.');
      }

      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as AuthError };
    }
  }, [isDemoMode]);

  const signOut = useCallback(async () => {
    if (isDemoMode) {
      setUser(null);
      setProfile(null);
      setSession(null);
      toast.success('Demo mode: Signed out successfully');
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        return;
      }

      // Clear local state
      setUser(null);
      setProfile(null);
      setSession(null);
      setLastActivity(0);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [isDemoMode]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user || isDemoMode) {
      return { error: new Error('Demo mode: Profile updates not available') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Profile update error:', error);
        return { error: new Error(error.message) };
      }

      // Reload profile
      await loadUserProfile(user.id);
      return { error: null };
    } catch (error) {
      console.error('Profile update error:', error);
      return { error: error as Error };
    }
  }, [user, isDemoMode, loadUserProfile]);

  const refreshSession = useCallback(async () => {
    if (isDemoMode) return;

    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error);
      } else {
        updateActivity();
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  }, [isDemoMode, updateActivity]);

  // Determine if user is admin
  const isAdmin = profile?.role === 'admin';

  return {
    user,
    profile,
    session,
    loading,
    isAdmin,
    signInWithEmail,
    signInWithGoogle,
    signUp,
    signOut,
    updateProfile,
    refreshSession,
    checkSessionTimeout,
  };
}
