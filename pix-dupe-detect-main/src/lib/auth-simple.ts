import { supabase } from './supabase';

// Simplified auth helper without user roles
export async function signInWithPassword(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign-in error:', error.message);
      return { success: false, error: error.message };
    }

    console.log('✅ Sign-in successful:', data.user?.email);
    return { success: true, user: data.user };
  } catch (err) {
    console.error('Sign-in exception:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Sign-up error:', error.message);
      return { success: false, error: error.message };
    }

    if (data.user && !data.session) {
      console.log('✅ Sign-up successful, email confirmation required');
      return { 
        success: true, 
        message: 'Account created! Please check your email to confirm your account.' 
      };
    }

    if (data.user && data.session) {
      console.log('✅ Sign-up successful, user logged in');
      return { success: true, user: data.user };
    }

    return { success: false, error: 'Sign-up failed' };
  } catch (err) {
    console.error('Sign-up exception:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function signInWithGitHub() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('GitHub OAuth error:', error.message);
      return { success: false, error: error.message };
    }

    console.log('✅ GitHub OAuth initiated');
    return { success: true, data };
  } catch (err) {
    console.error('GitHub OAuth exception:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign-out error:', error.message);
      return { success: false, error: error.message };
    }
    console.log('✅ Sign-out successful');
    return { success: true };
  } catch (err) {
    console.error('Sign-out exception:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
