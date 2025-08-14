import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

export function SignInPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const redirected = useRef(false);
  const E2E = import.meta.env.VITE_E2E_TEST_MODE === '1' || import.meta.env.VITE_E2E_TEST_MODE === 'true';

  useEffect(() => {
    if (redirected.current || loading || !user) return;
    
    const checkRoleAndRedirect = async () => {
      redirected.current = true;
      
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        if (data?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Role check error:', error);
        navigate('/');
      }
    };

    checkRoleAndRedirect();
  }, [user, loading, navigate]);

  const handleAuthSuccess = () => {};

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4" data-testid="auth-loading">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        {E2E && (
          <div className="text-center text-xs text-muted-foreground" data-testid="e2e-banner">
            E2E Test Mode
          </div>
        )}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to access your dashboard</p>
        </div>
        
        <AuthForm onAuthSuccess={handleAuthSuccess} />
        
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full mt-4" 
            onClick={handleGoogleSignIn}
            data-testid="google-oauth-btn"
          >
            Continue with Google
          </Button>
        </div>
      </motion.div>
    </div>
  );
}