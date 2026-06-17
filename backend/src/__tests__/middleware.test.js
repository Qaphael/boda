const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

describe('Auth Middleware', () => {
  let req, reply, done;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
      user: null,
    };
    reply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    done = jest.fn();
  });

  describe('authenticateToken', () => {
    it('should set user if valid token', async () => {
      const token = jwt.sign(
        { userId: 'user-1', phone: '256771234567', role: 'customer' },
        'test-secret',
        { expiresIn: '1h' }
      );
      req.headers['authorization'] = `Bearer ${token}`;

      const mockPool = require('../config/database');
      mockPool.query.mockResolvedValue({
        rows: [{ id: 'user-1', phone: '256771234567', is_active: true }],
      });

      await authenticateToken(req, reply, done);

      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('user-1');
      expect(req.user.phone).toBe('256771234567');
      expect(reply.status).not.toHaveBeenCalled();
      expect(reply.send).not.toHaveBeenCalled();
    });

    it('should return 401 without token', async () => {
      await authenticateToken(req, reply, done);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Access token required' });
    });

    it('should return 401 for expired token', async () => {
      const token = jwt.sign(
        { userId: 'user-1', phone: '256771234567' },
        'test-secret',
        { expiresIn: '0s' }
      );
      req.headers['authorization'] = `Bearer ${token}`;

      await new Promise(r => setTimeout(r, 100));

      await authenticateToken(req, reply, done);

      expect(reply.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 for invalid token', async () => {
      req.headers['authorization'] = 'Bearer invalid-token';

      await authenticateToken(req, reply, done);

      expect(reply.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 if user not found', async () => {
      const token = jwt.sign(
        { userId: 'nonexistent', phone: '256771234567' },
        'test-secret',
        { expiresIn: '1h' }
      );
      req.headers['authorization'] = `Bearer ${token}`;

      const mockPool = require('../config/database');
      mockPool.query.mockResolvedValue({ rows: [] });

      await authenticateToken(req, reply, done);

      expect(reply.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 if user inactive', async () => {
      const token = jwt.sign(
        { userId: 'user-1', phone: '256771234567' },
        'test-secret',
        { expiresIn: '1h' }
      );
      req.headers['authorization'] = `Bearer ${token}`;

      const mockPool = require('../config/database');
      mockPool.query.mockResolvedValue({
        rows: [{ id: 'user-1', phone: '256771234567', is_active: false }],
      });

      await authenticateToken(req, reply, done);

      expect(reply.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requireRole', () => {
    it('should allow access with correct role', async () => {
      req.user = { userId: 'user-1', role: 'admin' };

      const mockPool = require('../config/database');
      mockPool.query.mockResolvedValue({
        rows: [{ id: 'admin-1' }],
      });

      const middleware = requireRole(['admin']);
      await middleware(req, reply, done);

      expect(reply.status).not.toHaveBeenCalled();
      expect(reply.send).not.toHaveBeenCalled();
    });

    it('should deny access with wrong role', async () => {
      req.user = { userId: 'user-1', role: 'customer' };

      const middleware = requireRole(['admin']);
      await middleware(req, reply, done);

      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });

    it('should return 401 if no user', async () => {
      req.user = null;

      const middleware = requireRole(['admin']);
      await middleware(req, reply, done);

      expect(reply.status).toHaveBeenCalledWith(401);
    });
  });

  describe('optionalAuth', () => {
    it('should set user if valid token', async () => {
      const token = jwt.sign(
        { userId: 'user-1', phone: '256771234567', role: 'customer' },
        'test-secret',
        { expiresIn: '1h' }
      );
      req.headers['authorization'] = `Bearer ${token}`;

      await optionalAuth(req, reply);

      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('user-1');
    });

    it('should set user to null if no token', async () => {
      await optionalAuth(req, reply);

      expect(req.user).toBeNull();
    });

    it('should set user to null if invalid token', async () => {
      req.headers['authorization'] = 'Bearer invalid';

      await optionalAuth(req, reply);

      expect(req.user).toBeNull();
    });
  });
});
