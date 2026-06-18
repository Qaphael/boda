const pool = require('../config/database');

const getSettings = async (req, reply) => {
  try {
    const result = await pool.query('SELECT key, value, category FROM admin_settings ORDER BY category, key');
    const settings = {};
    result.rows.forEach(row => {
      if (!settings[row.category]) settings[row.category] = {};
      let val = row.value;
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (!isNaN(val) && val !== '') val = Number(val);
      settings[row.category][row.key] = val;
    });
    return reply.send({ settings });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get settings' });
  }
};

const updateSettings = async (req, reply) => {
  try {
    const { settings } = req.body;

    for (const [category, items] of Object.entries(settings)) {
      for (const [key, value] of Object.entries(items)) {
        await pool.query(
          `INSERT INTO admin_settings (key, value, category, updated_by, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $4, updated_at = NOW()`,
          [key, String(value), category, req.user.userId]
        );
      }
    }

    return reply.send({ success: true, message: 'Settings updated' });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to update settings' });
  }
};

const getProfile = async (req, reply) => {
  try {
    const result = await pool.query(
      `SELECT u.name, u.phone, u.email, u.profile_photo
       FROM users u JOIN admins a ON a.user_id = u.id
       WHERE u.id = $1`, [req.user.userId]
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Admin not found' });
    }
    return reply.send({ profile: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get profile' });
  }
};

const updateProfile = async (req, reply) => {
  try {
    const { name, phone, email } = req.body;
    await pool.query(
      'UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), email = COALESCE($3, email), updated_at = NOW() WHERE id = $4',
      [name, phone, email, req.user.userId]
    );
    return reply.send({ success: true, message: 'Profile updated' });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to update profile' });
  }
};

module.exports = { getSettings, updateSettings, getProfile, updateProfile };
