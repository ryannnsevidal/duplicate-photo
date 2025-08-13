import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Environment variables with secure fallbacks for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gzveopdxovjlqpawgbzq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dmVvcGR4b3ZqbHFwYXdnYnpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMDI5MDEsImV4cCI6MjA2OTc3ODkwMX0.pWERxXxlHuIWKsan84zq3m_g7Fbw_jSuuokCj289K0w';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    flowType: 'pkce',
  }
});