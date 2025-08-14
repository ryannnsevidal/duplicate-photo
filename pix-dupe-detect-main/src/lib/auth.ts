import { supabase } from '@/lib/supabaseClient';

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function requireSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error('No active session');
  }
  return data.session;
}