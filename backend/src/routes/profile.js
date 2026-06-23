const pool = require('../config/database');

const getCustomerProfile = async (req, reply) => {
  try {
    const userId = req.user.userId;

    const userResult = await pool.query(
      'SELECT id, phone, name, email, profile_photo, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const statsResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'completed' AND type = 'ride') AS total_rides,
        COUNT(*) FILTER (WHERE status = 'completed' AND type = 'delivery') AS total_deliveries,
        COUNT(*) AS total_bookings,
        COALESCE(SUM(fare_final) FILTER (WHERE status = 'completed'), 0) AS total_spent,
        COALESCE(AVG(distance_km) FILTER (WHERE status = 'completed'), 0) AS avg_distance,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS total_cancellations
      FROM bookings WHERE customer_id = $1`,
      [userId]
    );

    const ratingResult = await pool.query(
      `SELECT COALESCE(AVG(score), 0) AS avg_rating_given, COUNT(*) AS ratings_given
       FROM ratings WHERE rated_by = $1`,
      [userId]
    );

    const recentResult = await pool.query(
      `SELECT b.id, b.type, b.status, b.fare_final, b.created_at,
              r.name AS rider_name, b.pickup_address, b.dropoff_address
       FROM bookings b
       LEFT JOIN riders r ON r.id = b.rider_id
       WHERE b.customer_id = $1
       ORDER BY b.created_at DESC LIMIT 5`,
      [userId]
    );

    return reply.send({
      user: userResult.rows[0],
      stats: {
        total_rides: parseInt(statsResult.rows[0].total_rides),
        total_deliveries: parseInt(statsResult.rows[0].total_deliveries),
        total_bookings: parseInt(statsResult.rows[0].total_bookings),
        total_spent: parseInt(statsResult.rows[0].total_spent),
        avg_distance: parseFloat(parseFloat(statsResult.rows[0].avg_distance).toFixed(1)),
        total_cancellations: parseInt(statsResult.rows[0].total_cancellations),
        avg_rating_given: parseFloat(parseFloat(ratingResult.rows[0].avg_rating_given).toFixed(1)),
        ratings_given: parseInt(ratingResult.rows[0].ratings_given),
      },
      recent_bookings: recentResult.rows,
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get profile' });
  }
};

const updateCustomerProfile = async (req, reply) => {
  try {
    const userId = req.user.userId;
    const { name, email, profile_photo } = req.body || {};

    const updates = [];
    const params = [];

    if (name !== undefined) {
      params.push(name);
      updates.push(`name = $${params.length}`);
    }
    if (email !== undefined) {
      params.push(email);
      updates.push(`email = $${params.length}`);
    }
    if (profile_photo !== undefined) {
      params.push(profile_photo);
      updates.push(`profile_photo = $${params.length}`);
    }

    if (updates.length === 0) {
      return reply.status(400).send({ error: 'No fields to update' });
    }

    params.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING id, phone, name, email, profile_photo`,
      params
    );

    return reply.send({ success: true, user: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to update profile' });
  }
};

const getSavedPlaces = async (req, reply) => {
  try {
    const result = await pool.query(
      'SELECT * FROM saved_places WHERE user_id = $1 AND is_deleted = false ORDER BY sort_order ASC, created_at ASC',
      [req.user.userId]
    );
    return reply.send({ places: result.rows });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get saved places' });
  }
};

const addSavedPlace = async (req, reply) => {
  try {
    const { label, address, lat, lng, icon } = req.body || {};
    if (!label || !address || !lat || !lng) {
      return reply.status(400).send({ error: 'label, address, lat, lng required' });
    }
    const result = await pool.query(
      'INSERT INTO saved_places (user_id, label, address, lat, lng, icon) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.userId, label, address, lat, lng, icon || '📍']
    );
    return reply.send({ success: true, place: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to add saved place' });
  }
};

const updateSavedPlace = async (req, reply) => {
  try {
    const { id } = req.params;
    const { label, address, lat, lng, icon } = req.body || {};
    const result = await pool.query(
      `UPDATE saved_places SET label = COALESCE($1, label), address = COALESCE($2, address),
       lat = COALESCE($3, lat), lng = COALESCE($4, lng), icon = COALESCE($5, icon), updated_at = NOW()
       WHERE id = $6 AND user_id = $7 RETURNING *`,
      [label, address, lat, lng, icon, id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Place not found' });
    }
    return reply.send({ success: true, place: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to update place' });
  }
};

const deleteSavedPlace = async (req, reply) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE saved_places SET is_deleted = true WHERE id = $1 AND user_id = $2 AND is_deleted = false RETURNING id',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Place not found' });
    }
    return reply.send({ success: true });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to delete place' });
  }
};

const getPaymentMethods = async (req, reply) => {
  try {
    const result = await pool.query(
      'SELECT * FROM payment_methods WHERE user_id = $1 AND is_deleted = false ORDER BY is_default DESC, created_at DESC',
      [req.user.userId]
    );
    return reply.send({ methods: result.rows });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get payment methods' });
  }
};

const addPaymentMethod = async (req, reply) => {
  try {
    const { type, phone_number } = req.body || {};
    if (!type || !phone_number) {
      return reply.status(400).send({ error: 'type and phone_number required' });
    }
    if (!['mtn', 'airtel', 'cash'].includes(type)) {
      return reply.status(400).send({ error: 'type must be mtn, airtel, or cash' });
    }

    const existing = await pool.query(
      'SELECT id FROM payment_methods WHERE user_id = $1 AND phone_number = $2 AND is_deleted = false',
      [req.user.userId, phone_number]
    );
    if (existing.rows.length > 0) {
      return reply.status(409).send({ error: 'This number is already added' });
    }

    const hasMethods = await pool.query(
      'SELECT id FROM payment_methods WHERE user_id = $1 AND is_deleted = false LIMIT 1',
      [req.user.userId]
    );

    const isDefault = hasMethods.rows.length === 0;
    const result = await pool.query(
      'INSERT INTO payment_methods (user_id, type, phone_number, is_default) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.userId, type, phone_number, isDefault]
    );
    return reply.send({ success: true, method: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to add payment method' });
  }
};

const setDefaultPayment = async (req, reply) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE payment_methods SET is_default = false WHERE user_id = $1 AND is_deleted = false',
      [req.user.userId]
    );
    const result = await pool.query(
      'UPDATE payment_methods SET is_default = true WHERE id = $1 AND user_id = $2 AND is_deleted = false RETURNING *',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Payment method not found' });
    }
    return reply.send({ success: true, method: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to set default' });
  }
};

const deletePaymentMethod = async (req, reply) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE payment_methods SET is_deleted = true WHERE id = $1 AND user_id = $2 AND is_deleted = false RETURNING id, is_default',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Payment method not found' });
    }
    if (result.rows[0].is_default) {
      const first = await pool.query(
        'SELECT id FROM payment_methods WHERE user_id = $1 AND is_deleted = false ORDER BY created_at ASC LIMIT 1',
        [req.user.userId]
      );
      if (first.rows.length > 0) {
        await pool.query('UPDATE payment_methods SET is_default = true WHERE id = $1', [first.rows[0].id]);
      }
    }
    return reply.send({ success: true });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to delete payment method' });
  }
};

