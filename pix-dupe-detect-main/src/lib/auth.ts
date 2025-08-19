import { supabase } from './supabase';

export async function signInWithPassword(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Sign-in error:', error.message);
      return { success: false, error: error.message };
    }
    console.log('✅ Sign-in successful:', data.user?.email);
    if (data.user) {
      // Try to create user role, but don't fail if it doesn't work
      try {
        await createUserRole(data.user.id);
      } catch (roleError) {
        console.warn('Failed to create user role:', roleError);
      }
    }
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
        data: {
          full_name: email.split('@')[0],
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(email.split('@')[0])}&background=random`
        }
      },
    });
    
    if (error) {
      console.error('Sign-up error:', error.message);
      
      // Provide user-friendly error messages
      if (error.message.includes('Database error')) {
        return { 
          success: false, 
          error: 'Account creation failed. Please try again or contact support.' 
        };
      } else if (error.message.includes('already registered')) {
        return { 
          success: false, 
          error: 'An account with this email already exists. Please sign in instead.' 
        };
      } else if (error.message.includes('password')) {
        return { 
          success: false, 
          error: 'Password must be at least 6 characters long.' 
        };
      }
      return { success: false, error: error.message };
    }
    
    if (data.user && !data.session) {
      console.log('✅ Sign-up successful, email confirmation required');
      // Try to create user role, but don't fail if it doesn't work
      try {
        await createUserRole(data.user.id);
      } catch (roleError) {
        console.warn('Failed to create user role:', roleError);
      }
      return { 
        success: true, 
        message: 'Account created! Please check your email to confirm your account before signing in.' 
      };
    }
    
    if (data.user && data.session) {
      console.log('✅ Sign-up successful, user logged in');
      // Try to create user role, but don't fail if it doesn't work
      try {
        await createUserRole(data.user.id);
      } catch (roleError) {
        console.warn('Failed to create user role:', roleError);
      }
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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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

export async function requireSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Session check error:', error.message);
      return null;
    }
    return session;
  } catch (err) {
    console.error('Session check exception:', err);
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Get user error:', error.message);
      return null;
    }
    return user;
  } catch (err) {
    console.error('Get user exception:', err);
    return null;
  }
}

export async function refreshSession() {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Refresh session error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, session };
  } catch (err) {
    console.error('Refresh session exception:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Helper function to create user role (called manually after sign-in/sign-up)
async function createUserRole(userId: string) {
  try {
    const { data, error } = await supabase.rpc('create_user_role', { 
      user_uuid: userId, 
      user_role: 'user' 
    });
    if (error) {
      console.warn('Failed to create user role:', error.message);
    } else {
      console.log('✅ User role created for:', userId);
    }
  } catch (err) {
    console.warn('Error creating user role:', err);
  }
}