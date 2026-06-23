const { mockPool, mockRedis, mockRedisGet, mockRedisSetEx, mockRedisDel, mockRedisIncr, mockRedisExpire } = require('./helpers');

let app;

beforeAll(async () => {
  const fastify = require('fastify');
  app = fastify();
  const authRoutes = require('../routes/auth');
  app.post('/auth/send-otp', authRoutes.sendOTP);
  app.post('/auth/verify-otp', authRoutes.verifyOTP);
  app.post('/auth/refresh', authRoutes.refreshAccessToken);
});

afterAll(async () => {
  await app.close();
});

describe('Auth Routes', () => {
  describe('POST /auth/send-otp', () => {
    it('should send OTP successfully', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockRedisIncr.mockResolvedValue(1);
      mockRedisExpire.mockResolvedValue(1);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/send-otp',
        payload: { phone: '256771234567' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.message).toBe('OTP sent successfully');
      expect(mockRedisSetEx).toHaveBeenCalled();
    });

    it('should return 400 if phone is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/send-otp',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Phone number required');
    });

    it('should return 400 for invalid phone format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/send-otp',
        payload: { phone: '12345' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toContain('Invalid Ugandan phone format');
    });

    it('should return 429 for rate limiting', async () => {
      mockRedisGet.mockResolvedValue('3');

      const response = await app.inject({
        method: 'POST',
        url: '/auth/send-otp',
        payload: { phone: '256771234567' },
      });

      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.payload);
      expect(body.error).toContain('Too many OTP requests');
    });
  });

  describe('POST /auth/verify-otp', () => {
    it('should verify OTP and return tokens', async () => {
      mockRedisGet.mockResolvedValueOnce(null);
      mockRedisGet.mockResolvedValueOnce('123456');
      mockRedisDel.mockResolvedValue(1);
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'user-1', phone: '256771234567', name: null }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify-otp',
        payload: { phone: '256771234567', otp: '123456' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.token).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user).toBeDefined();
    });

    it('should return 400 if phone or OTP missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify-otp',
        payload: { phone: '256771234567' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Phone and OTP required');
    });

    it('should return 400 for invalid OTP', async () => {
      mockRedisGet.mockResolvedValueOnce(null);
      mockRedisGet.mockResolvedValueOnce('123456');

      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify-otp',
        payload: { phone: '256771234567', otp: '999999' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Invalid or expired OTP');
    });

    it('should return 400 if no OTP found', async () => {
      mockRedisGet.mockResolvedValueOnce(null);
      mockRedisGet.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify-otp',
        payload: { phone: '256771234567', otp: '123456' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Invalid or expired OTP');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const jwt = require('jsonwebtoken');
      const refreshToken = jwt.sign(
        { userId: 'user-1', phone: '256771234567' },
        'test-refresh-secret',
        { expiresIn: '7d' }
      );

      mockRedisGet.mockResolvedValueOnce(refreshToken);
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'user-1', phone: '256771234567' }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.token).toBeDefined();
    });

    it('should return 400 if refreshToken missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 403 for invalid refresh token', async () => {
      mockRedisGet.mockResolvedValueOnce('different-token');

      const jwt = require('jsonwebtoken');
      const refreshToken = jwt.sign(
        { userId: 'user-1', phone: '256771234567' },
        'test-refresh-secret',
        { expiresIn: '7d' }
      );

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
