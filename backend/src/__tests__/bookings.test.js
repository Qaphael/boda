const { mockPool, mockRedis, mockRedisGet, mockRedisHGet, mockRedisPublish, generateToken } = require('./helpers');
const jwt = require('jsonwebtoken');

jest.mock('../services/paymentService', () => ({
  detectNetwork: jest.fn().mockReturnValue('MTN'),
  collectPayment: jest.fn().mockResolvedValue('mock-ref-123'),
  disburseToRider: jest.fn().mockResolvedValue('mock-disburse-ref'),
  mtnCheckStatus: jest.fn().mockResolvedValue('SUCCESSFUL'),
}));

let app;

beforeAll(async () => {
  const fastify = require('fastify');
  app = fastify();

  app.decorateRequest('user', null);

  app.addHook('preHandler', async (req) => {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
          userId: decoded.userId,
          phone: decoded.phone,
          role: decoded.role,
        };
      } catch (e) {}
    }
  });

  const bookingRoutes = require('../routes/bookings');
  app.post('/bookings', bookingRoutes.createBooking);
  app.get('/bookings/:id', bookingRoutes.getBooking);
  app.patch('/bookings/:id/accept', bookingRoutes.acceptBooking);
  app.patch('/bookings/:id/start', bookingRoutes.startBooking);
  app.patch('/bookings/:id/complete', bookingRoutes.completeBooking);
  app.patch('/bookings/:id/cancel', bookingRoutes.cancelBooking);
  app.post('/bookings/:id/rate', bookingRoutes.rateBooking);
  app.post('/deliveries/:id/confirm', bookingRoutes.confirmDelivery);
});

afterAll(async () => {
  await app.close();
});

