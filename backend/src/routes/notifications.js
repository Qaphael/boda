const pool = require('../config/database');

const getNotifications = async (req, reply) => {
  try {
    const { limit = 50, offset = 0, unread_only } = req.query;
    const adminId = req.user.userId;

    let query = 'SELECT * FROM notifications WHERE admin_id = $1';
    const params = [adminId];

    if (unread_only === 'true') {
      params.push(true);
      query += ` AND is_read = $${params.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    const unreadCount = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE admin_id = $1 AND is_read = false',
      [adminId]
    );

    return reply.send({
      notifications: result.rows,
      unread_count: parseInt(unreadCount.rows[0].count),
    });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get notifications' });
  }
};

const markAsRead = async (req, reply) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND admin_id = $2',
      [id, adminId]
    );
    return reply.send({ success: true });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to mark notification' });
  }
};

const markAllAsRead = async (req, reply) => {
  try {
    const adminId = req.user.userId;
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE admin_id = $1 AND is_read = false',
      [adminId]
    );
    return reply.send({ success: true });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to mark notifications' });
  }
};

const deleteNotification = async (req, reply) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;
    await pool.query('DELETE FROM notifications WHERE id = $1 AND admin_id = $2', [id, adminId]);
    return reply.send({ success: true });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to delete notification' });
  }
};

const createNotification = async ({ adminId, type, title, message, entityType, entityId, actionUrl }) => {
  try {
    await pool.query(
      `INSERT INTO notifications (admin_id, type, title, message, entity_type, entity_id, action_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [adminId, type, title, message, entityType || null, entityId || null, actionUrl || null]
    );
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
};

const notifyAllAdmins = async ({ type, title, message, entityType, entityId, actionUrl }) => {
  try {
    const admins = await pool.query('SELECT user_id FROM admins WHERE is_active = true');
    for (const admin of admins.rows) {
      await createNotification({
        adminId: admin.user_id,
        type, title, message, entityType, entityId, actionUrl,
      });
    }
  } catch (err) {
    console.error('Failed to notify admins:', err);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification, createNotification, notifyAllAdmins };
