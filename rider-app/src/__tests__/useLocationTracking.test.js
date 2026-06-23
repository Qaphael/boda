import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLocationTracking } from '../hooks/useLocationTracking';

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
  Accuracy: { Balanced: 'balanced' },
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
  });

  it('exports a function', () => {
    expect(typeof useLocationTracking).toBe('function');
  });

  it('hook accepts riderId and bookingId params', () => {
    expect(useLocationTracking.length).toBe(2);
  });
});
