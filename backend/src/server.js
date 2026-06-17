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
const { authenticateToken, requireRole } = require('./middleware/auth');

const start = async () => {
  try {
    await fastify.register(cors, { origin: true });

    const pubClient = redis;
    const subClient = redis.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);

    const io = new Server(fastify.server, { cors: { origin: '*' } });
    io.adapter(createAdapter(pubClient, subClient));

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('rider:location', async ({ riderId, lat, lng, bookingId }) => {
        await redis.hSet('riders:online', riderId, JSON.stringify({ lat, lng, updatedAt: Date.now() }));

        if (bookingId) {
          io.to(`booking:${bookingId}`).emit('rider:moved', { lat, lng });
        }
      });

      socket.on('join:booking', ({ bookingId }) => {
        socket.join(`booking:${bookingId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

    fastify.post('/auth/send-otp', authRoutes.sendOTP);
    fastify.post('/auth/verify-otp', authRoutes.verifyOTP);
    fastify.post('/auth/refresh', authRoutes.refreshAccessToken);

    fastify.post('/riders/register', riderRoutes.registerRider);
    fastify.get('/riders/nearby', { preHandler: authenticateToken }, riderRoutes.getNearbyRiders);
    fastify.patch('/riders/:riderId/location', { preHandler: authenticateToken }, riderRoutes.updateLocation);
    fastify.patch('/riders/:riderId/online', { preHandler: authenticateToken }, riderRoutes.toggleOnline);
    fastify.get('/riders/:id/profile', riderRoutes.getRiderProfile);
    fastify.get('/riders/:riderId/earnings', { preHandler: authenticateToken }, riderRoutes.getRiderEarnings);
    fastify.patch('/riders/:riderId/documents', { preHandler: authenticateToken }, riderRoutes.updateRiderDocuments);

    fastify.post('/bookings', { preHandler: authenticateToken }, bookingRoutes.createBooking);
    fastify.get('/bookings/:id', { preHandler: authenticateToken }, bookingRoutes.getBooking);
    fastify.get('/bookings/my/customer', { preHandler: authenticateToken }, bookingRoutes.getCustomerBookings);
    fastify.get('/bookings/my/rider', { preHandler: authenticateToken }, bookingRoutes.getRiderBookings);
    fastify.patch('/bookings/:id/accept', { preHandler: authenticateToken }, bookingRoutes.acceptBooking);
    fastify.patch('/bookings/:id/start', { preHandler: authenticateToken }, bookingRoutes.startBooking);
    fastify.patch('/bookings/:id/complete', { preHandler: authenticateToken }, bookingRoutes.completeBooking);
    fastify.patch('/bookings/:id/cancel', { preHandler: authenticateToken }, bookingRoutes.cancelBooking);
    fastify.post('/bookings/:id/rate', { preHandler: authenticateToken }, bookingRoutes.rateBooking);
    fastify.post('/deliveries/:id/confirm', { preHandler: authenticateToken }, bookingRoutes.confirmDelivery);

    fastify.get('/admin/dashboard', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.getDashboardStats);
    fastify.get('/admin/riders/pending', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.getPendingRiders);
    fastify.get('/admin/riders/:id', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.getRiderDetails);
    fastify.patch('/admin/riders/:id/verify', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.verifyRider);
    fastify.patch('/admin/riders/:id/suspend', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.suspendRider);
    fastify.patch('/admin/riders/:id/reinstate', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.reinstateRider);
    fastify.get('/admin/bookings', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.getAllBookings);
    fastify.get('/admin/bookings/:id', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.getBookingDetails);
    fastify.get('/admin/payments', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.getPayments);
    fastify.post('/admin/payments/:id/release', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.releasePayment);
    fastify.post('/admin/payments/:id/flag', { preHandler: [authenticateToken, requireRole(['admin'])] }, adminRoutes.flagPayment);

    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
    console.log(`Server running on port ${process.env.PORT || 3000}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