const getReferral = async (req, reply) => {
  try {
    const result = await pool.query(
      'SELECT code, uses, created_at FROM referral_codes WHERE user_id = $1',
      [req.user.userId]
    );
    if (result.rows.length === 0) {
      const code = generateRefCode();
      await pool.query(
        'INSERT INTO referral_codes (user_id, code) VALUES ($1, $2)',
        [req.user.userId, code]
      );
      return reply.send({ code, uses: 0 });
    }
    return reply.send(result.rows[0]);
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get referral code' });
  }
};

function generateRefCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BODA-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const applyReferral = async (req, reply) => {
  try {
    const { code } = req.body || {};
    if (!code) return reply.status(400).send({ error: 'Referral code required' });

    const referrer = await pool.query(
      'SELECT user_id FROM referral_codes WHERE code = $1',
      [code]
    );
    if (referrer.rows.length === 0) {
      return reply.status(404).send({ error: 'Invalid referral code' });
    }
    if (referrer.rows[0].user_id === req.user.userId) {
      return reply.status(400).send({ error: 'Cannot use your own code' });
    }

    const already = await pool.query(
      'SELECT id FROM referrals WHERE referred_id = $1',
      [req.user.userId]
    );
    if (already.rows.length > 0) {
      return reply.status(409).send({ error: 'You already used a referral code' });
    }

    await pool.query(
      'INSERT INTO referrals (referrer_id, referred_id) VALUES ($1, $2)',
      [referrer.rows[0].user_id, req.user.userId]
    );
    await pool.query(
      'UPDATE referral_codes SET uses = uses + 1 WHERE code = $1',
      [code]
    );
    return reply.send({ success: true, message: 'Referral applied! You and your friend earn rewards.' });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to apply referral' });
  }
};

