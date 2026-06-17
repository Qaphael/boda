const { mockPool, mockRedis, mockRedisGet, mockRedisSetEx, mockRedisHSet, mockRedisHGet, generateToken } = require('./helpers');
const jwt = require('jsonwebtoken');

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

  const riderRoutes = require('../routes/riders');
  app.post('/riders/register', riderRoutes.registerRider);
  app.get('/riders/nearby', riderRoutes.getNearbyRiders);
  app.patch('/riders/:riderId/location', riderRoutes.updateLocation);
  app.patch('/riders/:riderId/online', riderRoutes.toggleOnline);
  app.get('/riders/:id/profile', riderRoutes.getRiderProfile);
  app.get('/riders/:riderId/earnings', riderRoutes.getRiderEarnings);
});

afterAll(async () => {
  await app.close();
});

describe('Rider Routes', () => {
  describe('POST /riders/register', () => {
    it('should register a rider successfully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'rider-1' }] });

      const response = await app.inject({
        method: 'POST',
        url: '/riders/register',
        payload: {
          phone: '256771234567',
          name: 'John Doe',
          national_id: 'CM123456789',
          plate_number: 'UGDJ1234A',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.riderId).toBeDefined();
      expect(body.status).toBe('pending');
    });

    it('should return 400 if required fields missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/riders/register',
        payload: { phone: '256771234567' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid phone format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/riders/register',
        payload: {
          phone: '12345',
          name: 'John',
          national_id: 'CM123',
          plate_number: 'UGA123A',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 if rider already exists', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-rider' }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/riders/register',
        payload: {
          phone: '256771234567',
          name: 'John Doe',
          national_id: 'CM123456789',
          plate_number: 'UGDJ1234A',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.payload);
      expect(body.error).toContain('already exists');
    });
  });

  describe('GET /riders/nearby', () => {
    it('should return nearby riders', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'rider-1', name: 'Rider 1', avg_rating: 4.5 },
          { id: 'rider-2', name: 'Rider 2', avg_rating: 4.2 },
        ],
      });
      mockRedisSetEx.mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/riders/nearby?lat=2.7700&lng=32.2900&radius=3',
        headers: {
          authorization: `Bearer ${generateToken({ phone: '256771234567' })}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.riders).toHaveLength(2);
      expect(body.cached).toBe(false);
    });

    it('should return cached riders if available', async () => {
      const cachedRiders = [{ id: 'rider-1', name: 'Cached Rider' }];
      mockRedisGet.mockResolvedValue(JSON.stringify(cachedRiders));

      const response = await app.inject({
        method: 'GET',
        url: '/riders/nearby?lat=2.7700&lng=32.2900',
        headers: {
          authorization: `Bearer ${generateToken({ phone: '256771234567' })}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.riders).toEqual(cachedRiders);
      expect(body.cached).toBe(true);
    });

    it('should return 400 if coordinates missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/riders/nearby',
        headers: {
          authorization: `Bearer ${generateToken({ phone: '256771234567' })}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /riders/:riderId/online', () => {
    it('should toggle rider online status', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'rider-1', is_online: true }],
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/riders/rider-1/online',
        payload: { is_online: true },
        headers: {
          authorization: `Bearer ${generateToken({ phone: '256771234567' })}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.is_online).toBe(true);
    });

    it('should return 400 if is_online not boolean', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/riders/rider-1/online',
        payload: { is_online: 'yes' },
        headers: {
          authorization: `Bearer ${generateToken({ phone: '256771234567' })}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /riders/:id/profile', () => {
    it('should return rider profile', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'rider-1', name: 'John', avg_rating: 4.5 }],
        })
        .mockResolvedValueOnce({
          rows: [{ score: 5, comment: 'Great rider' }],
        });

      const response = await app.inject({
        method: 'GET',
        url: '/riders/rider-1/profile',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.rider).toBeDefined();
      expect(body.recent_ratings).toBeDefined();
    });

    it('should return 404 if rider not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'GET',
        url: '/riders/nonexistent/profile',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /riders/:riderId/earnings', () => {
    it('should return rider earnings', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            { id: 'booking-1', fare_final: 5000, completed_at: new Date() },
            { id: 'booking-2', fare_final: 3000, completed_at: new Date() },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{
            total_trips: 2,
            total_revenue: 8000,
            avg_fare: 4000,
            highest_fare: 5000,
          }],
        });

      const response = await app.inject({
        method: 'GET',
        url: '/riders/rider-1/earnings?period=today',
        headers: {
          authorization: `Bearer ${generateToken({ phone: '256771234567' })}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.bookings).toHaveLength(2);
      expect(body.summary).toBeDefined();
      expect(body.summary.total_trips).toBe(2);
    });
  });
});
