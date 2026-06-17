import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';
import { riderAPI } from '../services/api';

vi.mock('../services/api');

const mockNavigate = vi.fn();

vi.mock('@react-navigation/native', () => ({
  ...vi.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    rider: { riderId: 'rider-1', phone: '256771234567', name: 'John' },
    logout: vi.fn(),
  }),
}));

vi.mock('../hooks/useLocationTracking', () => ({
  useLocationTracking: () => ({ current: null }),
}));

describe('HomeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    riderAPI.getProfile.mockResolvedValue({
      data: { rider: { id: 'rider-1', name: 'John', avg_rating: 4.5, is_online: false } },
    });
    riderAPI.getEarnings.mockResolvedValue({
      data: { summary: { total_trips: 5, total_revenue: 25000 } },
    });
  });

  it('renders greeting with rider name', async () => {
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Hello, John!')).toBeTruthy();
    });
  });

  it('renders online status toggle', async () => {
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Online Status')).toBeTruthy();
    });
  });

  it('renders earnings stats', async () => {
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Today's Trips")).toBeTruthy();
      expect(getByText("Today's Earnings (UGX)")).toBeTruthy();
    });
  });

  it('renders profile information', async () => {
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Profile')).toBeTruthy();
      expect(getByText('256771234567')).toBeTruthy();
    });
  });

  it('calls getProfile on mount', async () => {
    render(<HomeScreen />);

    await waitFor(() => {
      expect(riderAPI.getProfile).toHaveBeenCalledWith('rider-1');
    });
  });

  it('calls getEarnings on mount', async () => {
    render(<HomeScreen />);

    await waitFor(() => {
      expect(riderAPI.getEarnings).toHaveBeenCalledWith('rider-1', 'today');
    });
  });

  it('navigates to Earnings screen', async () => {
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('View Earnings History')).toBeTruthy();
    });

    fireEvent.press(getByText('View Earnings History'));

    expect(mockNavigate).toHaveBeenCalledWith('Earnings');
  });

  it('navigates to Register screen', async () => {
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Update Registration')).toBeTruthy();
    });

    fireEvent.press(getByText('Update Registration'));

    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('shows logout button', async () => {
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Logout')).toBeTruthy();
    });
  });
});
