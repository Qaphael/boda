import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { AuthProvider } from '../context/AuthContext';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with phone input', () => {
    renderLogin();
    expect(screen.getByText('Boda Admin')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your admin account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('256771234567')).toBeInTheDocument();
  });

  it('renders Send OTP button', () => {
    renderLogin();
    expect(screen.getByText('Send OTP')).toBeInTheDocument();
  });

  it('validates phone number is required', () => {
    renderLogin();
    const phoneInput = screen.getByPlaceholderText('256771234567');
    expect(phoneInput).toBeRequired();
  });
});
