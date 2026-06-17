import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react-native';
import { useLocationTracking } from '../hooks/useLocationTracking';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: vi.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 2.7700,
        longitude: 32.2900,
      },
    })
  ),
}));

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

describe('useLocationTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates socket connection', () => {
    renderHook(() => useLocationTracking('rider-1', null));

    expect(io).toHaveBeenCalledWith('http://localhost:3000', { transports: ['websocket'] });
  });

  it('requests location permission', async () => {
    renderHook(() => useLocationTracking('rider-1', null));

    await act(async () => {
      await vi.advanceTimersByTime(100);
    });

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
  });

  it('emits location updates', async () => {
    const mockSocket = { on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() };
    io.mockReturnValue(mockSocket);

    renderHook(() => useLocationTracking('rider-1', 'booking-1'));

    await act(async () => {
      await vi.advanceTimersByTime(3100);
    });

    expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith('rider:location', {
      riderId: 'rider-1',
      bookingId: 'booking-1',
      lat: 2.7700,
      lng: 32.2900,
    });
  });

  it('does not emit without riderId', () => {
    const mockSocket = { on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() };
    io.mockReturnValue(mockSocket);

    renderHook(() => useLocationTracking(null, null));

    expect(io).not.toHaveBeenCalled();
  });

  it('cleans up on unmount', async () => {
    const mockSocket = { on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() };
    io.mockReturnValue(mockSocket);

    const { unmount } = renderHook(() => useLocationTracking('rider-1', null));

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('handles location permission denied', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const mockSocket = { on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() };
    io.mockReturnValue(mockSocket);

    renderHook(() => useLocationTracking('rider-1', null));

    await act(async () => {
      await vi.advanceTimersByTime(100);
    });

    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });
});
