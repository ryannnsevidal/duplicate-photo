import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LogOut, User, Shield } from 'lucide-react';
import { LandingPage } from '@/pages/LandingPage';
import { UploadPage } from '@/pages/UploadPage';
import { ResultsPage } from '@/pages/ResultsPage';
import { SignInPage } from '@/pages/SignInPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { TestUploadPage } from '@/pages/TestUploadPage';
import { TestResultsPage } from '@/pages/TestResultsPage';
import { FileUploadPage } from '@/pages/FileUploadPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { AdminPanel } from '@/pages/AdminPanel';
import { EnhancedAdminPanel } from '@/pages/EnhancedAdminPanel';
import { AdminHome } from '@/pages/AdminHome';
import { AdminAuditPanel } from '@/pages/AdminAuditPanel';
import { SessionsPage } from '@/pages/admin/SessionsPage';
import NotFound from '@/pages/NotFound';
import HealthCheck from '@/pages/HealthCheck';
import { useAuth } from '@/hooks/useAuth';
import { useSecurity } from '@/hooks/useSecurity';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useNavigate } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';

interface UploadResponse {
  duplicates: Array<{
    filename: string;
    score: number;
  }>;
  best?: {
    filename: string;
    score: number;
  };
}

// Simplified admin route checker without render loops
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        setIsAdmin(!!data && !error);
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      }
    };

    checkAdminRole();
  }, [user?.id]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function AppRouter() {
  const { user, session, loading, signOut, checkSessionTimeout } = useAuth();
  const { logSecurityEvent } = useSecurity();
  const [results, setResults] = useState<UploadResponse | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Timeout fallback to prevent infinite loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('⏰ Loading timeout reached, forcing auth resolution');
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  // Check for session expiration on route changes - but only if session exists
  useEffect(() => {
    if (user && session && checkSessionTimeout()) {
      console.warn('Session expired, redirecting to sign in');
      signOut();
    }
  }, [user, session, checkSessionTimeout, signOut]);

  // Check admin role for authenticated users (only once per user)
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        const hasAdminRole = !!data && !error;
        setIsAdmin(hasAdminRole);
        
        // Auto-redirect admin users to admin dashboard ONLY from homepage and ONLY once per session
        const redirectKey = `admin_redirected_${user.id}`;
        if (hasAdminRole && location.pathname === '/' && !sessionStorage.getItem(redirectKey)) {
          console.log('✅ Admin role confirmed for user:', user.email);
          console.log('🎯 Redirecting admin user to admin dashboard (one-time per session)');
          sessionStorage.setItem(redirectKey, 'true');
          navigate('/admin/dashboard');
          toast({
            title: "Welcome Admin",
            description: `Signed in as ${user.email}`,
          });
        } else if (hasAdminRole) {
          console.log('✅ Admin role confirmed, staying on current page');
        } else {
          console.log('ℹ️ Regular user confirmed for:', user.email);
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      }
    };

    checkAdminRole();
  }, [user?.id, location.pathname, navigate, toast, user?.email]);

  // Log user session events for security monitoring
  useEffect(() => {
    if (user) {
      logSecurityEvent({
        action: 'user_session_started',
        resource: 'app_router',
        success: true,
        metadata: { user_id: user.id, email: user.email }
      });
    }
  }, [user, logSecurityEvent]);

  const handleSignOut = async () => {
    await signOut();
    setResults(null);
    // Redirect to sign in page after successful logout
    window.location.href = '/signin';
  };

  const handleResults = (uploadResults: UploadResponse) => {
    setResults(uploadResults);
  };

  const handleReset = () => {
    setResults(null);
  };

  if (loading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying your session...</p>
          <p className="text-xs text-muted-foreground/60">This may take a moment after OAuth login</p>
        </motion.div>
      </div>
    );
  }

  // If loading timeout reached, treat as unauthenticated
  if (loadingTimeout) {
    console.warn('⚠️ Loading timeout reached, treating as unauthenticated');
  }

  // Routes for unauthenticated users (including timeout case)
  if (!user || loadingTimeout) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/health" element={<HealthCheck />} />
        <Route path="/logout" element={<Navigate to="/signin" replace />} />
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-blue-600 rounded-lg"></div>
              <h1 className="text-xl font-bold">Smart Deduplication</h1>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user.email}</span>
              </div>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => window.location.href = '/admin'}>
                  <Shield className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={
            <AnimatePresence mode="wait">
              {results ? (
                <ResultsPage key="results" results={results} onReset={handleReset} />
              ) : (
                <DashboardPage key="dashboard" />
              )}
            </AnimatePresence>
          } />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminHome />
            </AdminRoute>
          } />
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/admin/panel" element={
            <AdminRoute>
              <AdminAuditPanel />
            </AdminRoute>
          } />
          <Route path="/admin/enhanced" element={
            <AdminRoute>
              <EnhancedAdminPanel />
            </AdminRoute>
          } />
          <Route path="/admin/sessions" element={
            <AdminRoute>
              <SessionsPage />
            </AdminRoute>
          } />
          <Route path="/health" element={<HealthCheck />} />
          <Route path="/logout" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}