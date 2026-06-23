const pool = require('../config/database');

const getTickets = async (req, reply) => {
  try {
    const { status, priority, category, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT t.*, u.phone as user_phone, u.name as user_name,
             r.name as rider_name, r.phone as rider_phone
      FROM support_tickets t
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN riders r ON r.id = t.rider_id
      WHERE 1=1
    `;
    const params = [];

    if (status) { params.push(status); query += ` AND t.status = $${params.length}`; }
    if (priority) { params.push(priority); query += ` AND t.priority = $${params.length}`; }
    if (category) { params.push(category); query += ` AND t.category = $${params.length}`; }

    params.push(limit, offset);
    query += ` ORDER BY t.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_open,
        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent,
        COUNT(*) FILTER (WHERE status = 'open') as open_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as created_today
      FROM support_tickets
    `);

    return reply.send({ tickets: result.rows, stats: stats.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get tickets' });
  }
};

const getTicketDetails = async (req, reply) => {
  try {
    const { id } = req.params;

    const ticket = await pool.query(
      `SELECT t.*, u.phone as user_phone, u.name as user_name,
              r.name as rider_name, r.phone as rider_phone
       FROM support_tickets t
       LEFT JOIN users u ON u.id = t.user_id
       LEFT JOIN riders r ON r.id = t.rider_id
       WHERE t.id = $1`, [id]
    );

    if (ticket.rows.length === 0) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    const messages = await pool.query(
      `SELECT tm.*, u.name as admin_name
       FROM ticket_messages tm
       LEFT JOIN users u ON u.id = tm.admin_id
       WHERE tm.ticket_id = $1
       ORDER BY tm.created_at ASC`, [id]
    );

    return reply.send({ ticket: ticket.rows[0], messages: messages.rows });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to get ticket details' });
  }
};

const createTicket = async (req, reply) => {
  try {
    const { subject, description, priority = 'medium', category = 'general', user_id, rider_id, booking_id } = req.body;

    if (!subject || !description) {
      return reply.status(400).send({ error: 'Subject and description are required' });
    }

    const result = await pool.query(
      `INSERT INTO support_tickets (subject, description, priority, category, user_id, rider_id, booking_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [subject, description, priority, category, user_id || null, rider_id || null, booking_id || null]
    );

    return reply.status(201).send({ ticket: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to create ticket' });
  }
};

const updateTicketStatus = async (req, reply) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const result = await pool.query(
      `UPDATE support_tickets SET status = $1::varchar, updated_at = NOW(),
       resolved_at = CASE WHEN $1::varchar = 'resolved' THEN NOW() ELSE resolved_at END
       WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    return reply.send({ ticket: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to update ticket' });
  }
};

const addTicketMessage = async (req, reply) => {
  try {
    const { id } = req.params;
    const { message, type = 'admin_reply' } = req.body;

    if (!message) {
      return reply.status(400).send({ error: 'Message is required' });
    }

    const result = await pool.query(
      `INSERT INTO ticket_messages (ticket_id, admin_id, message, type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, req.user.userId, message, type]
    );

    await pool.query(
      `UPDATE support_tickets SET updated_at = NOW() WHERE id = $1`, [id]
    );

    return reply.status(201).send({ message: result.rows[0] });
  } catch (err) {
    req.log.error(err);
    return reply.status(500).send({ error: 'Failed to add message' });
  }
};

module.exports = { getTickets, getTicketDetails, createTicket, updateTicketStatus, addTicketMessage };
