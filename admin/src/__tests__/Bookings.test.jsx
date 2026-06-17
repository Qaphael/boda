import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Bookings from '../pages/Bookings';
import { adminAPI } from '../services/api';

vi.mock('../services/api');

const mockBookings = [
  {
    id: 'booking-1',
    type: 'ride',
    status: 'completed',
    fare_estimate: 5000,
    fare_final: 5000,
    customer_phone: '256771234567',
    rider_name: 'John Rider',
    pickup_address: 'Gulu Central',
    dropoff_address: 'Gulu Hospital',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'booking-2',
    type: 'delivery',
    status: 'in_progress',
    fare_estimate: 3000,
    fare_final: null,
    customer_phone: '256751234567',
    rider_name: 'Jane Rider',
    pickup_address: 'Market Square',
    dropoff_address: 'University',
    created_at: '2026-01-16T10:00:00Z',
  },
];

describe('Bookings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    adminAPI.getBookings.mockResolvedValue({ data: { bookings: [] } });
    render(<Bookings />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders bookings list', async () => {
    adminAPI.getBookings.mockResolvedValue({ data: { bookings: mockBookings } });
    render(<Bookings />);

    await waitFor(() => {
      expect(screen.getByText('Bookings')).toBeInTheDocument();
    });

    expect(screen.getByText('ride')).toBeInTheDocument();
    expect(screen.getByText('delivery')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('in_progress')).toBeInTheDocument();
  });

  it('renders booking details with fare', async () => {
    adminAPI.getBookings.mockResolvedValue({ data: { bookings: mockBookings } });
    render(<Bookings />);

    await waitFor(() => {
      expect(screen.getByText(/5,000/)).toBeInTheDocument();
    });

    expect(screen.getByText(/3,000/)).toBeInTheDocument();
  });

  it('has status filter dropdown', async () => {
    adminAPI.getBookings.mockResolvedValue({ data: { bookings: [] } });
    render(<Bookings />);

    await waitFor(() => {
      expect(screen.getByText('All Status')).toBeInTheDocument();
    });
  });

  it('has type filter dropdown', async () => {
    adminAPI.getBookings.mockResolvedValue({ data: { bookings: [] } });
    render(<Bookings />);

    await waitFor(() => {
      expect(screen.getByText('All Types')).toBeInTheDocument();
    });
  });

  it('opens booking details modal when View is clicked', async () => {
    adminAPI.getBookings.mockResolvedValue({ data: { bookings: mockBookings } });
    adminAPI.getBookingDetails.mockResolvedValue({
      data: {
        booking: mockBookings[0],
        payments: [{ id: 'pay-1', status: 'released', amount: 5000, method: 'mtn' }],
        ratings: [],
      },
    });
    render(<Bookings />);

    await waitFor(() => {
      expect(screen.getAllByText('View').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('View')[0]);

    await waitFor(() => {
      expect(screen.getByText('Booking Details')).toBeInTheDocument();
    });

    expect(screen.getByText('Gulu Central')).toBeInTheDocument();
    expect(screen.getByText('Gulu Hospital')).toBeInTheDocument();
  });

  it('shows payment info in booking details', async () => {
    adminAPI.getBookings.mockResolvedValue({ data: { bookings: mockBookings } });
    adminAPI.getBookingDetails.mockResolvedValue({
      data: {
        booking: mockBookings[0],
        payments: [{ id: 'pay-1', status: 'released', amount: 5000, method: 'mtn' }],
        ratings: [],
      },
    });
    render(<Bookings />);

    await waitFor(() => {
      expect(screen.getAllByText('View').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('View')[0]);

    await waitFor(() => {
      expect(screen.getByText('Payment')).toBeInTheDocument();
    });

    expect(screen.getByText('released')).toBeInTheDocument();
  });

  it('closes modal when Close is clicked', async () => {
    adminAPI.getBookings.mockResolvedValue({ data: { bookings: mockBookings } });
    adminAPI.getBookingDetails.mockResolvedValue({
      data: { booking: mockBookings[0], payments: [], ratings: [] },
    });
    render(<Bookings />);

    await waitFor(() => {
      expect(screen.getAllByText('View').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('View')[0]);

    await waitFor(() => {
      expect(screen.getByText('Booking Details')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByText('Booking Details')).not.toBeInTheDocument();
  });
});
