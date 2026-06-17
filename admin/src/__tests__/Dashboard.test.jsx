import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import { adminAPI } from '../services/api';

vi.mock('../services/api');

const mockStats = {
  riders: { total: 10, pending: 2, verified: 7, online: 5, suspended: 1 },
  bookings: { total: 50, pending: 5, active: 3, completed: 40, today: 8 },
  payments: { total: 50, total_amount: 250000, held: 2, flagged: 1, today_amount: 40000 },
  users: { total: 100 },
};

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    adminAPI.getDashboard.mockResolvedValue({ data: {} });
    render(<Dashboard />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders dashboard stats after loading', async () => {
    adminAPI.getDashboard.mockResolvedValue({ data: mockStats });
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('renders revenue summary', async () => {
    adminAPI.getDashboard.mockResolvedValue({ data: mockStats });
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Revenue Summary')).toBeInTheDocument();
    });

    expect(screen.getByText(/250,000/)).toBeInTheDocument();
  });

  it('renders quick actions', async () => {
    adminAPI.getDashboard.mockResolvedValue({ data: mockStats });
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Review Pending Riders/)).toBeInTheDocument();
    });
  });

  it('shows error state on API failure', async () => {
    adminAPI.getDashboard.mockRejectedValue(new Error('API Error'));
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
    });
  });
});
