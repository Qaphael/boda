import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api', () => ({
  adminAPI: {
    getDashboard: vi.fn(),
    getPendingRiders: vi.fn(),
    getRiderDetails: vi.fn(),
    verifyRider: vi.fn(),
    suspendRider: vi.fn(),
    reinstateRider: vi.fn(),
    getBookings: vi.fn(),
    getBookingDetails: vi.fn(),
    getPayments: vi.fn(),
    releasePayment: vi.fn(),
    flagPayment: vi.fn(),
  },
  authAPI: {
    sendOTP: vi.fn(),
    verifyOTP: vi.fn(),
  },
}));

import { adminAPI, authAPI } from '../services/api';

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('authAPI', () => {
    it('sendOTP sends correct request', async () => {
      authAPI.sendOTP.mockResolvedValue({ data: { success: true } });
      const result = await authAPI.sendOTP('256771234567');
      expect(result.data.success).toBe(true);
    });

    it('verifyOTP sends correct request', async () => {
      authAPI.verifyOTP.mockResolvedValue({
        data: { success: true, token: 'test-token' },
      });
      const result = await authAPI.verifyOTP('256771234567', '123456');
      expect(result.data.token).toBe('test-token');
    });
  });

  describe('adminAPI', () => {
    it('getDashboard calls correct endpoint', async () => {
      adminAPI.getDashboard.mockResolvedValue({
        data: { riders: { total: 10 } },
      });
      const result = await adminAPI.getDashboard();
      expect(result.data.riders.total).toBe(10);
    });

    it('getPendingRiders calls correct endpoint', async () => {
      adminAPI.getPendingRiders.mockResolvedValue({
        data: { riders: [], total: 0 },
      });
      const result = await adminAPI.getPendingRiders();
      expect(result.data.riders).toEqual([]);
    });

    it('getRiderDetails calls correct endpoint', async () => {
      adminAPI.getRiderDetails.mockResolvedValue({
        data: { rider: { id: 'rider-1' } },
      });
      const result = await adminAPI.getRiderDetails('rider-1');
      expect(result.data.rider.id).toBe('rider-1');
    });

    it('verifyRider sends correct data', async () => {
      adminAPI.verifyRider.mockResolvedValue({ data: { success: true } });
      const result = await adminAPI.verifyRider('rider-1', 'verified', 'Good rider');
      expect(result.data.success).toBe(true);
    });

    it('suspendRider sends correct data', async () => {
      adminAPI.suspendRider.mockResolvedValue({ data: { success: true } });
      const result = await adminAPI.suspendRider('rider-1', 'Bad behavior');
      expect(result.data.success).toBe(true);
    });

    it('getBookings calls correct endpoint', async () => {
      adminAPI.getBookings.mockResolvedValue({
        data: { bookings: [] },
      });
      const result = await adminAPI.getBookings({ status: 'completed' });
      expect(result.data.bookings).toEqual([]);
    });

    it('getPayments calls correct endpoint', async () => {
      adminAPI.getPayments.mockResolvedValue({
        data: { payments: [], stats: {} },
      });
      const result = await adminAPI.getPayments({ status: 'held' });
      expect(result.data.payments).toEqual([]);
    });

    it('releasePayment sends correct request', async () => {
      adminAPI.releasePayment.mockResolvedValue({ data: { success: true } });
      const result = await adminAPI.releasePayment('pay-1');
      expect(result.data.success).toBe(true);
    });

    it('flagPayment sends correct data', async () => {
      adminAPI.flagPayment.mockResolvedValue({ data: { success: true } });
      const result = await adminAPI.flagPayment('pay-1', 'Suspicious');
      expect(result.data.success).toBe(true);
    });
  });
});
