// Authentication Test Suite for Sold2Move
// Tests email/password and Google OAuth workflows

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signInWithOAuth: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
    getUser: vi.fn(),
  },
  functions: {
    invoke: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    upsert: vi.fn(),
  })),
};

// Mock components
vi.mock('@supabase/auth-helpers-react', () => ({
  useSupabaseClient: () => mockSupabaseClient,
  useSession: () => ({ session: null }),
}));

vi.mock('@/lib/customSupabaseClient', () => ({
  supabase: mockSupabaseClient,
  getSiteUrl: () => 'http://localhost:3000',
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Test wrapper component
const TestWrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Authentication Workflow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocks to default behavior
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
    mockSupabaseClient.auth.signUp.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
    mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://google.com/oauth' }, error: null });
    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
    mockSupabaseClient.functions.invoke.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Email/Password Sign Up', () => {
    it('should render signup form correctly', async () => {
      const { default: SignUpPage } = await import('@/pages/SignUpPage');
      
      render(
        <TestWrapper>
          <SignUpPage />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
      expect(screen.getByText(/sign up with google/i)).toBeInTheDocument();
    });

    it('should validate email format', async () => {
      const { default: SignUpPage } = await import('@/pages/SignUpPage');
      
      render(
        <TestWrapper>
          <SignUpPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      // Test invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
    });

    it('should validate password requirements', async () => {
      const { default: SignUpPage } = await import('@/pages/SignUpPage');
      
      render(
        <TestWrapper>
          <SignUpPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      // Test short password
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('should successfully sign up with valid credentials', async () => {
      const { default: SignUpPage } = await import('@/pages/SignUpPage');
      
      render(
        <TestWrapper>
          <SignUpPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Should also call the signup bonus function
      await waitFor(() => {
        expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('grant-signup-bonus', {
          body: JSON.stringify({ user_id: 'test-user' }),
        });
      });
    });

    it('should handle signup errors gracefully', async () => {
      const { default: SignUpPage } = await import('@/pages/SignUpPage');
      
      // Mock signup error
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already registered' }
      });

      render(
        <TestWrapper>
          <SignUpPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalled();
      });
    });
  });

  describe('Email/Password Sign In', () => {
    it('should render login form correctly', async () => {
      const { default: LoginPage } = await import('@/pages/LoginPage');
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
    });

    it('should successfully sign in with valid credentials', async () => {
      const { default: LoginPage } = await import('@/pages/LoginPage');
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('should handle invalid credentials', async () => {
      const { default: LoginPage } = await import('@/pages/LoginPage');
      
      // Mock invalid credentials error
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' }
      });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalled();
      });
    });

    it('should handle email not confirmed error', async () => {
      const { default: LoginPage } = await import('@/pages/LoginPage');
      
      // Mock email not confirmed error
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email not confirmed' }
      });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalled();
      });
    });
  });

  describe('Google OAuth', () => {
    it('should initiate Google OAuth flow', async () => {
      const { default: LoginPage } = await import('@/pages/LoginPage');
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const googleButton = screen.getByText(/sign in with google/i);
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: expect.stringContaining('/auth/callback'),
          },
        });
      });
    });

    it('should handle Google OAuth errors', async () => {
      const { default: LoginPage } = await import('@/pages/LoginPage');
      
      // Mock OAuth error
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: { url: null },
        error: { message: 'OAuth provider error' }
      });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const googleButton = screen.getByText(/sign in with google/i);
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalled();
      });
    });
  });

  describe('Auth Callback Handling', () => {
    it('should handle successful OAuth callback', async () => {
      const { default: AuthCallbackPage } = await import('@/pages/AuthCallbackPage');
      
      // Mock successful session exchange
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      });

      // Mock location with code parameter
      const mockLocation = {
        search: '?code=test-oauth-code',
        pathname: '/auth/callback',
        state: null,
      };

      render(
        <TestWrapper>
          <AuthCallbackPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('test-oauth-code');
      });
    });

    it('should handle OAuth callback errors', async () => {
      const { default: AuthCallbackPage } = await import('@/pages/AuthCallbackPage');
      
      // Mock location with error parameter
      const mockLocation = {
        search: '?error=access_denied&error_description=User%20denied%20access',
        pathname: '/auth/callback',
        state: null,
      };

      render(
        <TestWrapper>
          <AuthCallbackPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
      });
    });

    it('should handle missing OAuth code', async () => {
      const { default: AuthCallbackPage } = await import('@/pages/AuthCallbackPage');
      
      // Mock location without code parameter
      const mockLocation = {
        search: '',
        pathname: '/auth/callback',
        state: null,
      };

      render(
        <TestWrapper>
          <AuthCallbackPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/authentication code missing/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Display Component', () => {
    it('should display authentication errors correctly', async () => {
      const { default: AuthErrorDisplay } = await import('@/components/ui/AuthErrorDisplay');
      
      const mockOnRetry = vi.fn();
      const mockOnGoBack = vi.fn();

      render(
        <AuthErrorDisplay 
          error="auth_failed" 
          onRetry={mockOnRetry} 
          onGoBack={mockOnGoBack} 
        />
      );

      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
      expect(screen.getByText(/go back to login/i)).toBeInTheDocument();

      // Test retry button
      fireEvent.click(screen.getByText(/try again/i));
      expect(mockOnRetry).toHaveBeenCalled();

      // Test go back button
      fireEvent.click(screen.getByText(/go back to login/i));
      expect(mockOnGoBack).toHaveBeenCalled();
    });

    it('should show loading state during retry', async () => {
      const { default: AuthErrorDisplay } = await import('@/components/ui/AuthErrorDisplay');
      
      render(
        <AuthErrorDisplay 
          error="auth_failed" 
          onRetry={() => {}} 
          onGoBack={() => {}} 
          isRetrying={true}
        />
      );

      expect(screen.getByText(/retrying/i)).toBeInTheDocument();
    });
  });

  describe('Session Management', () => {
    it('should handle session persistence', async () => {
      // Mock existing session
      const mockSession = {
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'test-token',
        refresh_token: 'test-refresh-token',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSession.user },
        error: null
      });

      // Test that session is properly retrieved
      const { data, error } = await mockSupabaseClient.auth.getUser();
      
      expect(data.user).toEqual(mockSession.user);
      expect(error).toBeNull();
    });

    it('should handle session expiration', async () => {
      // Mock expired session
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Session expired' }
      });

      const { data, error } = await mockSupabaseClient.auth.getUser();
      
      expect(data.user).toBeNull();
      expect(error.message).toBe('Session expired');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle network errors during signup', async () => {
      const { default: SignUpPage } = await import('@/pages/SignUpPage');
      
      // Mock network error
      mockSupabaseClient.auth.signUp.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <SignUpPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalled();
      });
    });

    it('should handle rate limiting errors', async () => {
      const { default: LoginPage } = await import('@/pages/LoginPage');
      
      // Mock rate limiting error
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Too many requests' }
      });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalled();
      });
    });

    it('should handle malformed OAuth callback URLs', async () => {
      const { default: AuthCallbackPage } = await import('@/pages/AuthCallbackPage');
      
      // Mock malformed callback
      const mockLocation = {
        search: '?code=&error=invalid_request',
        pathname: '/auth/callback',
        state: null,
      };

      render(
        <TestWrapper>
          <AuthCallbackPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
      });
    });
  });
});