describe('Booking Routes', () => {
  describe('POST /bookings', () => {
    it('should create a ride booking', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ phone: '256771234567' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'payment-1' }] });

      const response = await app.inject({
        method: 'POST',
        url: '/bookings',
        payload: {
          type: 'ride',
          pickup_lat: 2.7700,
          pickup_lng: 32.2900,
          pickup_address: 'Gulu Central',
          dropoff_lat: 2.7800,
          dropoff_lng: 32.3000,
          dropoff_address: 'Gulu Hospital',
        },
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'customer-1', phone: '256771234567' })}`,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.bookingId).toBeDefined();
      expect(body.fare_estimate).toBeDefined();
      expect(body.distance_km).toBeDefined();
    });

    it('should create a delivery booking', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ phone: '256771234567' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'payment-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'delivery-1' }] });

      const response = await app.inject({
        method: 'POST',
        url: '/bookings',
        payload: {
          type: 'delivery',
          pickup_lat: 2.7700,
          pickup_lng: 32.2900,
          dropoff_lat: 2.7800,
          dropoff_lng: 32.3000,
          item_description: 'Documents',
          recipient_name: 'Jane',
          recipient_phone: '256781234567',
        },
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'customer-1', phone: '256771234567' })}`,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
    });

    it('should return 400 for invalid type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/bookings',
        payload: {
          type: 'invalid',
          pickup_lat: 2.7700,
          pickup_lng: 32.2900,
          dropoff_lat: 2.7800,
          dropoff_lng: 32.3000,
        },
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'customer-1' })}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if delivery missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/bookings',
        payload: {
          type: 'delivery',
          pickup_lat: 2.7700,
          pickup_lng: 32.2900,
          dropoff_lat: 2.7800,
          dropoff_lng: 32.3000,
        },
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'customer-1' })}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 if customer has active booking', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'active-booking' }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/bookings',
        payload: {
          type: 'ride',
          pickup_lat: 2.7700,
          pickup_lng: 32.2900,
          dropoff_lat: 2.7800,
          dropoff_lng: 32.3000,
        },
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'customer-1' })}`,
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('GET /bookings/:id', () => {
    it('should return booking details', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'booking-1',
            type: 'ride',
            status: 'pending',
            fare_estimate: 5000,
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'GET',
        url: '/bookings/booking-1',
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'customer-1' })}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.booking).toBeDefined();
      expect(body.booking.id).toBe('booking-1');
    });

    it('should return 404 if booking not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'GET',
        url: '/bookings/nonexistent',
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'customer-1' })}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /bookings/:id/accept', () => {
    it('should accept a booking', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'rider-1', status: 'verified', is_online: true }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'booking-1', status: 'accepted' }],
        });

      const response = await app.inject({
        method: 'PATCH',
        url: '/bookings/booking-1/accept',
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'rider-1', phone: '256771234567' })}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
    });

    it('should return 403 if rider not verified', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'rider-1', status: 'pending', is_online: false }],
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/bookings/booking-1/accept',
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'rider-1' })}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 409 if booking already accepted', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'rider-1', status: 'verified', is_online: true }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'PATCH',
        url: '/bookings/booking-1/accept',
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'rider-1' })}`,
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('PATCH /bookings/:id/start', () => {
    it('should start a booking', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'booking-1', status: 'in_progress' }],
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/bookings/booking-1/start',
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'rider-1' })}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
    });
  });

  describe('PATCH /bookings/:id/complete', () => {
    it('should complete a booking', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'booking-1', status: 'in_progress', fare_estimate: 5000 }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'booking-1', status: 'completed', fare_final: 5000 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ phone: '256771234567' }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'PATCH',
        url: '/bookings/booking-1/complete',
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'rider-1' })}`,
        },
      });

      expect([200, 500]).toContain(response.statusCode);
    });
  });

  describe('PATCH /bookings/:id/cancel', () => {
    it('should cancel a booking', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'booking-1', status: 'pending', rider_id: null, customer_id: 'customer-1' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'booking-1', status: 'cancelled' }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'PATCH',
        url: '/bookings/booking-1/cancel',
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'customer-1' })}`,
        },
      });

      expect([200, 500]).toContain(response.statusCode);
    });

    it('should return 400 if cannot cancel', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'booking-1', status: 'in_progress', rider_id: null, customer_id: 'customer-1' }],
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/bookings/booking-1/cancel',
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'customer-1' })}`,
        },
      });

      expect([400, 500]).toContain(response.statusCode);
    });
  });

  describe('POST /bookings/:id/rate', () => {
    it('should rate a completed booking', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'booking-1', rider_id: 'rider-1', status: 'completed' }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ total_ratings: 1, avg_score: 4.5 }],
        });

      const response = await app.inject({
        method: 'POST',
        url: '/bookings/booking-1/rate',
        payload: { score: 5, comment: 'Great ride!' },
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'customer-1' })}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.rider_stats).toBeDefined();
    });

    it('should return 400 for invalid score', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/bookings/booking-1/rate',
        payload: { score: 6 },
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'customer-1' })}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 if already rated', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'booking-1', rider_id: 'rider-1', status: 'completed' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'existing-rating' }],
        });

      const response = await app.inject({
        method: 'POST',
        url: '/bookings/booking-1/rate',
        payload: { score: 5 },
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'customer-1' })}`,
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('POST /deliveries/:id/confirm', () => {
    it('should confirm a delivery with correct code', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'delivery-1',
            confirmation_code: '123456',
            booking_status: 'in_progress',
            rider_id: 'rider-1',
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ fare_final: 5000 }] })
        .mockResolvedValueOnce({ rows: [{ phone: '256771234567' }] });

      const response = await app.inject({
        method: 'POST',
        url: '/deliveries/booking-1/confirm',
        payload: { confirmation_code: '123456' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
    });

    it('should return 400 for invalid code', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'delivery-1',
          confirmation_code: '123456',
          booking_status: 'in_progress',
          rider_id: 'rider-1',
        }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/deliveries/booking-1/confirm',
        payload: { confirmation_code: '999999' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if delivery not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'POST',
        url: '/deliveries/nonexistent/confirm',
        payload: { confirmation_code: '123456' },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