const getEmergencyContacts = async (req, reply) => {
  try {
    const result = await pool.query(
      'SELECT * FROM emergency_contacts WHERE user_id = $1 AND is_deleted = false ORDER BY created_at ASC',
      [req.user.userId]
    );
    return reply.send({ contacts: result.rows });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get contacts' });
  }
};

const addEmergencyContact = async (req, reply) => {
  try {
    const { name, phone, relationship } = req.body || {};
    if (!name || !phone) {
      return reply.status(400).send({ error: 'name and phone required' });
    }
    const count = await pool.query(
      'SELECT COUNT(*) FROM emergency_contacts WHERE user_id = $1',
      [req.user.userId]
    );
    if (parseInt(count.rows[0].count) >= 3) {
      return reply.status(400).send({ error: 'Maximum 3 emergency contacts' });
    }
    const result = await pool.query(
      'INSERT INTO emergency_contacts (user_id, name, phone, relationship) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.userId, name, phone, relationship || null]
    );
    return reply.send({ success: true, contact: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to add contact' });
  }
};

const deleteEmergencyContact = async (req, reply) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE emergency_contacts SET is_deleted = true WHERE id = $1 AND user_id = $2 AND is_deleted = false RETURNING id',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Contact not found' });
    }
    return reply.send({ success: true });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to delete contact' });
  }
};

const getSettings = async (req, reply) => {
  try {
    const result = await pool.query(
      'SELECT setting_key, setting_value FROM user_settings WHERE user_id = $1',
      [req.user.userId]
    );
    const settings = {};
    result.rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    return reply.send({ settings });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get settings' });
  }
};

const updateSettings = async (req, reply) => {
  try {
    const userId = req.user.userId;
    const settings = req.body || {};

    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO user_settings (user_id, setting_key, setting_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, setting_key) DO UPDATE SET setting_value = $3`,
        [userId, key, String(value)]
      );
    }
    return reply.send({ success: true });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to update settings' });
  }
};

const getNotifications = async (req, reply) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customer_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.userId]
    );
    return reply.send({ notifications: result.rows });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get notifications' });
  }
};

const markNotificationRead = async (req, reply) => {
  try {
    await pool.query(
      'UPDATE customer_notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    return reply.send({ success: true });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to mark read' });
  }
};

const markAllRead = async (req, reply) => {
  try {
    await pool.query(
      'UPDATE customer_notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user.userId]
    );
    return reply.send({ success: true });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to mark all read' });
  }
};

module.exports = {
  getCustomerProfile,
  updateCustomerProfile,
  getSavedPlaces,
  addSavedPlace,
  updateSavedPlace,
  deleteSavedPlace,
  getPaymentMethods,
  addPaymentMethod,
  setDefaultPayment,
  deletePaymentMethod,
  getReferral,
  applyReferral,
  getEmergencyContacts,
  addEmergencyContact,
  deleteEmergencyContact,
  getSettings,
  updateSettings,
  getNotifications,
  markNotificationRead,
  markAllRead,
};
