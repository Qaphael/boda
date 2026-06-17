import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import { AuthProvider } from '../context/AuthContext';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
  };
});

describe('Layout Component', () => {
  const renderLayout = (children = <div>Test Content</div>) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <Layout>{children}</Layout>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders the app title', () => {
    renderLayout();
    expect(screen.getByText('Boda Admin')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderLayout();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Riders')).toBeInTheDocument();
    expect(screen.getByText('Bookings')).toBeInTheDocument();
    expect(screen.getByText('Payments')).toBeInTheDocument();
  });

  it('renders children content', () => {
    renderLayout();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders logout button', () => {
    renderLayout();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });
});
