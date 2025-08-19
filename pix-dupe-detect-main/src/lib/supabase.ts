// supabase.ts — test-safe wrapper for UI
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const feature = import.meta.env.VITE_FEATURE_SUPABASE === 'true';
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: any; // Simplified type for mock compatibility

if (feature && typeof url === 'string' && url.startsWith('http') && typeof anon === 'string' && anon.length > 10) {
  console.log('🔗 Creating real Supabase client with URL:', url);
  try {
    client = createClient<Database>(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'X-Client-Info': 'pix-dupe-detect-ui'
        }
      }
    });
    
    // Test the connection immediately with timeout
    const connectionTest = Promise.race([
      client.auth.getSession(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]);
    
    connectionTest.then(({ data, error }) => {
      if (error) {
        console.warn('⚠️ Supabase connection test failed:', error.message);
      } else {
        console.log('✅ Supabase connection successful');
      }
    }).catch(err => {
      console.warn('⚠️ Supabase connection test timeout/error:', err.message);
      // Don't fail the app, just log the warning
    });
    
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    // Fall back to mock
    client = createMockClient();
  }
} else {
  console.log('🎭 Using mock Supabase client (feature:', feature, 'url:', url, 'anon length:', anon?.length);
  client = createMockClient();
}

function createMockClient() {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
      upsert: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
    auth: {
      getSession: () => {
        console.log('🔍 Mock getSession called - returning null session');
        return Promise.resolve({ data: { session: null }, error: null });
      },
      signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
      signUp: () => Promise.resolve({ data: { user: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: (callback: any) => {
        console.log('🔄 Mock onAuthStateChange called - triggering INITIAL_SESSION');
        // Immediately call the callback with no session to resolve loading state
        setTimeout(() => {
          callback('INITIAL_SESSION', null);
        }, 0);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      refreshSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithOAuth: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        remove: () => Promise.resolve({ data: null, error: null }),
      }),
    },
  };
}

export const supabase = client;
export const isSupabaseEnabled = feature && !!url && !!anon;
