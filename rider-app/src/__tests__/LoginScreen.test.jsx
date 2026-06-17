import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../screens/LoginScreen';
import { authAPI } from '../services/api';

vi.mock('../services/api');

const mockNavigate = vi.fn();
const mockReplace = vi.fn();

vi.mock('@react-navigation/native', () => ({
  ...vi.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
  }),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with phone input', () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    expect(getByText('Boda Rider')).toBeTruthy();
    expect(getByText('Sign in to your rider account')).toBeTruthy();
    expect(getByPlaceholderText('256771234567')).toBeTruthy();
  });

  it('renders Send OTP button', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Send OTP')).toBeTruthy();
  });

  it('validates phone number is required', async () => {
    const { getByText } = render(<LoginScreen />);
    const button = getByText('Send OTP');

    fireEvent.press(button);

    await waitFor(() => {
      expect(authAPI.sendOTP).not.toHaveBeenCalled();
    });
  });

  it('calls sendOTP when phone is entered', async () => {
    authAPI.sendOTP.mockResolvedValue({ data: { success: true } });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('256771234567'), '256771234567');
    fireEvent.press(getByText('Send OTP'));

    await waitFor(() => {
      expect(authAPI.sendOTP).toHaveBeenCalledWith('256771234567');
    });
  });

  it('shows OTP input after sending OTP', async () => {
    authAPI.sendOTP.mockResolvedValue({ data: { success: true } });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('256771234567'), '256771234567');
    fireEvent.press(getByText('Send OTP'));

    await waitFor(() => {
      expect(getByPlaceholderText('123456')).toBeTruthy();
    });
  });

  it('validates OTP is required', async () => {
    authAPI.sendOTP.mockResolvedValue({ data: { success: true } });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('256771234567'), '256771234567');
    fireEvent.press(getByText('Send OTP'));

    await waitFor(() => {
      expect(getByPlaceholderText('123456')).toBeTruthy();
    });

    fireEvent.press(getByText('Verify OTP'));

    await waitFor(() => {
      expect(authAPI.verifyOTP).not.toHaveBeenCalled();
    });
  });

  it('calls verifyOTP with correct data', async () => {
    authAPI.sendOTP.mockResolvedValue({ data: { success: true } });
    authAPI.verifyOTP.mockResolvedValue({
      data: { token: 'test-token', user: { id: 'user-1' } },
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('256771234567'), '256771234567');
    fireEvent.press(getByText('Send OTP'));

    await waitFor(() => {
      expect(getByPlaceholderText('123456')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('123456'), '123456');
    fireEvent.press(getByText('Verify OTP'));

    await waitFor(() => {
      expect(authAPI.verifyOTP).toHaveBeenCalledWith('256771234567', '123456');
    });
  });

  it('navigates to Main after successful verification', async () => {
    authAPI.sendOTP.mockResolvedValue({ data: { success: true } });
    authAPI.verifyOTP.mockResolvedValue({
      data: { token: 'test-token', user: { id: 'user-1' } },
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('256771234567'), '256771234567');
    fireEvent.press(getByText('Send OTP'));

    await waitFor(() => {
      expect(getByPlaceholderText('123456')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('123456'), '123456');
    fireEvent.press(getByText('Verify OTP'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('Main');
    });
  });

  it('shows error on sendOTP failure', async () => {
    authAPI.sendOTP.mockRejectedValue(new Error('Failed'));

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('256771234567'), '256771234567');
    fireEvent.press(getByText('Send OTP'));

    await waitFor(() => {
      expect(authAPI.sendOTP).toHaveBeenCalled();
    });
  });
});
