import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in demo mode (placeholder values)
const isDemoMode = !supabaseUrl || 
  !supabaseKey || 
  supabaseUrl.includes('your-project') || 
  supabaseUrl.includes('demo-project') ||
  supabaseKey.includes('your-') ||
  supabaseKey.includes('demo-');

// Create a mock client for demo mode
const createMockClient = () => ({
  auth: {
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Demo mode - please configure Supabase') }),
    signInWithOAuth: async () => ({ data: {}, error: new Error('Demo mode - please configure Supabase') }),
    signUp: async () => ({ data: { user: null, session: null }, error: new Error('Demo mode - please configure Supabase') }),
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: new Error('Demo mode - please configure Supabase') }),
      getPublicUrl: () => ({ data: { publicUrl: 'demo-url' } }),
      remove: async () => ({ data: null, error: null }),
    }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: new Error('Demo mode - please configure Supabase') }),
      }),
    }),
    insert: async () => ({ data: null, error: new Error('Demo mode - please configure Supabase') }),
    update: () => ({
      eq: async () => ({ data: null, error: new Error('Demo mode - please configure Supabase') }),
    }),
  }),
  channel: () => ({
    on: () => ({ subscribe: () => ({}) }),
  }),
  removeChannel: () => {},
});

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Missing Supabase environment variables. Running in demo mode.');
}

export const supabase = isDemoMode 
  ? createMockClient() as any
  : createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'x-client-info': 'duplicate-photo-detector@1.0.0',
        },
      },
    });

// Helper functions for common operations
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File,
  options?: { cacheControl?: string; contentType?: string }
) => {
  return supabase.storage.from(bucket).upload(path, file, {
    cacheControl: options?.cacheControl || '3600',
    contentType: options?.contentType || file.type,
    upsert: false,
  });
};

export const getPublicUrl = (bucket: string, path: string) => {
  return supabase.storage.from(bucket).getPublicUrl(path);
};

export const deleteFile = (bucket: string, path: string) => {
  return supabase.storage.from(bucket).remove([path]);
};

// Real-time subscriptions helper
export const subscribeToChanges = (
  table: string,
  callback: (payload: any) => void,
  filter?: string
) => {
  const channel = supabase
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};