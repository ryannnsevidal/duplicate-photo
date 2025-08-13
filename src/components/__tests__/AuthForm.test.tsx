import { AuthForm } from '@/components/AuthForm';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the useAuth hook first
const mockUseAuth = {
  user: null,
  loading: false,
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signUp: vi.fn(),
};

// Mock modules before importing components
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('AuthForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.user = null;
    mockUseAuth.loading = false;
  });

  it('should render sign in form by default', () => {
    render(<AuthForm />);

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should switch to sign up mode', async () => {
    render(<AuthForm />);

    const switchButton = screen.getByText(/create.*account/i);
    await user.click(switchButton);

    expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('should handle email sign in', async () => {
    mockUseAuth.signInWithEmail.mockResolvedValue({ error: null });

    render(<AuthForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(signInButton);

    await waitFor(() => {
      expect(mockUseAuth.signInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should handle email sign up', async () => {
    mockUseAuth.signUp.mockResolvedValue({ error: null });

    render(<AuthForm />);

    // Switch to sign up mode
    const switchButton = screen.getByText(/create.*account/i);
    await user.click(switchButton);

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signUpButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(signUpButton);

    await waitFor(() => {
      expect(mockUseAuth.signUp).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');
    });
  });

  it('should handle Google sign in', async () => {
    mockUseAuth.signInWithGoogle.mockResolvedValue({ error: null });

    render(<AuthForm />);

    const googleButton = screen.getByRole('button', { name: /continue.*google/i });
    await user.click(googleButton);

    await waitFor(() => {
      expect(mockUseAuth.signInWithGoogle).toHaveBeenCalled();
    });
  });

  it('should display loading state', () => {
    mockUseAuth.loading = true;

    render(<AuthForm />);

    const signInButton = screen.getByRole('button', { name: /sign in/i });
    expect(signInButton).toBeDisabled();
  });

  it('should display form validation errors', async () => {
    render(<AuthForm />);

    const signInButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(signInButton);

    // Should show validation errors for empty fields
    expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
    expect(screen.getByText(/password.*required/i)).toBeInTheDocument();
  });

  it('should handle authentication errors', async () => {
    const error = { message: 'Invalid email or password' };
    mockUseAuth.signInWithEmail.mockResolvedValue({ error });

    render(<AuthForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    // Mock the signInWithEmail to prevent hanging
    mockUseAuth.signInWithEmail.mockResolvedValue({ error: null });
    
    render(<AuthForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    // Clear the email field first, then type invalid email
    await user.clear(emailInput);
    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'password123');
    
    // Debug: Check if email value is set correctly
    expect(emailInput).toHaveValue('invalid-email');
    
    await user.click(signInButton);

    // Wait for the DOM to update and check for error element
    await waitFor(async () => {
      // Debug: Check the entire form state
      console.log('Looking for email error...');
      console.log('All elements with test id:', screen.queryAllByTestId(/error/));
      
      // Look for the error element
      const errorElement = screen.queryByTestId('email-error');
      expect(errorElement).toBeTruthy();
      expect(errorElement).toHaveTextContent(/please enter a valid email/i);
    }, { timeout: 5000 });
  });

  it('should validate password length', async () => {
    render(<AuthForm />);

    // Switch to sign up mode to test password validation
    const switchButton = screen.getByText(/create.*account/i);
    await user.click(switchButton);

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signUpButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, '123'); // Too short
    await user.click(signUpButton);

    expect(screen.getByText(/password.*least.*characters/i)).toBeInTheDocument();
  });

  it('should not render when user is already logged in', () => {
    mockUseAuth.user = { id: '123', email: 'test@example.com' };

    const { container } = render(<AuthForm />);

    expect(container.firstChild).toBeNull();
  });
});
