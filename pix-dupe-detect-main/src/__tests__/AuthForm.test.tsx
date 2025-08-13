import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { AuthForm } from '../components/AuthForm';

// Mock useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}));

describe('AuthForm', () => {
  const mockOnAuthSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows email validation error on invalid email submit', async () => {
    const user = userEvent.setup();

    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    const error = await screen.findByTestId('email-error');
    expect(error).toBeInTheDocument();
    expect(error).toHaveTextContent(/valid email/i);
    expect(mockOnAuthSuccess).not.toHaveBeenCalled();
  });

  test('does not show error for valid email', async () => {
    const user = userEvent.setup();

    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    // Should not show error for valid email
    expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();
  });

  test('clears error when valid email is entered after invalid', async () => {
    const user = userEvent.setup();

    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);

    // First submit with invalid email
    await user.type(screen.getByLabelText(/email/i), 'invalid');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Error should be shown
    await screen.findByTestId('email-error');

    // Clear and enter valid email
    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Error should be cleared
    expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();
  });
});