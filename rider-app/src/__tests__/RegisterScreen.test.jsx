import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '../screens/RegisterScreen';
import { riderAPI } from '../services/api';

vi.mock('../services/api');

const mockReplace = vi.fn();

vi.mock('@react-navigation/native', () => ({
  ...vi.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    replace: mockReplace,
  }),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    rider: { riderId: 'rider-1', phone: '256771234567' },
    register: vi.fn(),
  }),
}));

describe('RegisterScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form', () => {
    const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

    expect(getByText('Rider Registration')).toBeTruthy();
    expect(getByText('Complete your profile to start earning')).toBeTruthy();
    expect(getByPlaceholderText('John Doe')).toBeTruthy();
    expect(getByPlaceholderText('CM123456789')).toBeTruthy();
    expect(getByPlaceholderText('UGDJ1234A')).toBeTruthy();
  });

  it('renders image picker buttons', () => {
    const { getByText } = render(<RegisterScreen />);

    expect(getByText('Select ID Photo')).toBeTruthy();
    expect(getByText('Select Selfie Photo')).toBeTruthy();
  });

  it('renders submit button', () => {
    const { getByText } = render(<RegisterScreen />);
    expect(getByText('Submit Registration')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByText } = render(<RegisterScreen />);

    fireEvent.press(getByText('Submit Registration'));

    await waitFor(() => {
      expect(riderAPI.register).not.toHaveBeenCalled();
    });
  });

  it('validates name is required', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByPlaceholderText('CM123456789'), 'CM123');
    fireEvent.changeText(getByPlaceholderText('UGDJ1234A'), 'UGDJ1234A');
    fireEvent.press(getByText('Submit Registration'));

    await waitFor(() => {
      expect(riderAPI.register).not.toHaveBeenCalled();
    });
  });

  it('validates national_id is required', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByPlaceholderText('John Doe'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('UGDJ1234A'), 'UGDJ1234A');
    fireEvent.press(getByText('Submit Registration'));

    await waitFor(() => {
      expect(riderAPI.register).not.toHaveBeenCalled();
    });
  });

  it('validates plate_number is required', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByPlaceholderText('John Doe'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('CM123456789'), 'CM123');
    fireEvent.press(getByText('Submit Registration'));

    await waitFor(() => {
      expect(riderAPI.register).not.toHaveBeenCalled();
    });
  });

  it('submits registration with valid data', async () => {
    riderAPI.register.mockResolvedValue({
      data: { success: true, riderId: 'rider-1' },
    });

    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByPlaceholderText('John Doe'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('CM123456789'), 'CM123');
    fireEvent.changeText(getByPlaceholderText('UGDJ1234A'), 'UGDJ1234A');
    fireEvent.press(getByText('Submit Registration'));

    await waitFor(() => {
      expect(riderAPI.register).toHaveBeenCalled();
    });
  });
});
