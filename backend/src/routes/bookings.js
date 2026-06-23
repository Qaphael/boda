const pool = require('../config/database');
const { redis } = require('../config/redis');
const { v4: uuidv4 } = require('uuid');
const { detectNetwork, collectPayment, disburseToRider, mtnCheckStatus } = require('../services/paymentService');

const VALID_BOOKING_TYPES = ['ride', 'delivery'];
const VALID_STATUSES = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'flagged'];

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const estimateFare = (distanceKm, type) => {
  const baseFare = type === 'ride' ? 1000 : 1500;
  const perKm = type === 'ride' ? 500 : 700;
  return Math.ceil(baseFare + (distanceKm * perKm));
};

const createBooking = async (req, reply) => {
  try {
    const {
      type,
      pickup_lat, pickup_lng, pickup_address,
      dropoff_lat, dropoff_lng, dropoff_address,
      item_description, recipient_name, recipient_phone,
      payment_method_id,
    } = req.body;

    if (!type || !VALID_BOOKING_TYPES.includes(type)) {
      return reply.status(400).send({ error: 'Type must be ride or delivery' });
    }

    if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
      return reply.status(400).send({ error: 'Pickup and dropoff coordinates required' });
    }

    if (type === 'delivery') {
      if (!item_description) {
        return reply.status(400).send({ error: 'Item description required for delivery' });
      }
      if (!recipient_name || !recipient_phone) {
        return reply.status(400).send({ error: 'Recipient name and phone required for delivery' });
      }
    }

    const distance = calculateDistance(
      parseFloat(pickup_lat), parseFloat(pickup_lng),
      parseFloat(dropoff_lat), parseFloat(dropoff_lng)
    );

    const calculatedFare = estimateFare(distance, type);

    const id = uuidv4();
    const customerId = req.user.userId;

    const activeBookings = await pool.query(
      `SELECT id FROM bookings
       WHERE customer_id = $1 AND status IN ('pending', 'accepted', 'in_progress')`,
      [customerId]
    );

    if (activeBookings.rows.length > 0) {
      return reply.status(409).send({
        error: 'You have an active booking. Complete or cancel it first.',
        activeBookingId: activeBookings.rows[0].id,
      });
    }

    await pool.query(
      `INSERT INTO bookings (id, customer_id, type, pickup_lat, pickup_lng, pickup_address,
         dropoff_lat, dropoff_lng, dropoff_address, fare_estimate, distance_km, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')`,
      [id, customerId, type, pickup_lat, pickup_lng, pickup_address || null,
       dropoff_lat, dropoff_lng, dropoff_address || null, calculatedFare, distance.toFixed(2)]
    );

    if (type === 'delivery') {
      const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
      await pool.query(
        `INSERT INTO deliveries (id, booking_id, item_description, recipient_name, recipient_phone, confirmation_code)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), id, item_description, recipient_name, recipient_phone, confirmationCode]
      );
    }

    let paymentPhone = null;
    let paymentMethod = null;

    if (payment_method_id) {
      const pm = await pool.query(
        'SELECT * FROM payment_methods WHERE id = $1 AND user_id = $2 AND is_deleted = false',
        [payment_method_id, customerId]
      );
      if (pm.rows.length > 0) {
        paymentPhone = pm.rows[0].phone_number;
        paymentMethod = pm.rows[0].type;
      }
    }

    if (!paymentPhone) {
      const user = await pool.query('SELECT phone FROM users WHERE id = $1', [customerId]);
      if (user.rows.length > 0) {
        paymentPhone = user.rows[0].phone;
      }
    }

    if (paymentPhone) {
      try {
        const network = detectNetwork(paymentPhone);
        await collectPayment(paymentPhone, calculatedFare, id);
        await pool.query(
          `INSERT INTO payments (id, booking_id, amount, method, status)
           VALUES ($1, $2, $3, $4, 'pending')`,
          [uuidv4(), id, calculatedFare, paymentMethod || network.toLowerCase()]
        );
      } catch (paymentErr) {
        req.log.error('Payment collection failed:', paymentErr);
      }
    }

    await redis.publish('booking:created', JSON.stringify({
      bookingId: id,
      type,
      pickup: { lat: pickup_lat, lng: pickup_lng },
      dropoff: { lat: dropoff_lat, lng: dropoff_lng },
      fare: calculatedFare,
    }));

    return reply.status(201).send({
      success: true,
      bookingId: id,
      fare_estimate: calculatedFare,
      distance_km: parseFloat(distance.toFixed(2)),
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to create booking' });
  }
};

const getBooking = async (req, reply) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const result = await pool.query(
      `SELECT b.*,
              d.item_description, d.recipient_name, d.recipient_phone, d.photo_proof, d.confirmed_at,
              r.name as rider_name, r.phone as rider_phone, r.plate_number, r.avg_rating as rider_rating,
              r.selfie_photo as rider_photo,
              cu.name as customer_name, cu.phone as customer_phone,
              rat.score as my_rating, rat.comment as my_rating_comment
       FROM bookings b
       LEFT JOIN deliveries d ON d.booking_id = b.id
       LEFT JOIN riders r ON r.id = b.rider_id
       LEFT JOIN users cu ON cu.id = b.customer_id
       LEFT JOIN ratings rat ON rat.booking_id = b.id AND rat.rated_by = $2
       WHERE b.id = $1`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Booking not found' });
    }

    const booking = result.rows[0];

    if (userRole !== 'admin' && booking.customer_id !== userId && booking.rider_id !== req.user.riderId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    if (booking.status === 'in_progress' || booking.status === 'accepted') {
      const location = await redis.hGet('riders:online', booking.rider_id);
      if (location) {
        booking.rider_location = JSON.parse(location);
      }
    }

    const payment = await pool.query(
      'SELECT * FROM payments WHERE booking_id = $1',
      [id]
    );
    booking.payment = payment.rows[0] || null;

    return reply.send({ booking });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get booking' });
  }
};

const acceptBooking = async (req, reply) => {
  try {
    const { id } = req.params;
    const riderId = req.user.riderId;

    if (!riderId) {
      return reply.status(403).send({ error: 'Only riders can accept bookings' });
    }

    const rider = await pool.query(
      'SELECT id, status, is_online FROM riders WHERE id = $1',
      [riderId]
    );

    if (rider.rows.length === 0 || rider.rows[0].status !== 'verified') {
      return reply.status(403).send({ error: 'Only verified riders can accept bookings' });
    }

    if (!rider.rows[0].is_online) {
      return reply.status(400).send({ error: 'Go online first to accept bookings' });
    }

    const result = await pool.query(
      `UPDATE bookings
       SET rider_id = $1, status = 'accepted'
       WHERE id = $2 AND status = 'pending' AND rider_id IS NULL
       RETURNING id, status`,
      [riderId, id]
    );

    if (result.rows.length === 0) {
      return reply.status(409).send({ error: 'Booking already accepted or not available' });
    }

    await redis.publish('booking:accepted', JSON.stringify({
      bookingId: id,
      riderId,
    }));

    return reply.send({ success: true, booking: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to accept booking' });
  }
};

const requestRider = async (req, reply) => {
  try {
    if (req.user.role === 'rider') {
      return reply.status(403).send({ error: 'Riders cannot request riders' });
    }

    const { id } = req.params;
    const { riderId } = req.body || {};
    const customerId = req.user.userId;

    const booking = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND customer_id = $2`,
      [id, customerId]
    );

    if (booking.rows.length === 0) {
      return reply.status(404).send({ error: 'Booking not found' });
    }

    if (booking.rows[0].status !== 'pending') {
      return reply.status(400).send({ error: 'Booking is no longer pending' });
    }

    if (riderId) {
      const rider = await pool.query(
        `SELECT id, status, is_online FROM riders WHERE id = $1 AND status = 'verified' AND is_online = true AND is_deleted = false`,
        [riderId]
      );

      if (rider.rows.length === 0) {
        return reply.status(404).send({ error: 'Rider not available' });
      }

      const result = await pool.query(
        `UPDATE bookings SET rider_id = $1, status = 'accepted'
         WHERE id = $2 AND status = 'pending' AND rider_id IS NULL
         RETURNING id, status`,
        [riderId, id]
      );

      if (result.rows.length === 0) {
        return reply.status(409).send({ error: 'Booking was already taken by another rider' });
      }

      await redis.publish('booking:accepted', JSON.stringify({ bookingId: id, riderId }));
      return reply.send({ success: true, booking: result.rows[0] });
    } else {
      const lat = booking.rows[0].pickup_lat;
      const lng = booking.rows[0].pickup_lng;

      const nearby = await pool.query(
        `SELECT id FROM riders
         WHERE status = 'verified' AND is_online = true AND is_deleted = false
           AND current_lat IS NOT NULL AND current_lng IS NOT NULL
         ORDER BY (
           6371 * acos(
             cos(radians($2)) * cos(radians(current_lat)) *
             cos(radians(current_lng) - radians($1)) +
             sin(radians($2)) * sin(radians(current_lat))
           )
         ) ASC LIMIT 1`,
        [lng, lat]
      );

      if (nearby.rows.length === 0) {
        return reply.status(404).send({ error: 'No available riders nearby' });
      }

      const nearestId = nearby.rows[0].id;
      const result = await pool.query(
        `UPDATE bookings SET rider_id = $1, status = 'accepted'
         WHERE id = $2 AND status = 'pending' AND rider_id IS NULL
         RETURNING id, status`,
        [nearestId, id]
      );

      if (result.rows.length === 0) {
        return reply.status(409).send({ error: 'Booking was already taken by another rider' });
      }

      await redis.publish('booking:accepted', JSON.stringify({ bookingId: id, riderId: nearestId }));
      return reply.send({ success: true, booking: result.rows[0] });
    }
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to request rider' });
  }
};

