const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = async (req, reply) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return reply.status(401).send({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await pool.query('SELECT id, phone, is_active FROM users WHERE id = $1', [decoded.userId]);
    if (user.rows.length === 0 || !user.rows[0].is_active) {
      return reply.status(401).send({ error: 'User not found or inactive' });
    }

    req.user = {
      userId: decoded.userId,
      phone: decoded.phone,
      role: decoded.role || 'customer',
    };

    const rider = await pool.query('SELECT id, status FROM riders WHERE phone = $1', [decoded.phone]);
    if (rider.rows.length > 0) {
      req.user.riderId = rider.rows[0].id;
      req.user.riderStatus = rider.rows[0].status;
    }
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return reply.status(401).send({ error: 'Token expired. Please login again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return reply.status(401).send({ error: 'Invalid token' });
    }
    return reply.status(500).send({ error: 'Authentication error' });
  }
};

const requireRole = (roles) => {
  return async (req, reply) => {
    if (!req.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    if (req.user.role === 'admin') {
      const admin = await pool.query(
        'SELECT id FROM admins WHERE user_id = $1 AND is_active = true',
        [req.user.userId]
      );
      if (admin.rows.length === 0) {
        return reply.status(403).send({ error: 'Admin account not found or inactive' });
      }
    }
  };
};

const optionalAuth = async (req, reply) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      phone: decoded.phone,
      role: decoded.role || 'customer',
    };
  } catch (err) {
    req.user = null;
  }
};

module.exports = { authenticateToken, requireRole, optionalAuth };
