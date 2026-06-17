const pool = require('../config/database');
const { redis } = require('../config/redis');
const jwt = require('jsonwebtoken');

const OTP_EXPIRY = 5 * 60; // 5 minutes in seconds
const OTP_LENGTH = 6;
const MAX_OTP_ATTEMPTS = 3;

const sendOTP = async (req, reply) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return reply.status(400).send({ error: 'Phone number required' });
    }

    if (!/^256\d{9}$/.test(phone)) {
      return reply.status(400).send({ error: 'Invalid Ugandan phone format. Use 256XXXXXXXXX' });
    }

    const rateLimitKey = `otp:ratelimit:${phone}`;
    const attempts = await redis.get(rateLimitKey);
    if (attempts && parseInt(attempts) >= MAX_OTP_ATTEMPTS) {
      return reply.status(429).send({ error: 'Too many OTP requests. Wait 5 minutes.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await redis.setEx(`otp:${phone}`, OTP_EXPIRY, otp);
    await redis.incr(rateLimitKey);
    await redis.expire(rateLimitKey, OTP_EXPIRY);

    console.log(`[DEV] OTP for ${phone}: ${otp}`);

    // TODO: Integrate Africa's Talking SMS API here
    // await sendSMS(phone, `Your Boda verification code is: ${otp}`);

    return reply.send({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to send OTP' });
  }
};

const verifyOTP = async (req, reply) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return reply.status(400).send({ error: 'Phone and OTP required' });
    }

    const storedOTP = await redis.get(`otp:${phone}`);

    if (!storedOTP) {
      return reply.status(400).send({ error: 'No OTP found. Request a new one.' });
    }

    if (storedOTP !== otp) {
      return reply.status(400).send({ error: 'Invalid OTP' });
    }

    await redis.del(`otp:${phone}`);
    await redis.del(`otp:ratelimit:${phone}`);

    let user = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);

    if (user.rows.length === 0) {
      user = await pool.query(
        'INSERT INTO users (phone) VALUES ($1) RETURNING *',
        [phone]
      );
    }

    const adminCheck = await pool.query(
      'SELECT id FROM admins WHERE user_id = $1 AND is_active = true',
      [user.rows[0].id]
    );
    const role = adminCheck.rows.length > 0 ? 'admin' : 'customer';

    const token = jwt.sign(
      { userId: user.rows[0].id, phone, role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.rows[0].id, phone },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    await redis.setEx(`session:${phone}`, 7 * 24 * 60 * 60, refreshToken);

    return reply.send({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.rows[0].id,
        phone: user.rows[0].phone,
        name: user.rows[0].name,
      },
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to verify OTP' });
  }
};

const refreshAccessToken = async (req, reply) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return reply.status(400).send({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const storedToken = await redis.get(`session:${decoded.phone}`);

    if (storedToken !== refreshToken) {
      return reply.status(403).send({ error: 'Invalid refresh token' });
    }

    const newToken = jwt.sign(
      { userId: decoded.userId, phone: decoded.phone, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return reply.send({ success: true, token: newToken });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return reply.status(403).send({ error: 'Refresh token expired. Login again.' });
    }
    return reply.status(500).send({ error: 'Failed to refresh token' });
  }
};

module.exports = { sendOTP, verifyOTP, refreshAccessToken };
