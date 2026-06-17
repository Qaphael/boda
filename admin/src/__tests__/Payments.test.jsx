import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Payments from '../pages/Payments';
import { adminAPI } from '../services/api';

vi.mock('../services/api');

const mockPayments = [
  {
    id: 'pay-1',
    amount: 5000,
    method: 'mtn',
    status: 'held',
    booking_type: 'ride',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'pay-2',
    amount: 3000,
    method: 'airtel',
    status: 'flagged',
    booking_type: 'delivery',
    created_at: '2026-01-16T10:00:00Z',
  },
];

const mockStats = {
  total: 50,
  total_amount: 250000,
  held_count: 5,
  flagged_count: 2,
};

describe('Payments Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    adminAPI.getPayments.mockResolvedValue({ data: { payments: [], stats: mockStats } });
    render(<Payments />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders payments list', async () => {
    adminAPI.getPayments.mockResolvedValue({ data: { payments: mockPayments, stats: mockStats } });
    render(<Payments />);

    await waitFor(() => {
      expect(screen.getByText('Payments')).toBeInTheDocument();
    });

    expect(screen.getByText('mtn')).toBeInTheDocument();
    expect(screen.getByText('airtel')).toBeInTheDocument();
    expect(screen.getByText('held')).toBeInTheDocument();
    expect(screen.getByText('flagged')).toBeInTheDocument();
  });

  it('renders payment stats', async () => {
    adminAPI.getPayments.mockResolvedValue({ data: { payments: mockPayments, stats: mockStats } });
    render(<Payments />);

    await waitFor(() => {
      expect(screen.getByText('Total Payments')).toBeInTheDocument();
    });

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText(/250,000/)).toBeInTheDocument();
  });

  it('renders payment amounts', async () => {
    adminAPI.getPayments.mockResolvedValue({ data: { payments: mockPayments, stats: mockStats } });
    render(<Payments />);

    await waitFor(() => {
      expect(screen.getByText(/5,000/)).toBeInTheDocument();
    });

    expect(screen.getByText(/3,000/)).toBeInTheDocument();
  });

  it('shows Release button for held payments', async () => {
    adminAPI.getPayments.mockResolvedValue({ data: { payments: mockPayments, stats: mockStats } });
    render(<Payments />);

    await waitFor(() => {
      expect(screen.getAllByText('Release').length).toBeGreaterThan(0);
    });
  });

  it('shows Flag button for held payments', async () => {
    adminAPI.getPayments.mockResolvedValue({ data: { payments: mockPayments, stats: mockStats } });
    render(<Payments />);

    await waitFor(() => {
      expect(screen.getByText('Flag')).toBeInTheDocument();
    });
  });

  it('calls releasePayment when Release is clicked', async () => {
    adminAPI.getPayments.mockResolvedValue({ data: { payments: mockPayments, stats: mockStats } });
    adminAPI.releasePayment.mockResolvedValue({});
    render(<Payments />);

    await waitFor(() => {
      expect(screen.getAllByText('Release').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Release')[0]);

    await waitFor(() => {
      expect(adminAPI.releasePayment).toHaveBeenCalledWith('pay-1');
    });
  });

  it('opens flag modal when Flag is clicked', async () => {
    adminAPI.getPayments.mockResolvedValue({ data: { payments: mockPayments, stats: mockStats } });
    render(<Payments />);

    await waitFor(() => {
      expect(screen.getAllByText('Flag').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Flag')[0]);

    expect(screen.getAllByText('Flag Payment').length).toBeGreaterThan(0);
    expect(screen.getByText('Reason')).toBeInTheDocument();
  });

  it('closes flag modal when Cancel is clicked', async () => {
    adminAPI.getPayments.mockResolvedValue({ data: { payments: mockPayments, stats: mockStats } });
    render(<Payments />);

    await waitFor(() => {
      expect(screen.getAllByText('Flag').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Flag')[0]);
    expect(screen.getAllByText('Flag Payment').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryAllByText('Flag Payment').length).toBe(0);
  });

  it('has status filter dropdown', async () => {
    adminAPI.getPayments.mockResolvedValue({ data: { payments: [], stats: mockStats } });
    render(<Payments />);

    await waitFor(() => {
      expect(screen.getByText('All Status')).toBeInTheDocument();
    });
  });
});