const startBooking = async (req, reply) => {
  try {
    const { id } = req.params;
    const riderId = req.user.riderId;

    if (!riderId) {
      return reply.status(403).send({ error: 'Only riders can start bookings' });
    }

    const result = await pool.query(
      `UPDATE bookings
       SET status = 'in_progress', started_at = NOW()
       WHERE id = $1 AND status = 'accepted' AND rider_id = $2
       RETURNING id, status`,
      [id, riderId]
    );

    if (result.rows.length === 0) {
      return reply.status(400).send({ error: 'Cannot start this booking' });
    }

    return reply.send({ success: true, booking: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to start booking' });
  }
};

const completeBooking = async (req, reply) => {
  try {
    const { id } = req.params;
    const riderId = req.user.riderId;

    if (!riderId) {
      return reply.status(403).send({ error: 'Only riders can complete bookings' });
    }

    const booking = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND rider_id = $2 AND status = 'in_progress'`,
      [id, riderId]
    );

    if (booking.rows.length === 0) {
      return reply.status(400).send({ error: 'Cannot complete this booking' });
    }

    const finalFare = booking.rows[0].fare_estimate;

    const result = await pool.query(
      `UPDATE bookings
       SET status = 'completed', completed_at = NOW(), fare_final = $1
       WHERE id = $2 AND status = 'in_progress' AND rider_id = $3
       RETURNING id, status, fare_final`,
      [finalFare, id, riderId]
    );

    await pool.query(
      `UPDATE riders SET total_trips = total_trips + 1 WHERE id = $1`,
      [riderId]
    );

    await pool.query(
      `UPDATE payments SET status = 'held', held_at = NOW(), amount = $1
       WHERE booking_id = $2 AND status = 'pending'`,
      [finalFare, id]
    );

    try {
      const rider = await pool.query('SELECT phone FROM riders WHERE id = $1', [riderId]);
      if (rider.rows.length > 0) {
        await disburseToRider(rider.rows[0].phone, Math.floor(finalFare * 0.85), id);
        await pool.query(
          `UPDATE payments SET status = 'released', released_at = NOW()
           WHERE booking_id = $1 AND status = 'held'`,
          [id]
        );
      }
    } catch (paymentErr) {
      req.log.error('Disbursement failed:', paymentErr);
    }

    return reply.send({ success: true, booking: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to complete booking' });
  }
};

const cancelBooking = async (req, reply) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const riderId = req.user.riderId;
    const { reason } = req.body || {};

    const booking = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND (customer_id = $2 OR rider_id = $3)`,
      [id, userId, riderId]
    );

    if (booking.rows.length === 0) {
      return reply.status(404).send({ error: 'Booking not found' });
    }

    const current = booking.rows[0];
    if (!['pending', 'accepted'].includes(current.status)) {
      return reply.status(400).send({ error: 'Cannot cancel booking in current status' });
    }

    const result = await pool.query(
      `UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND status IN ('pending', 'accepted')
       RETURNING id, status`,
      [id]
    );

    if (current.rider_id) {
      await pool.query(
        `UPDATE riders SET total_cancellations = COALESCE(total_cancellations, 0) + 1 WHERE id = $1`,
        [current.rider_id]
      );

      const riderCancellations = await pool.query(
        `SELECT COUNT(*) as count FROM bookings
         WHERE rider_id = $1 AND status = 'cancelled'
         AND completed_at > NOW() - INTERVAL '24 hours'`,
        [current.rider_id]
      );

      if (parseInt(riderCancellations.rows[0].count) >= 3) {
        await pool.query(
          `UPDATE riders SET status = 'flagged' WHERE id = $1 AND status = 'verified'`,
          [current.rider_id]
        );
      }
    }

    await pool.query(
      `UPDATE payments SET status = 'refunded' WHERE booking_id = $1 AND status IN ('pending', 'held')`,
      [id]
    );

    return reply.send({ success: true, booking: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to cancel booking' });
  }
};

const rateBooking = async (req, reply) => {
  try {
    const { id } = req.params;
    const { score, comment } = req.body;
    const customerId = req.user.userId;

    if (!score || score < 1 || score > 5) {
      return reply.status(400).send({ error: 'Score must be between 1 and 5' });
    }

    const booking = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND customer_id = $2 AND status = 'completed'`,
      [id, customerId]
    );

    if (booking.rows.length === 0) {
      return reply.status(404).send({ error: 'Booking not found or not completed' });
    }

    const existingRating = await pool.query(
      'SELECT id FROM ratings WHERE booking_id = $1 AND rated_by = $2',
      [id, customerId]
    );

    if (existingRating.rows.length > 0) {
      return reply.status(409).send({ error: 'You already rated this booking' });
    }

    const riderId = booking.rows[0].rider_id;

    await pool.query(
      `INSERT INTO ratings (id, booking_id, rated_by, rider_id, score, comment)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), id, customerId, riderId, score, comment || null]
    );

    const stats = await pool.query(
      `SELECT COUNT(*) as total_ratings, AVG(score) as avg_score
       FROM ratings WHERE rider_id = $1`,
      [riderId]
    );

    const { total_ratings, avg_score } = stats.rows[0];

    await pool.query(
      `UPDATE riders SET avg_rating = $1, total_ratings = $2 WHERE id = $3`,
      [parseFloat(avg_score).toFixed(2), parseInt(total_ratings), riderId]
    );

    const avgRating = parseFloat(avg_score);
    if (avgRating < 2.5) {
      await pool.query(
        `UPDATE riders SET status = 'suspended', is_online = false
         WHERE id = $1 AND status = 'verified'`,
        [riderId]
      );
    } else if (avgRating < 3.5) {
      await pool.query(
        `UPDATE riders SET status = 'flagged' WHERE id = $1 AND status = 'verified'`,
        [riderId]
      );
    }

    return reply.send({
      success: true,
      rating: { score, comment },
      rider_stats: { avg_rating: parseFloat(avg_score).toFixed(2), total_ratings: parseInt(total_ratings) },
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to submit rating' });
  }
};

const confirmDelivery = async (req, reply) => {
  try {
    const { id } = req.params;
    const { confirmation_code, photo_proof } = req.body;

    if (!confirmation_code) {
      return reply.status(400).send({ error: 'Confirmation code required' });
    }

    const result = await pool.query(
      `SELECT d.*, b.status as booking_status, b.rider_id
       FROM deliveries d
       JOIN bookings b ON b.id = d.booking_id
       WHERE d.booking_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Delivery not found' });
    }

    const delivery = result.rows[0];

    if (delivery.booking_status !== 'in_progress') {
      return reply.status(400).send({ error: 'Booking is not in progress' });
    }

    if (delivery.confirmation_code !== confirmation_code) {
      return reply.status(400).send({ error: 'Invalid confirmation code' });
    }

    await pool.query(
      `UPDATE deliveries
       SET confirmed_at = NOW(), photo_proof = COALESCE($1, photo_proof)
       WHERE booking_id = $2`,
      [photo_proof || null, id]
    );

    await pool.query(
      `UPDATE bookings SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [id]
    );

    await pool.query(
      `UPDATE payments SET status = 'released', released_at = NOW()
       WHERE booking_id = $1 AND status = 'held'`,
      [id]
    );

    const booking = await pool.query('SELECT fare_final FROM bookings WHERE id = $1', [id]);
    if (booking.rows.length > 0 && delivery.rider_id) {
      try {
        const rider = await pool.query('SELECT phone FROM riders WHERE id = $1', [delivery.rider_id]);
        if (rider.rows.length > 0) {
          await disburseToRider(rider.rows[0].phone, Math.floor(booking.rows[0].fare_final * 0.85), id);
        }
      } catch (paymentErr) {
        req.log.error('Disbursement failed:', paymentErr);
      }
    }

    return reply.send({ success: true, message: 'Delivery confirmed successfully' });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to confirm delivery' });
  }
};

const getCustomerBookings = async (req, reply) => {
  try {
    const customerId = req.user.userId;
    const { status, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT b.*, r.name as rider_name, r.phone as rider_phone, r.plate_number
      FROM bookings b
      LEFT JOIN riders r ON r.id = b.rider_id
      WHERE b.customer_id = $1
    `;
    const params = [customerId];

    if (status) {
      params.push(status);
      query += ` AND b.status = $${params.length}`;
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return reply.send({ bookings: result.rows });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get bookings' });
  }
};

const getRiderBookings = async (req, reply) => {
  try {
    const riderId = req.user.riderId;

    if (!riderId) {
      return reply.status(403).send({ error: 'Only riders can view rider bookings' });
    }

    const { status, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT b.*, cu.phone as customer_phone, cu.name as customer_name
       FROM bookings b
       LEFT JOIN users cu ON cu.id = b.customer_id
       WHERE b.rider_id = $1
    `;
    const params = [riderId];

    if (status) {
      params.push(status);
      query += ` AND b.status = $${params.length}`;
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return reply.send({ bookings: result.rows });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get bookings' });
  }
};

const getPaymentStatus = async (req, reply) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const booking = await pool.query(
      'SELECT customer_id, rider_id FROM bookings WHERE id = $1',
      [id]
    );

    if (booking.rows.length === 0) {
      return reply.status(404).send({ error: 'Booking not found' });
    }

    const b = booking.rows[0];
    if (userId !== b.customer_id && req.user.riderId !== b.rider_id && req.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const payments = await pool.query(
      'SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC',
      [id]
    );

    return reply.send({ payments: payments.rows });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get payment status' });
  }
};

module.exports = {
  createBooking,
  getBooking,
  acceptBooking,
  requestRider,
  startBooking,
  completeBooking,
  cancelBooking,
  rateBooking,
  confirmDelivery,
  getCustomerBookings,
  getRiderBookings,
  getPaymentStatus,
};
