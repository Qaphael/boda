const pool = require('../config/database');
const { redis } = require('../config/redis');
const { v4: uuidv4 } = require('uuid');

const VALID_RIDER_STATUSES = ['pending', 'verified', 'suspended', 'rejected'];
const PLATE_REGEX = /^UG[A-Z]{2,3}\s?\d{3,4}[A-Z]?$/;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const validatePhoto = (photo, fieldName) => {
  if (!photo) return null;
  if (typeof photo !== 'string') return `${fieldName} must be a string (base64 or URL)`;
  if (photo.startsWith('data:')) {
    const match = photo.match(/^data:([^;]+);/);
    if (!match) return `${fieldName} has invalid format`;
    if (!ALLOWED_IMAGE_TYPES.includes(match[1])) return `${fieldName} must be JPEG, PNG, or WebP`;
    const base64 = photo.split(',')[1];
    const size = Math.ceil(base64.length * 3 / 4);
    if (size > MAX_FILE_SIZE) return `${fieldName} exceeds 5MB limit`;
  } else if (photo.startsWith('http')) {
    try { new URL(photo); } catch { return `${fieldName} has invalid URL`; }
  } else {
    return `${fieldName} must be a data URI or URL`;
  }
  return null;
};

const registerRider = async (req, reply) => {
  try {
    const { phone, name, national_id, plate_number, id_photo, selfie_photo } = req.body;

    if (!phone || !name || !national_id || !plate_number) {
      return reply.status(400).send({ error: 'Missing required fields: phone, name, national_id, plate_number' });
    }

    if (!/^256\d{9}$/.test(phone)) {
      return reply.status(400).send({ error: 'Invalid phone format. Use 256XXXXXXXXX' });
    }

    if (!PLATE_REGEX.test(plate_number.replace(/\s/g, ''))) {
      return reply.status(400).send({ error: 'Invalid plate number format. Expected: UGXXX 1234A' });
    }

    if (name.length < 2 || name.length > 100) {
      return reply.status(400).send({ error: 'Name must be 2-100 characters' });
    }

    const photoErrors = [];
    const idErr = validatePhoto(id_photo, 'ID photo');
    if (idErr) photoErrors.push(idErr);
    const selfieErr = validatePhoto(selfie_photo, 'Selfie photo');
    if (selfieErr) photoErrors.push(selfieErr);
    if (photoErrors.length > 0) {
      return reply.status(400).send({ error: photoErrors.join(', ') });
    }

    const existing = await pool.query(
      'SELECT id FROM riders WHERE (national_id = $1 OR phone = $2) AND is_deleted = false',
      [national_id, phone]
    );

    if (existing.rows.length > 0) {
      return reply.status(409).send({ error: 'Registration already exists' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO riders (id, phone, name, national_id, plate_number, id_photo, selfie_photo, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [id, phone, name, national_id, plate_number, id_photo || null, selfie_photo || null]
    );

    return reply.status(201).send({
      success: true,
      riderId: id,
      status: 'pending',
      message: 'Registration submitted. Await admin verification.',
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to register rider' });
  }
};

const getNearbyRiders = async (req, reply) => {
  try {
    const { lat, lng, radius = 3 } = req.query;

    if (!lat || !lng) {
      return reply.status(400).send({ error: 'Latitude and longitude required' });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = parseFloat(radius);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum)) {
      return reply.status(400).send({ error: 'Invalid coordinates or radius' });
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return reply.status(400).send({ error: 'Coordinates out of range' });
    }

    if (radiusNum < 0.1 || radiusNum > 50) {
      return reply.status(400).send({ error: 'Radius must be between 0.1 and 50 km' });
    }

    const cachedKey = `nearby:${Math.round(latNum * 100)}:${Math.round(lngNum * 100)}`;
    const cached = await redis.get(cachedKey);
    if (cached) {
      return reply.send({ riders: JSON.parse(cached), cached: true });
    }

    const result = await pool.query(
      `SELECT id, name, phone, plate_number, current_lat, current_lng, avg_rating, total_trips, selfie_photo
       FROM riders
       WHERE status = 'verified'
         AND is_online = true
         AND is_deleted = false
         AND current_lat IS NOT NULL
         AND current_lng IS NOT NULL
         AND ST_Distance(
           ST_SetSRID(ST_MakePoint(current_lng, current_lat), 4326)::geography,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         ) <= $3 * 1000
       ORDER BY avg_rating DESC, total_trips DESC
       LIMIT 20`,
      [lngNum, latNum, radiusNum]
    );

    await redis.setEx(cachedKey, 30, JSON.stringify(result.rows));

    return reply.send({ riders: result.rows, cached: false });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to find nearby riders' });
  }
};

const updateLocation = async (req, reply) => {
  try {
    const riderId = req.user.riderId;
    const { lat, lng } = req.body || {};

    if (!riderId) {
      return reply.status(403).send({ error: 'Only riders can update location' });
    }

    if (!lat || !lng) {
      return reply.status(400).send({ error: 'Latitude and longitude required' });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return reply.status(400).send({ error: 'Invalid coordinates' });
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return reply.status(400).send({ error: 'Coordinates out of range' });
    }

    const result = await pool.query(
      `UPDATE riders SET current_lat = $1, current_lng = $2
       WHERE id = $3 AND status = 'verified'
       RETURNING id, current_lat, current_lng`,
      [latNum, lngNum, riderId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Rider not found or not verified' });
    }

    await redis.hSet('riders:locations', riderId, JSON.stringify({
      lat: latNum,
      lng: lngNum,
      updatedAt: Date.now(),
    }));

    return reply.send({ success: true, location: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to update location' });
  }
};

const toggleOnline = async (req, reply) => {
  try {
    const riderId = req.user.riderId;
    const { is_online } = req.body || {};

    if (!riderId) {
      return reply.status(403).send({ error: 'Only riders can toggle online status' });
    }

    if (typeof is_online !== 'boolean') {
      return reply.status(400).send({ error: 'is_online must be a boolean' });
    }

    const result = await pool.query(
      `UPDATE riders SET is_online = $1
       WHERE id = $2 AND status = 'verified'
       RETURNING id, is_online`,
      [is_online, riderId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Rider not found or not verified' });
    }

    if (!is_online) {
      await redis.hDel('riders:online', riderId);
    }

    return reply.send({ success: true, is_online: result.rows[0].is_online });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to toggle online status' });
  }
};

const getRiderProfile = async (req, reply) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, name, phone, plate_number, avg_rating, total_trips, status, selfie_photo, created_at
       FROM riders WHERE id = $1 AND is_deleted = false`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Rider not found' });
    }

    const ratings = await pool.query(
      `SELECT r.score, r.comment, r.created_at, u.phone as rated_by
       FROM ratings r
       LEFT JOIN users u ON u.id = r.rated_by
       WHERE r.rider_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [id]
    );

    return reply.send({
      rider: result.rows[0],
      recent_ratings: ratings.rows,
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get rider profile' });
  }
};

const getRiderEarnings = async (req, reply) => {
  try {
    const riderId = req.user.riderId;
    const { period = 'all' } = req.query;

    if (!riderId) {
      return reply.status(403).send({ error: 'Only riders can view earnings' });
    }

    let dateFilter = '';
    const params = [riderId];

    if (period === 'today') {
      dateFilter = 'AND b.completed_at >= CURRENT_DATE';
    } else if (period === 'week') {
      dateFilter = 'AND b.completed_at >= CURRENT_DATE - INTERVAL \'7 days\'';
    } else if (period === 'month') {
      dateFilter = 'AND b.completed_at >= CURRENT_DATE - INTERVAL \'30 days\'';
    }

    const result = await pool.query(
      `SELECT b.id, b.fare_final, b.completed_at, b.type, b.pickup_address, b.dropoff_address
       FROM bookings b
       WHERE b.rider_id = $1 AND b.status = 'completed' ${dateFilter}
       ORDER BY b.completed_at DESC
       LIMIT 100`,
      params
    );

    const totalEarnings = result.rows.reduce((sum, b) => sum + (b.fare_final || 0), 0);
    const riderShare = Math.floor(totalEarnings * 0.85);
    const platformFee = totalEarnings - riderShare;

    const stats = await pool.query(
      `SELECT
         COUNT(*) as total_trips,
         COALESCE(SUM(fare_final), 0) as total_revenue,
         COALESCE(AVG(fare_final), 0) as avg_fare,
         COALESCE(MAX(fare_final), 0) as highest_fare
       FROM bookings b
       WHERE b.rider_id = $1 AND b.status = 'completed' ${dateFilter}`,
      params
    );

    return reply.send({
      bookings: result.rows,
      summary: {
        total_trips: parseInt(stats.rows[0].total_trips),
        total_revenue: parseInt(stats.rows[0].total_revenue),
        rider_share: Math.floor(parseInt(stats.rows[0].total_revenue) * 0.85),
        platform_fee: parseInt(stats.rows[0].total_revenue) - Math.floor(parseInt(stats.rows[0].total_revenue) * 0.85),
        avg_fare: Math.round(parseFloat(stats.rows[0].avg_fare)),
        highest_fare: parseInt(stats.rows[0].highest_fare),
      },
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get earnings' });
  }
};

const updateRiderDocuments = async (req, reply) => {
  try {
    const riderId = req.user.riderId;
    const { id_photo, selfie_photo } = req.body || {};

    if (!riderId) {
      return reply.status(403).send({ error: 'Only riders can update documents' });
    }

    const photoErrors = [];
    if (id_photo) {
      const err = validatePhoto(id_photo, 'ID photo');
      if (err) photoErrors.push(err);
    }
    if (selfie_photo) {
      const err = validatePhoto(selfie_photo, 'Selfie photo');
      if (err) photoErrors.push(err);
    }
    if (photoErrors.length > 0) {
      return reply.status(400).send({ error: photoErrors.join(', ') });
    }

    const result = await pool.query(
      `UPDATE riders
       SET id_photo = COALESCE($1, id_photo),
           selfie_photo = COALESCE($2, selfie_photo)
       WHERE id = $3 AND status = 'pending'
       RETURNING id, id_photo, selfie_photo`,
      [id_photo, selfie_photo, riderId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Rider not found or already processed' });
    }

    return reply.send({ success: true, documents: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to update documents' });
  }
};

const getRiderVehicle = async (req, reply) => {
  try {
    const riderId = req.user.riderId;
    if (!riderId) return reply.status(403).send({ error: 'Only riders can view vehicle info' });

    const result = await pool.query(
      `SELECT id, name, phone, plate_number, national_id, status, selfie_photo, id_photo,
              avg_rating, total_trips, total_ratings, total_cancellations, created_at
       FROM riders WHERE id = $1 AND is_deleted = false`,
      [riderId]
    );

    if (result.rows.length === 0) return reply.status(404).send({ error: 'Rider not found' });

    return reply.send({ vehicle: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get vehicle info' });
  }
};

const updateRiderVehicle = async (req, reply) => {
  try {
    const riderId = req.user.riderId;
    if (!riderId) return reply.status(403).send({ error: 'Only riders can update vehicle info' });

    const { plate_number, id_photo, selfie_photo } = req.body || {};

    const result = await pool.query(
      `UPDATE riders SET
        plate_number = COALESCE($1, plate_number),
        id_photo = COALESCE($2, id_photo),
        selfie_photo = COALESCE($3, selfie_photo),
        updated_at = NOW()
       WHERE id = $4 AND is_deleted = false
       RETURNING id, plate_number, id_photo, selfie_photo`,
      [plate_number, id_photo, selfie_photo, riderId]
    );

    if (result.rows.length === 0) return reply.status(404).send({ error: 'Rider not found' });

    return reply.send({ success: true, vehicle: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to update vehicle info' });
  }
};

const getRiderTickets = async (req, reply) => {
  try {
    const riderId = req.user.riderId;
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT t.id, t.subject, t.status, t.priority, t.category, t.created_at, t.updated_at
       FROM support_tickets t
       WHERE t.rider_id = $1 OR t.user_id = $2
       ORDER BY t.created_at DESC LIMIT 20`,
      [riderId, userId]
    );

    return reply.send({ tickets: result.rows });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get tickets' });
  }
};

const createRiderTicket = async (req, reply) => {
  try {
    const riderId = req.user.riderId;
    const userId = req.user.userId;
    const { subject, description, category = 'general', priority = 'medium', booking_id } = req.body;

    if (!subject || !description) {
      return reply.status(400).send({ error: 'Subject and description are required' });
    }

    const result = await pool.query(
      `INSERT INTO support_tickets (subject, description, priority, category, user_id, rider_id, booking_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [subject, description, priority, category, userId, riderId, booking_id || null]
    );

    return reply.status(201).send({ ticket: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to create ticket' });
  }
};

const getRiderTicketDetails = async (req, reply) => {
  try {
    const { id } = req.params;
    const riderId = req.user.riderId;
    const userId = req.user.userId;

    const ticket = await pool.query(
      `SELECT t.* FROM support_tickets t
       WHERE t.id = $1 AND (t.rider_id = $2 OR t.user_id = $3)`,
      [id, riderId, userId]
    );

    if (ticket.rows.length === 0) return reply.status(404).send({ error: 'Ticket not found' });

    const messages = await pool.query(
      `SELECT tm.*, CASE WHEN tm.admin_id IS NOT NULL THEN 'Support' ELSE 'You' END as sender
       FROM ticket_messages tm
       WHERE tm.ticket_id = $1
       ORDER BY tm.created_at ASC`, [id]
    );

    return reply.send({ ticket: ticket.rows[0], messages: messages.rows });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get ticket details' });
  }
};

const replyToTicket = async (req, reply) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { message } = req.body;

    if (!message) return reply.status(400).send({ error: 'Message is required' });

    const ticket = await pool.query(
      'SELECT id FROM support_tickets WHERE id = $1 AND (rider_id = $2 OR user_id = $3)',
      [id, req.user.riderId, userId]
    );

    if (ticket.rows.length === 0) return reply.status(404).send({ error: 'Ticket not found' });

    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, message, type) VALUES ($1, $2, 'user_message')`,
      [id, message]
    );

    await pool.query('UPDATE support_tickets SET updated_at = NOW() WHERE id = $1', [id]);

    return reply.status(201).send({ success: true });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to reply' });
  }
};

const getRiderIncentives = async (req, reply) => {
  try {
    const riderId = req.user.riderId;
    if (!riderId) return reply.status(403).send({ error: 'Only riders can view incentives' });

    const stats = await pool.query(
      `SELECT COUNT(*) as total_trips,
              COALESCE(SUM(fare_final), 0) as total_earnings,
              COALESCE(AVG(fare_final), 0) as avg_fare
       FROM bookings WHERE rider_id = $1 AND status = 'completed'`,
      [riderId]
    );

    const dailyTrips = await pool.query(
      `SELECT COUNT(*) as count FROM bookings
       WHERE rider_id = $1 AND status = 'completed'
       AND completed_at >= CURRENT_DATE`,
      [riderId]
    );

    const weeklyTrips = await pool.query(
      `SELECT COUNT(*) as count FROM bookings
       WHERE rider_id = $1 AND status = 'completed'
       AND completed_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [riderId]
    );

    const rating = await pool.query(
      'SELECT avg_rating, total_ratings FROM riders WHERE id = $1',
      [riderId]
    );

    const totalTrips = parseInt(stats.rows[0].total_trips);
    const totalEarnings = parseInt(stats.rows[0].total_earnings);
    const avgFare = Math.round(parseFloat(stats.rows[0].avg_fare));
    const dayTrips = parseInt(dailyTrips.rows[0].count);
    const weekTrips = parseInt(weeklyTrips.rows[0].count);
    const avgRating = parseFloat(rating.rows[0]?.avg_rating || 0);

    let tier = 'Bronze';
    let nextTier = 'Silver';
    let nextTierTrips = 50;
    if (totalTrips >= 200) { tier = 'Gold'; nextTier = 'Platinum'; nextTierTrips = 500; }
    else if (totalTrips >= 50) { tier = 'Silver'; nextTier = 'Gold'; nextTierTrips = 200; }

    const quests = [
      { id: 'daily5', title: 'Daily Hustle', description: 'Complete 5 trips today', target: 5, current: dayTrips, icon: '🔥', reward: 'UGX 2,000' },
      { id: 'highRating', title: 'Five Star Rider', description: 'Maintain 4.8+ rating for 7 days', target: 7, current: avgRating >= 4.8 ? 7 : 0, icon: '⭐', reward: 'Priority bookings' },
      { id: 'weekendWarrior', title: 'Weekend Warrior', description: 'Complete 20 trips this week', target: 20, current: weekTrips, icon: '💪', reward: 'UGX 15,000' },
    ];

    return reply.send({
      tier, nextTier, nextTierTrips,
      stats: { totalTrips, totalEarnings, avgFare, avgRating: avgRating.toFixed(2) },
      quests,
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get incentives' });
  }
};

module.exports = {
  registerRider,
  getNearbyRiders,
  updateLocation,
  toggleOnline,
  getRiderProfile,
  getRiderEarnings,
  updateRiderDocuments,
  getRiderVehicle,
  updateRiderVehicle,
  getRiderTickets,
  createRiderTicket,
  getRiderTicketDetails,
  replyToTicket,
  getRiderIncentives,
};
