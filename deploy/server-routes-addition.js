const supportRoutes = require('./routes/support');
const settingsRoutes = require('./routes/settings');

// Add to server.js after existing admin routes:

// Support Tickets
fastify.get('/admin/support/tickets', { preHandler: [authenticateToken, requireRole(['admin'])] }, supportRoutes.getTickets);
fastify.get('/admin/support/tickets/:id', { preHandler: [authenticateToken, requireRole(['admin'])] }, supportRoutes.getTicketDetails);
fastify.post('/admin/support/tickets', { preHandler: [authenticateToken, requireRole(['admin'])] }, supportRoutes.createTicket);
fastify.patch('/admin/support/tickets/:id/status', { preHandler: [authenticateToken, requireRole(['admin'])] }, supportRoutes.updateTicketStatus);
fastify.post('/admin/support/tickets/:id/messages', { preHandler: [authenticateToken, requireRole(['admin'])] }, supportRoutes.addTicketMessage);

// Settings & Profile
fastify.get('/admin/settings', { preHandler: [authenticateToken, requireRole(['admin'])] }, settingsRoutes.getSettings);
fastify.put('/admin/settings', { preHandler: [authenticateToken, requireRole(['admin'])] }, settingsRoutes.updateSettings);
fastify.get('/admin/profile', { preHandler: [authenticateToken, requireRole(['admin'])] }, settingsRoutes.getProfile);
fastify.put('/admin/profile', { preHandler: [authenticateToken, requireRole(['admin'])] }, settingsRoutes.updateProfile);
