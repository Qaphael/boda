const pool = require('../config/database');
const { redis } = require('../config/redis');

const getDashboardStats = async (req, reply) => {
  try {
    const [riders, bookings, payments, users] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'verified') as verified,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
        COUNT(*) FILTER (WHERE is_online = true) as online
       FROM riders`),
      pool.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today
       FROM bookings`),
      pool.query(`SELECT
        COUNT(*) as total,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(*) FILTER (WHERE status = 'held') as held,
        COUNT(*) FILTER (WHERE status = 'flagged') as flagged,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= CURRENT_DATE), 0) as today_amount
       FROM payments`),
      pool.query(`SELECT COUNT(*) as total FROM users`),
    ]);

    return reply.send({
      riders: riders.rows[0],
      bookings: bookings.rows[0],
      payments: payments.rows[0],
      users: users.rows[0],
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get dashboard stats' });
  }
};

const getPendingRiders = async (req, reply) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT id, name, phone, national_id, plate_number, id_photo, selfie_photo, created_at
       FROM riders WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const count = await pool.query(
      'SELECT COUNT(*) as total FROM riders WHERE status = \'pending\''
    );

    return reply.send({
      riders: result.rows,
      total: parseInt(count.rows[0].total),
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get pending riders' });
  }
};

const getRiderDetails = async (req, reply) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM riders WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Rider not found' });
    }

    const trips = await pool.query(
      `SELECT COUNT(*) as total_trips,
              COALESCE(SUM(fare_final), 0) as total_revenue
       FROM bookings WHERE rider_id = $1 AND status = 'completed'`,
      [id]
    );

    const ratings = await pool.query(
      `SELECT r.score, r.comment, r.created_at, u.phone as customer_phone
       FROM ratings r
       LEFT JOIN users u ON u.id = r.rated_by
       WHERE r.rider_id = $1
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [id]
    );

    return reply.send({
      rider: result.rows[0],
      stats: trips.rows[0],
      ratings: ratings.rows,
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get rider details' });
  }
};

const verifyRider = async (req, reply) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return reply.status(400).send({ error: 'Status must be verified or rejected' });
    }

    const result = await pool.query(
      `UPDATE riders SET status = $1 WHERE id = $2 AND status = 'pending'
       RETURNING id, name, phone, status`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Rider not found or already processed' });
    }

    if (status === 'rejected' && reason) {
      await pool.query(
        'INSERT INTO rider_rejections (rider_id, reason, reviewed_by) VALUES ($1, $2, $3)',
        [id, reason, req.user.userId]
      );
    }

    return reply.send({
      success: true,
      rider: result.rows[0],
      message: status === 'verified' ? 'Rider approved and can now go online' : `Rider rejected: ${reason || 'No reason provided'}`,
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to verify rider' });
  }
};

const suspendRider = async (req, reply) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE riders SET status = 'suspended', is_online = false
       WHERE id = $1 AND status IN ('verified', 'flagged')
       RETURNING id, name, phone, status`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Rider not found or cannot be suspended' });
    }

    await pool.query(
      'INSERT INTO rider_suspensions (rider_id, reason, suspended_by) VALUES ($1, $2, $3)',
      [id, reason || 'Admin suspension', req.user.userId]
    );

    await redis.hDel('riders:online', id);

    return reply.send({
      success: true,
      rider: result.rows[0],
      message: 'Rider suspended and taken offline',
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to suspend rider' });
  }
};

