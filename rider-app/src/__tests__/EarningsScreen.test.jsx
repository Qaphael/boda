import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EarningsScreen from '../screens/EarningsScreen';
import { riderAPI } from '../services/api';

vi.mock('../services/api');

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    rider: { riderId: 'rider-1', phone: '256771234567' },
  }),
}));

describe('EarningsScreen', () => {
  const mockEarnings = {
    summary: {
      total_trips: 10,
      total_revenue: 50000,
      rider_share: 42500,
    },
    bookings: [
      {
        id: 'booking-1',
        type: 'ride',
        fare_final: 5000,
        pickup_address: 'Gulu Central',
        dropoff_address: 'Hospital',
        completed_at: '2026-01-15T10:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    riderAPI.getEarnings.mockResolvedValue({ data: mockEarnings });
  });

  it('renders earnings title', async () => {
    const { getByText } = render(<EarningsScreen />);

    await waitFor(() => {
      expect(getByText('Earnings')).toBeTruthy();
    });
  });

  it('renders period selector', async () => {
    const { getByText } = render(<EarningsScreen />);

    await waitFor(() => {
      expect(getByText('Today')).toBeTruthy();
      expect(getByText('This Week')).toBeTruthy();
      expect(getByText('This Month')).toBeTruthy();
      expect(getByText('All Time')).toBeTruthy();
    });
  });

  it('renders earnings summary', async () => {
    const { getByText } = render(<EarningsScreen />);

    await waitFor(() => {
      expect(getByText('Trips')).toBeTruthy();
      expect(getByText('Revenue')).toBeTruthy();
      expect(getByText('Your Share')).toBeTruthy();
    });
  });

  it('renders trip history list', async () => {
    const { getByText } = render(<EarningsScreen />);

    await waitFor(() => {
      expect(getByText('Trip History')).toBeTruthy();
      expect(getByText('Ride')).toBeTruthy();
      expect(getByText('Gulu Central → Hospital')).toBeTruthy();
    });
  });

  it('calls getEarnings on mount', async () => {
    render(<EarningsScreen />);

    await waitFor(() => {
      expect(riderAPI.getEarnings).toHaveBeenCalledWith('rider-1', 'all');
    });
  });

  it('changes period when selected', async () => {
    const { getByText } = render(<EarningsScreen />);

    await waitFor(() => {
      expect(getByText('Today')).toBeTruthy();
    });

    fireEvent.press(getByText('Today'));

    await waitFor(() => {
      expect(riderAPI.getEarnings).toHaveBeenCalledWith('rider-1', 'today');
    });
  });

  it('shows empty state when no bookings', async () => {
    riderAPI.getEarnings.mockResolvedValue({
      data: { summary: { total_trips: 0, total_revenue: 0 }, bookings: [] },
    });

    const { getByText } = render(<EarningsScreen />);

    await waitFor(() => {
      expect(getByText('No trips found for this period')).toBeTruthy();
    });
  });

  it('formats fare correctly', async () => {
    const { getByText } = render(<EarningsScreen />);

    await waitFor(() => {
      expect(getByText('UGX 5,000')).toBeTruthy();
    });
  });
});
