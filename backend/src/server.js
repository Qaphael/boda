require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { redis, connectRedis } = require('./config/redis');
const pool = require('./config/database');

const authRoutes = require('./routes/auth');
const riderRoutes = require('./routes/riders');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const supportRoutes = require('./routes/support');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const profileRoutes = require('./routes/profile');
const { authenticateToken, requireRole } = require('./middleware/auth');
const jwt = require('jsonwebtoken');

const start = async () => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters');
    }
    if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters');
    }

    await fastify.register(cors, {
      origin: ['https://admin.ocaya.space', 'http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    const pubClient = redis;
    const subClient = redis.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);

    const io = new Server(fastify.server, { cors: { origin: '*' } });
    io.adapter(createAdapter(pubClient, subClient));

    io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        socket.userPhone = decoded.phone;
        next();
      } catch (err) {
        next(new Error('Invalid token'));
      }
    });

    io.on('connection', async (socket) => {
      console.log('Client connected:', socket.id);

      let riderId = null;
      if (socket.userRole === 'rider') {
        const rider = await pool.query('SELECT id FROM riders WHERE phone = $1 AND is_deleted = false', [socket.userPhone]);
        if (rider.rows.length > 0) riderId = rider.rows[0].id;
      }

      socket.on('rider:location', async ({ riderId: payloadRiderId, lat, lng, bookingId }) => {
        if (socket.userRole !== 'rider' && socket.userRole !== 'admin') return;
        const actualRiderId = riderId || payloadRiderId;
        if (!actualRiderId) return;

        await redis.hSet('riders:online', actualRiderId, JSON.stringify({ lat, lng, updatedAt: Date.now() }));

        if (bookingId) {
          io.to(`booking:${bookingId}`).emit('rider:moved', { lat, lng });
        }
      });

      socket.on('join:booking', async ({ bookingId }) => {
        const booking = await pool.query(
          'SELECT customer_id, rider_id FROM bookings WHERE id = $1', [bookingId]
        );
        if (booking.rows.length === 0) return;

        const b = booking.rows[0];
        if (socket.userRole === 'admin' || socket.userId === b.customer_id || socket.userId === b.rider_id) {
          socket.join(`booking:${bookingId}`);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });

      socket.on('rider:go-online', () => {
        socket.join('riders:online');
      });

      socket.on('rider:go-offline', () => {
        socket.leave('riders:online');
      });
    });

    const redisSub = redis.duplicate();
    await redisSub.connect();
    await redisSub.subscribe('booking:created', (message) => {
      try {
        const data = JSON.parse(message);
        io.to('riders:online').emit('booking:new', data);
      } catch (e) {}
    });

    fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

    fastify.post('/auth/send-otp', authRoutes.sendOTP);
    fastify.post('/auth/verify-otp', authRoutes.verifyOTP);
    fastify.post('/auth/refresh', authRoutes.refreshAccessToken);
    fastify.post('/auth/logout', authRoutes.logout);

    fastify.post('/riders/register', riderRoutes.registerRider);
    fastify.get('/riders/nearby', { preHandler: authenticateToken }, riderRoutes.getNearbyRiders);
    fastify.patch('/riders/:riderId/location', { preHandler: authenticateToken }, riderRoutes.updateLocation);
    fastify.patch('/riders/:riderId/online', { preHandler: authenticateToken }, riderRoutes.toggleOnline);
    fastify.get('/riders/:id/profile', riderRoutes.getRiderProfile);
    fastify.get('/riders/:riderId/earnings', { preHandler: authenticateToken }, riderRoutes.getRiderEarnings);
    fastify.patch('/riders/:riderId/documents', { preHandler: authenticateToken }, riderRoutes.updateRiderDocuments);
    fastify.get('/riders/:riderId/vehicle', { preHandler: authenticateToken }, riderRoutes.getRiderVehicle);
    fastify.patch('/riders/:riderId/vehicle', { preHandler: authenticateToken }, riderRoutes.updateRiderVehicle);
    fastify.get('/riders/:riderId/incentives', { preHandler: authenticateToken }, riderRoutes.getRiderIncentives);
    fastify.get('/riders/support/tickets', { preHandler: authenticateToken }, riderRoutes.getRiderTickets);
    fastify.post('/riders/support/tickets', { preHandler: authenticateToken }, riderRoutes.createRiderTicket);
    fastify.get('/riders/support/tickets/:id', { preHandler: authenticateToken }, riderRoutes.getRiderTicketDetails);
    fastify.post('/riders/support/tickets/:id/reply', { preHandler: authenticateToken }, riderRoutes.replyToTicket);

    fastify.post('/bookings', { preHandler: authenticateToken }, bookingRoutes.createBooking);
    fastify.get('/bookings/:id', { preHandler: authenticateToken }, bookingRoutes.getBooking);
    fastify.get('/bookings/my/customer', { preHandler: authenticateToken }, bookingRoutes.getCustomerBookings);
    fastify.get('/bookings/my/rider', { preHandler: authenticateToken }, bookingRoutes.getRiderBookings);
    fastify.patch('/bookings/:id/accept', { preHandler: authenticateToken }, bookingRoutes.acceptBooking);
    fastify.post('/bookings/:id/request-rider', { preHandler: authenticateToken }, bookingRoutes.requestRider);
    fastify.patch('/bookings/:id/start', { preHandler: authenticateToken }, bookingRoutes.startBooking);
    fastify.patch('/bookings/:id/complete', { preHandler: authenticateToken }, bookingRoutes.completeBooking);
    fastify.patch('/bookings/:id/cancel', { preHandler: authenticateToken }, bookingRoutes.cancelBooking);
    fastify.post('/bookings/:id/rate', { preHandler: authenticateToken }, bookingRoutes.rateBooking);
    fastify.post('/deliveries/:id/confirm', { preHandler: authenticateToken }, bookingRoutes.confirmDelivery);
    fastify.get('/bookings/:id/payment-status', { preHandler: authenticateToken }, bookingRoutes.getPaymentStatus);

    fastify.get('/admin/dashboard', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.getDashboardStats);
    fastify.get('/admin/riders/pending', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.getPendingRiders);
    fastify.get('/admin/riders/:id', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.getRiderDetails);
    fastify.patch('/admin/riders/:id/verify', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.verifyRider);
    fastify.patch('/admin/riders/:id/suspend', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.suspendRider);
    fastify.patch('/admin/riders/:id/reinstate', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.reinstateRider);
    fastify.delete('/admin/riders/:id', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.deleteRider);
    fastify.get('/admin/bookings', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.getAllBookings);
    fastify.get('/admin/bookings/:id', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.getBookingDetails);
    fastify.get('/admin/payments', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.getPayments);
    fastify.post('/admin/payments/:id/release', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.releasePayment);
    fastify.post('/admin/payments/:id/flag', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.flagPayment);

    fastify.get('/admin/support/tickets', { preHandler: [authenticateToken, requireRole(['admin'])] }, supportRoutes.getTickets);
    fastify.get('/admin/support/tickets/:id', { preHandler: [authenticateToken, requireRole(['admin'])] }, supportRoutes.getTicketDetails);
    fastify.post('/admin/support/tickets', { preHandler: [authenticateToken, requireRole(['admin'])] }, supportRoutes.createTicket);
    fastify.patch('/admin/support/tickets/:id/status', { preHandler: [authenticateToken, requireRole(['admin'])] }, supportRoutes.updateTicketStatus);
    fastify.post('/admin/support/tickets/:id/messages', { preHandler: [authenticateToken, requireRole(['admin'])] }, supportRoutes.addTicketMessage);

    fastify.get('/admin/settings', { preHandler: [authenticateToken, requireRole(['admin'])] }, settingsRoutes.getSettings);
    fastify.put('/admin/settings', { preHandler: [authenticateToken, requireRole(['admin'])] }, settingsRoutes.updateSettings);
    fastify.get('/admin/profile', { preHandler: [authenticateToken, requireRole(['admin'])] }, settingsRoutes.getProfile);
    fastify.put('/admin/profile', { preHandler: [authenticateToken, requireRole(['admin'])] }, settingsRoutes.updateProfile);

    fastify.get('/profile/customer', { preHandler: authenticateToken }, profileRoutes.getCustomerProfile);
    fastify.put('/profile/customer', { preHandler: authenticateToken }, profileRoutes.updateCustomerProfile);
    fastify.get('/profile/saved-places', { preHandler: authenticateToken }, profileRoutes.getSavedPlaces);
    fastify.post('/profile/saved-places', { preHandler: authenticateToken }, profileRoutes.addSavedPlace);
    fastify.put('/profile/saved-places/:id', { preHandler: authenticateToken }, profileRoutes.updateSavedPlace);
    fastify.delete('/profile/saved-places/:id', { preHandler: authenticateToken }, profileRoutes.deleteSavedPlace);
    fastify.get('/profile/payment-methods', { preHandler: authenticateToken }, profileRoutes.getPaymentMethods);
    fastify.post('/profile/payment-methods', { preHandler: authenticateToken }, profileRoutes.addPaymentMethod);
    fastify.patch('/profile/payment-methods/:id/default', { preHandler: authenticateToken }, profileRoutes.setDefaultPayment);
    fastify.delete('/profile/payment-methods/:id', { preHandler: authenticateToken }, profileRoutes.deletePaymentMethod);
    fastify.get('/profile/referral', { preHandler: authenticateToken }, profileRoutes.getReferral);
    fastify.post('/profile/referral/apply', { preHandler: authenticateToken }, profileRoutes.applyReferral);
    fastify.get('/profile/emergency-contacts', { preHandler: authenticateToken }, profileRoutes.getEmergencyContacts);
    fastify.post('/profile/emergency-contacts', { preHandler: authenticateToken }, profileRoutes.addEmergencyContact);
    fastify.delete('/profile/emergency-contacts/:id', { preHandler: authenticateToken }, profileRoutes.deleteEmergencyContact);
    fastify.get('/profile/settings', { preHandler: authenticateToken }, profileRoutes.getSettings);
    fastify.put('/profile/settings', { preHandler: authenticateToken }, profileRoutes.updateSettings);
    fastify.get('/profile/notifications', { preHandler: authenticateToken }, profileRoutes.getNotifications);
    fastify.patch('/profile/notifications/:id/read', { preHandler: authenticateToken }, profileRoutes.markNotificationRead);
    fastify.patch('/profile/notifications/read-all', { preHandler: authenticateToken }, profileRoutes.markAllRead);

    fastify.get('/admin/notifications', { preHandler: [authenticateToken, requireRole(['admin'])] }, notificationRoutes.getNotifications);
    fastify.patch('/admin/notifications/:id/read', { preHandler: [authenticateToken, requireRole(['admin'])] }, notificationRoutes.markAsRead);
    fastify.patch('/admin/notifications/read-all', { preHandler: [authenticateToken, requireRole(['admin'])] }, notificationRoutes.markAllAsRead);
    fastify.delete('/admin/notifications/:id', { preHandler: [authenticateToken, requireRole(['admin'])] }, notificationRoutes.deleteNotification);

    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
    console.log(`Server running on port ${process.env.PORT || 3000}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
