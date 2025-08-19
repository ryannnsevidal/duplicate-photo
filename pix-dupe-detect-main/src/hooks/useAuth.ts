import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useSimpleSessionSecurity } from '@/hooks/useSimpleSessionSecurity';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const { toast } = useToast();
  const { initializeSessionSecurity } = useSimpleSessionSecurity();
  
  // Use refs to prevent infinite re-renders
  const initialized = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    // Prevent multiple initializations using ref instead of global
    if (initialized.current) return;
    initialized.current = true;
    
    console.log('🔧 Setting up auth state listener (one-time initialization)...');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return; // Prevent updates after unmount
        
        console.log('🔄 Auth state change:', event, session?.user?.email);
        
        // Synchronous state updates only - this is critical for performance
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setInitializing(false);
        
        // Defer any async operations to avoid blocking the auth state
        if (session?.user?.id && event === 'SIGNED_IN') {
          // Skip session security init during E2E tests
          if (!import.meta.env.VITE_E2E) {
            setTimeout(async () => {
              try {
                console.log('🔐 Secure connection established for user:', session.user.id);
                await initializeSessionSecurity(session.user.id);
              } catch (error) {
                console.warn('Session security init error (non-blocking):', error);
                // Don't fail the sign-in process for security init errors
              }
            }, 1000); // Reduced delay to 1 second
          }
        }
      }
    );

    // Check for existing session AFTER setting up listener with timeout
    const checkSession = async () => {
      if (!mountedRef.current) return;
      
      try {
        console.log('🔍 Checking for existing session...');
        
        // Add timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        
        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (!mountedRef.current) return; // Double-check mount status
        
        if (error) {
          console.error('❌ Session check error:', error);
          // Only show error toast if not already shown
          if (!sessionStorage.getItem('session_error_shown')) {
            sessionStorage.setItem('session_error_shown', 'true');
            toast({
              title: "Session Error",
              description: "There was an issue with your session. Please sign in again.",
              variant: "destructive",
            });
          }
          setSession(null);
          setUser(null);
          setLoading(false);
          setInitializing(false);
        } else if (!session) {
          // No session found - user needs to log in
          console.log('⚠️ No active session found - user needs to authenticate');
          setSession(null);
          setUser(null);
          setLoading(false);
          setInitializing(false);
          console.log('🔓 Loading set to false - should show signin page');
        } else {
          // Valid session found
          console.log('✅ Valid session found, restoring user state for:', session.user.email);
          setSession(session);
          setUser(session.user);
          setLoading(false);
          setInitializing(false);
          
          // Initialize session security for existing session (non-blocking)
          if (!import.meta.env.VITE_E2E) {
            setTimeout(async () => {
              if (session.user?.id) {
                try {
                  console.log('🔐 Secure connection established for user:', session.user.id);
                  await initializeSessionSecurity(session.user.id);
                } catch (error) {
                  console.warn('Session security init error (non-blocking):', error);
                }
              }
            }, 1000); // Reduced delay to 1 second
          }
        }
      } catch (error) {
        console.error('❌ Session check exception:', error);
        // Fallback to unauthenticated state
        setSession(null);
        setUser(null);
        setLoading(false);
        setInitializing(false);
      }
    };

    // Start session check immediately
    checkSession();

    // Cleanup function
    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
    };
  }, [toast, initializeSessionSecurity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      console.log('🔄 Initiating Google OAuth...');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Allow selecting account instead of consent
          }
        }
      });
      
      if (error) {
        console.error('❌ Google OAuth error:', error);
        setLoading(false);
        toast({
          title: "Google Sign In Failed", 
          description: error.message || "Unable to connect to Google. Please try again.",
          variant: "destructive",
        });
        return { error };
      }
      
      console.log('✅ Google OAuth initiated successfully');
      return { error: null };
    } catch (error: any) {
      console.error('❌ Unexpected Google OAuth error:', error);
      setLoading(false);
      toast({
        title: "Google Sign In Failed",
        description: "Unable to sign in with Google. Please try again or use email.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔄 Signing in with email...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Email sign in error:', error);
        setLoading(false);
        return { error };
      }
      
      console.log('✅ Email sign in successful');
      toast({
        title: "Welcome Back",
        description: `Successfully signed in as ${email}`,
      });
      return { data, error: null };
    } catch (error: any) {
      console.error('❌ Unexpected email sign in error:', error);
      setLoading(false);
      return { error };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔄 Signing up with email...');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        console.error('❌ Email sign up error:', error);
        setLoading(false);
        return { error };
      }
      
      console.log('✅ Email sign up successful');
      toast({
        title: "Account Created",
        description: "Please check your email to verify your account.",
      });
      return { data, error: null };
    } catch (error: any) {
      console.error('❌ Unexpected email sign up error:', error);
      setLoading(false);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        toast({
          title: "Sign Out Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }
      
      // Clear session state immediately
      setSession(null);
      setUser(null);
      
      // Clear session storage to prevent redirect loops and security conflicts
      sessionStorage.removeItem('admin_redirected');
      sessionStorage.removeItem('session_security_initialized');
      sessionStorage.removeItem('session_error_shown');
      sessionStorage.removeItem('session_refresh_attempted');
      sessionStorage.removeItem('last_session_validation');
      
      // Clear auth callback redirects for all users
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('auth_callback_redirected_')) {
          sessionStorage.removeItem(key);
        }
      });
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Unexpected sign out error:', error);
      toast({
        title: "Sign Out Failed",
        description: "An unexpected error occurred during sign out.",
        variant: "destructive",
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Check if session is expired
  const isSessionExpired = () => {
    if (!session || !session.expires_at) return true;
    return Date.now() > session.expires_at * 1000;
  };

  // Force session refresh
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Manual session refresh failed:', error);
      toast({
        title: "Session Refresh Failed",
        description: "Please sign in again.",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  return {
    user,
    session,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    isSessionExpired,
    refreshSession
  };
}