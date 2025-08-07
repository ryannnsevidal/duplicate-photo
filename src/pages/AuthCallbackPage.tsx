import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (loading) return; // Wait for auth to finish loading
      
      // Check for any error in URL params (common OAuth issue)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('error')) {
        console.error('OAuth error in URL:', urlParams.get('error_description') || urlParams.get('error'));
        toast({
          title: "Sign In Failed",
          description: urlParams.get('error_description') || "Authentication failed. Please try again.",
          variant: "destructive",
        });
        navigate('/signin', { replace: true });
        return;
      }
      
      if (!user) {
        // Try to get session one more time before giving up
        console.log('No user found, checking session...');
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error || !session?.user) {
            console.error('No valid session found after OAuth callback');
            toast({
              title: "Authentication Error",
              description: "Failed to complete sign in. Please try again.",
              variant: "destructive",
            });
            navigate('/signin', { replace: true });
            return;
          }
          // If we got a session but user state hasn't updated yet, wait a bit
          setTimeout(() => handleAuthCallback(), 500);
          return;
        } catch (error) {
          console.error('Session check failed:', error);
          navigate('/signin', { replace: true });
          return;
        }
      }

      try {
        console.log('✅ OAuth callback successful for:', user.email);
        
        // Check if user is admin
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        const isAdmin = !!data && !error;
        
        // Prevent multiple redirects with a more robust check
        const redirectKey = `auth_callback_redirected_${user.id}`;
        const redirectTime = sessionStorage.getItem(redirectKey);
        const now = Date.now();
        
        if (redirectTime && (now - parseInt(redirectTime)) < 30000) {
          // Recently redirected within 30 seconds, avoid loop
          console.log('🔄 Recent redirect detected, avoiding loop');
          return;
        }
        
        // Set redirect flag
        sessionStorage.setItem(redirectKey, now.toString());
        
        if (isAdmin) {
          console.log('🔄 Redirecting admin user to admin dashboard');
          toast({
            title: "Welcome Admin",
            description: `Signed in as ${user.email}`,
          });
          navigate('/admin/dashboard', { replace: true });
        } else {
          console.log('🔄 Redirecting regular user to dashboard');
          toast({
            title: "Welcome!",
            description: `Successfully signed in as ${user.email}`,
          });
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Error during auth callback:', error);
        toast({
          title: "Error",
          description: "Something went wrong. Please try signing in again.",
          variant: "destructive",
        });
        navigate('/signin', { replace: true });
      }
    };

    // Add a small delay to ensure auth state is properly set
    const timeoutId = setTimeout(handleAuthCallback, 100);
    return () => clearTimeout(timeoutId);
  }, [user, loading, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">
            Completing your sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">
          Redirecting...
        </p>
      </div>
    </div>
  );
}