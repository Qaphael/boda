import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Riders from '../pages/Riders';
import { adminAPI } from '../services/api';

vi.mock('../services/api');

const mockRiders = [
  {
    id: 'rider-1',
    name: 'John Doe',
    phone: '256771234567',
    plate_number: 'UGDJ1234A',
    national_id: 'CM123456789',
    status: 'pending',
    created_at: '2026-01-15T10:00:00Z',
    id_photo: 'https://example.com/id.jpg',
    selfie_photo: 'https://example.com/selfie.jpg',
  },
  {
    id: 'rider-2',
    name: 'Jane Smith',
    phone: '256751234567',
    plate_number: 'UGDJ5678B',
    national_id: 'CM987654321',
    status: 'pending',
    created_at: '2026-01-16T10:00:00Z',
    id_photo: null,
    selfie_photo: null,
  },
];

describe('Riders Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    adminAPI.getPendingRiders.mockResolvedValue({ data: { riders: [] } });
    render(<Riders />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders pending riders list', async () => {
    adminAPI.getPendingRiders.mockResolvedValue({ data: { riders: mockRiders, total: 2 } });
    render(<Riders />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('256771234567')).toBeInTheDocument();
    expect(screen.getByText('UGDJ1234A')).toBeInTheDocument();
  });

  it('renders empty state when no riders', async () => {
    adminAPI.getPendingRiders.mockResolvedValue({ data: { riders: [], total: 0 } });
    render(<Riders />);

    await waitFor(() => {
      expect(screen.getByText('No riders found')).toBeInTheDocument();
    });
  });

  it('opens review modal when Review is clicked', async () => {
    adminAPI.getPendingRiders.mockResolvedValue({ data: { riders: mockRiders, total: 2 } });
    render(<Riders />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const reviewButtons = screen.getAllByText('Review');
    fireEvent.click(reviewButtons[0]);

    expect(screen.getByText('Review Rider: John Doe')).toBeInTheDocument();
    expect(screen.getAllByText('CM123456789').length).toBeGreaterThan(0);
  });

  it('shows approve and reject buttons in modal', async () => {
    adminAPI.getPendingRiders.mockResolvedValue({ data: { riders: mockRiders, total: 2 } });
    render(<Riders />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Review')[0]);

    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('calls verifyRider when Approve is clicked', async () => {
    adminAPI.getPendingRiders.mockResolvedValue({ data: { riders: mockRiders, total: 2 } });
    adminAPI.verifyRider.mockResolvedValue({});
    render(<Riders />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Review')[0]);
    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(adminAPI.verifyRider).toHaveBeenCalledWith('rider-1', 'verified');
    });
  });

  it('displays rejection reason textarea', async () => {
    adminAPI.getPendingRiders.mockResolvedValue({ data: { riders: mockRiders, total: 2 } });
    render(<Riders />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Review')[0]);

    expect(screen.getByText('Rejection Reason (optional)')).toBeInTheDocument();
  });

  it('closes modal when Cancel is clicked', async () => {
    adminAPI.getPendingRiders.mockResolvedValue({ data: { riders: mockRiders, total: 2 } });
    render(<Riders />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Review')[0]);
    expect(screen.getByText('Review Rider: John Doe')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Review Rider: John Doe')).not.toBeInTheDocument();
  });
});
