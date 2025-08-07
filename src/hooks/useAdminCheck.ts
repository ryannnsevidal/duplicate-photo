import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useAdminCheck() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Checking admin role for user:', user.email);
        
        // Check if user has admin role
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned, which is ok
          console.error('❌ Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          const hasAdminRole = !!data;
          console.log(hasAdminRole ? '✅ Admin role confirmed' : '⚠️ No admin role found');
          setIsAdmin(hasAdminRole);
          
          // Also log for debugging
          if (!hasAdminRole && user.email === 'rsevidal117@gmail.com') {
            console.warn('⚠️ rsevidal117@gmail.com does not have admin role - check database');
          }
        }
      } catch (error) {
        console.error('❌ Unexpected error checking admin role:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [user?.id, user?.email]); // Include email for debugging

  return { isAdmin, loading };
}