const reinstateRider = async (req, reply) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE riders SET status = 'verified'
       WHERE id = $1 AND status IN ('suspended', 'flagged')
       RETURNING id, name, phone, status`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Rider not found or cannot be reinstated' });
    }

    return reply.send({
      success: true,
      rider: result.rows[0],
      message: 'Rider reinstated to verified status',
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to reinstate rider' });
  }
};

const getAllBookings = async (req, reply) => {
  try {
    const { status, type, rider_id, customer_id, limit = 50, offset = 0, from_date, to_date } = req.query;

    let query = `
      SELECT b.*, r.name as rider_name, r.phone as rider_phone,
             u.phone as customer_phone
      FROM bookings b
      LEFT JOIN riders r ON r.id = b.rider_id
      LEFT JOIN users u ON u.id = b.customer_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND b.status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      query += ` AND b.type = $${params.length}`;
    }
    if (rider_id) {
      params.push(rider_id);
      query += ` AND b.rider_id = $${params.length}`;
    }
    if (customer_id) {
      params.push(customer_id);
      query += ` AND b.customer_id = $${params.length}`;
    }
    if (from_date) {
      params.push(from_date);
      query += ` AND b.created_at >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      query += ` AND b.created_at <= $${params.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY b.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    return reply.send({ bookings: result.rows });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get bookings' });
  }
};

const getBookingDetails = async (req, reply) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT b.*,
              r.name as rider_name, r.phone as rider_phone, r.plate_number,
              u.phone as customer_phone
       FROM bookings b
       LEFT JOIN riders r ON r.id = b.rider_id
       LEFT JOIN users u ON u.id = b.customer_id
       WHERE b.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Booking not found' });
    }

    const payments = await pool.query(
      'SELECT * FROM payments WHERE booking_id = $1',
      [id]
    );

    const ratings = await pool.query(
      `SELECT r.*, u.phone as customer_phone
       FROM ratings r
       LEFT JOIN users u ON u.id = r.rated_by
       WHERE r.booking_id = $1`,
      [id]
    );

    return reply.send({
      booking: result.rows[0],
      payments: payments.rows,
      ratings: ratings.rows,
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get booking details' });
  }
};

const getPayments = async (req, reply) => {
  try {
    const { status, method, limit = 50, offset = 0, from_date, to_date } = req.query;

    let query = `
      SELECT p.*, b.type as booking_type,
             r.name as rider_name, r.phone as rider_phone
      FROM payments p
      LEFT JOIN bookings b ON b.id = p.booking_id
      LEFT JOIN riders r ON r.id = b.rider_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }
    if (method) {
      params.push(method);
      query += ` AND p.method = $${params.length}`;
    }
    if (from_date) {
      params.push(from_date);
      query += ` AND p.created_at >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      query += ` AND p.created_at <= $${params.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY p.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    const stats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(*) FILTER (WHERE status = 'held') as held_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'held'), 0) as held_amount,
        COUNT(*) FILTER (WHERE status = 'flagged') as flagged_count
      FROM payments
      WHERE 1=1
      ${status ? 'AND status = $1' : ''}
    `, status ? [status] : []);

    return reply.send({
      payments: result.rows,
      stats: stats.rows[0],
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get payments' });
  }
};

const releasePayment = async (req, reply) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE payments SET status = 'released', released_at = NOW()
       WHERE id = $1 AND status IN ('held', 'flagged')
       RETURNING id, amount, status`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Payment not found or cannot be released' });
    }

    return reply.send({
      success: true,
      payment: result.rows[0],
      message: 'Payment released successfully',
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to release payment' });
  }
};

const flagPayment = async (req, reply) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE payments SET status = 'flagged'
       WHERE id = $1 AND status = 'held'
       RETURNING id, amount, status`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Payment not found or cannot be flagged' });
    }

    await pool.query(
      'INSERT INTO payment_flags (payment_id, reason, flagged_by) VALUES ($1, $2, $3)',
      [id, reason || 'Admin flag', req.user.userId]
    );

    return reply.send({
      success: true,
      payment: result.rows[0],
      message: 'Payment flagged for review',
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to flag payment' });
  }
};

module.exports = {
  getDashboardStats,
  getPendingRiders,
  getRiderDetails,
  verifyRider,
  suspendRider,
  reinstateRider,
  getAllBookings,
  getBookingDetails,
  getPayments,
  releasePayment,
  flagPayment,
};
