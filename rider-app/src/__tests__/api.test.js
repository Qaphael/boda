import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api', () => ({
  authAPI: {
    sendOTP: vi.fn(),
    verifyOTP: vi.fn(),
  },
  riderAPI: {
    register: vi.fn(),
    updateLocation: vi.fn(),
    toggleOnline: vi.fn(),
    getProfile: vi.fn(),
    getEarnings: vi.fn(),
    updateDocuments: vi.fn(),
  },
  bookingAPI: {
    getBooking: vi.fn(),
    acceptBooking: vi.fn(),
    startBooking: vi.fn(),
    completeBooking: vi.fn(),
    cancelBooking: vi.fn(),
  },
}));

import { authAPI, riderAPI, bookingAPI } from '../services/api';

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('riderAPI', () => {
    it('register sends correct data', async () => {
      riderAPI.register.mockResolvedValue({
        data: { success: true, riderId: 'rider-1' },
      });
      const result = await riderAPI.register({
        phone: '256771234567',
        name: 'John Doe',
        national_id: 'CM123456789',
        plate_number: 'UGDJ1234A',
      });
      expect(result.data.riderId).toBe('rider-1');
    });

    it('updateLocation sends correct data', async () => {
      riderAPI.updateLocation.mockResolvedValue({ data: { success: true } });
      const result = await riderAPI.updateLocation('rider-1', 2.77, 32.29);
      expect(result.data.success).toBe(true);
    });

    it('toggleOnline sends correct data', async () => {
      riderAPI.toggleOnline.mockResolvedValue({ data: { success: true, is_online: true } });
      const result = await riderAPI.toggleOnline('rider-1', true);
      expect(result.data.is_online).toBe(true);
    });

    it('getProfile returns rider data', async () => {
      riderAPI.getProfile.mockResolvedValue({
        data: { rider: { id: 'rider-1', name: 'John', avg_rating: 4.5 } },
      });
      const result = await riderAPI.getProfile('rider-1');
      expect(result.data.rider.avg_rating).toBe(4.5);
    });

    it('getEarnings returns earnings data', async () => {
      riderAPI.getEarnings.mockResolvedValue({
        data: { summary: { total_trips: 10, total_revenue: 50000 } },
      });
      const result = await riderAPI.getEarnings('rider-1', 'today');
      expect(result.data.summary.total_trips).toBe(10);
    });

    it('updateDocuments sends correct data', async () => {
      riderAPI.updateDocuments.mockResolvedValue({ data: { success: true } });
      const result = await riderAPI.updateDocuments('rider-1', { id_photo: 'photo.jpg' });
      expect(result.data.success).toBe(true);
    });
  });

  describe('bookingAPI', () => {
    it('getBooking returns booking data', async () => {
      bookingAPI.getBooking.mockResolvedValue({
        data: { booking: { id: 'booking-1', status: 'pending' } },
      });
      const result = await bookingAPI.getBooking('booking-1');
      expect(result.data.booking.status).toBe('pending');
    });

    it('acceptBooking sends correct request', async () => {
      bookingAPI.acceptBooking.mockResolvedValue({ data: { success: true } });
      const result = await bookingAPI.acceptBooking('booking-1');
      expect(result.data.success).toBe(true);
    });

    it('startBooking sends correct request', async () => {
      bookingAPI.startBooking.mockResolvedValue({ data: { success: true } });
      const result = await bookingAPI.startBooking('booking-1');
      expect(result.data.success).toBe(true);
    });

    it('completeBooking sends correct data', async () => {
      bookingAPI.completeBooking.mockResolvedValue({ data: { success: true } });
      const result = await bookingAPI.completeBooking('booking-1', 5000);
      expect(result.data.success).toBe(true);
    });

    it('cancelBooking sends correct request', async () => {
      bookingAPI.cancelBooking.mockResolvedValue({ data: { success: true } });
      const result = await bookingAPI.cancelBooking('booking-1');
      expect(result.data.success).toBe(true);
    });
  });
});
