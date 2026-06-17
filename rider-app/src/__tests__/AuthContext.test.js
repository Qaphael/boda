import { describe, it, expect, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, riderAPI } from '../services/api';

vi.mock('../services/api');

const { AuthProvider, useAuth } = require('../context/AuthContext');

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AsyncStorage.clear();
  });

  it('initializes with no rider', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.rider).toBeNull();
  });

  it('loads rider from storage on mount', async () => {
    await AsyncStorage.setItem('rider_token', 'test-token');
    await AsyncStorage.setItem('rider_data', JSON.stringify({ phone: '256771234567' }));

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitForNextUpdate();

    expect(result.current.rider).toBeTruthy();
    expect(result.current.rider.token).toBe('test-token');
  });

  it('sendOTP calls API', async () => {
    authAPI.sendOTP.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await result.current.sendOTP('256771234567');
    expect(authAPI.sendOTP).toHaveBeenCalledWith('256771234567');
  });

  it('verifyOTP stores token and rider data', async () => {
    authAPI.verifyOTP.mockResolvedValue({
      data: { token: 'new-token', user: { id: 'user-1', name: 'John' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await result.current.verifyOTP('256771234567', '123456');

    expect(authAPI.verifyOTP).toHaveBeenCalledWith('256771234567', '123456');
    expect(await AsyncStorage.getItem('rider_token')).toBe('new-token');
  });

  it('logout clears storage and rider', async () => {
    await AsyncStorage.setItem('rider_token', 'test-token');
    await AsyncStorage.setItem('rider_data', JSON.stringify({ phone: '256771234567' }));

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitForNextUpdate();

    await result.current.logout();

    expect(await AsyncStorage.getItem('rider_token')).toBeNull();
    expect(result.current.rider).toBeNull();
  });

  it('register calls API and updates rider data', async () => {
    riderAPI.register.mockResolvedValue({
      data: { success: true, riderId: 'rider-1', status: 'pending' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await result.current.register({
      phone: '256771234567',
      name: 'John',
      national_id: 'CM123',
      plate_number: 'UGDJ1234A',
    });

    expect(riderAPI.register).toHaveBeenCalled();
  });
});

import { renderHook, act } from '@testing-library/react-native';
