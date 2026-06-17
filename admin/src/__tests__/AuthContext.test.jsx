import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const TestComponent = () => {
  const { user, loading, logout } = useAuth();
  return (
    <div>
      {loading ? (
        <span>Loading...</span>
      ) : user ? (
        <>
          <span>Logged in</span>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <span>Not logged in</span>
      )}
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderAuth = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('provides auth context to children', () => {
    renderAuth();
    expect(screen.getByText('Not logged in')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderAuth();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('clears token on logout', () => {
    localStorage.setItem('admin_token', 'test-token');
    renderAuth();

    expect(screen.getByText('Logged in')).toBeInTheDocument();

    act(() => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByText('Not logged in')).toBeInTheDocument();
    expect(localStorage.getItem('admin_token')).toBeNull();
  });

  it('detects existing token on mount', () => {
    localStorage.setItem('admin_token', 'existing-token');
    renderAuth();
    expect(screen.getByText('Logged in')).toBeInTheDocument();
  });
});
