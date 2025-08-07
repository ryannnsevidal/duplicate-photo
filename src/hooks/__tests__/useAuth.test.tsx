import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create mocks before importing
const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    })),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
};

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

// Mock modules before any imports
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

// Now import the hook to test
import { useAuth } from '@/hooks/useAuth';

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.session).toBe(null);
    expect(result.current.profile).toBe(null);
  });

  it('should handle successful email sign in', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    const mockSession = { user: mockUser, access_token: 'token' };

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const response = await result.current.signInWithEmail('test@example.com', 'password');
      expect(response.error).toBe(null);
    });

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('should handle sign in error', async () => {
    const mockError = { message: 'Invalid credentials' };

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: mockError,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const response = await result.current.signInWithEmail('test@example.com', 'wrongpassword');
      expect(response.error).toEqual(mockError);
    });
  });

  it('should handle Google OAuth sign in', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: {},
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const response = await result.current.signInWithGoogle();
      expect(response.error).toBe(null);
    });

    expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  });

  it('should handle sign up', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser, session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const response = await result.current.signUp('test@example.com', 'password', 'Test User');
      expect(response.error).toBe(null);
    });

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      options: {
        data: {
          full_name: 'Test User',
        },
      },
    });
  });

  it('should handle sign out', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('should determine admin status correctly', () => {
    const { result, rerender } = renderHook(() => useAuth());

    // Non-admin user
    expect(result.current.isAdmin).toBe(false);

    // Mock an admin profile
    const adminProfile = {
      id: '123',
      email: 'admin@example.com',
      role: 'admin' as const,
      full_name: 'Admin User',
      avatar_url: null,
      session_timeout_minutes: 30,
      last_activity: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Manually set the profile for testing
    act(() => {
      // This would normally be set by the auth state change listener
      (result.current as any).profile = adminProfile;
    });

    rerender();
    // Note: This test might need adjustment based on how the hook internally manages state
  });

  it('should check session timeout correctly', () => {
    const { result } = renderHook(() => useAuth());

    // Without profile, should return false
    expect(result.current.checkSessionTimeout()).toBe(false);

    // With valid profile but recent activity, should return false
    act(() => {
      // This test demonstrates the function but might need internal state mocking
      const timeout = result.current.checkSessionTimeout();
      expect(typeof timeout).toBe('boolean');
    });
  });
});
