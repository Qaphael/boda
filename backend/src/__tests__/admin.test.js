const { mockPool, mockRedis, generateToken } = require('./helpers');
const jwt = require('jsonwebtoken');

let app;

const adminToken = generateToken({ userId: 'admin-1', phone: '256771234567', role: 'admin' });

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

  const adminRoutes = require('../routes/admin');
  app.get('/admin/dashboard', adminRoutes.getDashboardStats);
  app.get('/admin/riders/pending', adminRoutes.getPendingRiders);
  app.get('/admin/riders/:id', adminRoutes.getRiderDetails);
  app.patch('/admin/riders/:id/verify', adminRoutes.verifyRider);
  app.patch('/admin/riders/:id/suspend', adminRoutes.suspendRider);
  app.patch('/admin/riders/:id/reinstate', adminRoutes.reinstateRider);
  app.get('/admin/bookings', adminRoutes.getAllBookings);
  app.get('/admin/bookings/:id', adminRoutes.getBookingDetails);
  app.get('/admin/payments', adminRoutes.getPayments);
  app.post('/admin/payments/:id/release', adminRoutes.releasePayment);
  app.post('/admin/payments/:id/flag', adminRoutes.flagPayment);
});

afterAll(async () => {
  await app.close();
});

describe('Admin Routes', () => {
  describe('GET /admin/dashboard', () => {
    it('should return dashboard stats', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: 10, pending: 2, verified: 7, suspended: 1, online: 5 }],
        })
        .mockResolvedValueOnce({
          rows: [{ total: 50, pending: 5, active: 3, completed: 40, today: 8 }],
        })
        .mockResolvedValueOnce({
          rows: [{ total: 50, total_amount: 250000, held: 2, flagged: 1, today_amount: 40000 }],
        })
        .mockResolvedValueOnce({
          rows: [{ total: 100 }],
        });

      const response = await app.inject({
        method: 'GET',
        url: '/admin/dashboard',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.riders).toBeDefined();
      expect(body.bookings).toBeDefined();
      expect(body.payments).toBeDefined();
      expect(body.users).toBeDefined();
    });
  });

  describe('GET /admin/riders/pending', () => {
    it('should return pending riders', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'rider-1', name: 'John', status: 'pending' }],
        })
        .mockResolvedValueOnce({
          rows: [{ total: 1 }],
        });

      const response = await app.inject({
        method: 'GET',
        url: '/admin/riders/pending',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.riders).toHaveLength(1);
      expect(body.total).toBe(1);
    });
  });

  describe('PATCH /admin/riders/:id/verify', () => {
    it('should verify a rider', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'rider-1', name: 'John', phone: '256771234567', status: 'verified' }],
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/admin/riders/rider-1/verify',
        payload: { status: 'verified' },
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.rider.status).toBe('verified');
    });

    it('should reject a rider with reason', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'rider-1', name: 'John', phone: '256771234567', status: 'rejected' }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'PATCH',
        url: '/admin/riders/rider-1/verify',
        payload: { status: 'rejected', reason: 'Invalid ID' },
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.rider.status).toBe('rejected');
    });

    it('should return 400 for invalid status', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/admin/riders/rider-1/verify',
        payload: { status: 'invalid' },
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if rider not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'PATCH',
        url: '/admin/riders/nonexistent/verify',
        payload: { status: 'verified' },
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /admin/riders/:id/suspend', () => {
    it('should suspend a rider', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'rider-1', name: 'John', phone: '256771234567', status: 'suspended' }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'PATCH',
        url: '/admin/riders/rider-1/suspend',
        payload: { reason: 'Bad behavior' },
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
    });
  });

  describe('PATCH /admin/riders/:id/reinstate', () => {
    it('should reinstate a rider', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'rider-1', name: 'John', phone: '256771234567', status: 'verified' }],
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/admin/riders/rider-1/reinstate',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.rider.status).toBe('verified');
    });
  });

  describe('GET /admin/bookings', () => {
    it('should return all bookings', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'booking-1', status: 'completed', fare_final: 5000 },
          { id: 'booking-2', status: 'pending', fare_estimate: 3000 },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/admin/bookings',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.bookings).toHaveLength(2);
    });

    it('should filter by status', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'booking-1', status: 'completed' }],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/admin/bookings?status=completed',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.bookings).toHaveLength(1);
    });
  });

  describe('GET /admin/bookings/:id', () => {
    it('should return booking details', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'booking-1', type: 'ride', status: 'completed' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'payment-1', amount: 5000 }],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      const response = await app.inject({
        method: 'GET',
        url: '/admin/bookings/booking-1',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.booking).toBeDefined();
      expect(body.payments).toBeDefined();
      expect(body.ratings).toBeDefined();
    });
  });

  describe('GET /admin/payments', () => {
    it('should return payments', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'payment-1', amount: 5000, status: 'held' }],
        })
        .mockResolvedValueOnce({
          rows: [{ total: 1, total_amount: 5000, held_count: 1, held_amount: 5000, flagged_count: 0 }],
        });

      const response = await app.inject({
        method: 'GET',
        url: '/admin/payments',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.payments).toBeDefined();
      expect(body.stats).toBeDefined();
    });
  });

  describe('POST /admin/payments/:id/release', () => {
    it('should release a payment', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'payment-1', amount: 5000, status: 'released' }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/admin/payments/payment-1/release',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
    });

    it('should return 404 if payment not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'POST',
        url: '/admin/payments/nonexistent/release',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /admin/payments/:id/flag', () => {
    it('should flag a payment', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'payment-1', amount: 5000, status: 'flagged' }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'POST',
        url: '/admin/payments/payment-1/flag',
        payload: { reason: 'Suspicious activity' },
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
    });
  });
});
