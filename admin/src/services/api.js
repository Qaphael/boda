import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  sendOTP: (phone) => api.post('/auth/send-otp', { phone, digits: 6 }),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getPendingRiders: (params) => api.get('/admin/riders/pending', { params }),
  getRiderDetails: (id) => api.get(`/admin/riders/${id}`),
  verifyRider: (id, status, reason) => api.patch(`/admin/riders/${id}/verify`, { status, reason }),
  suspendRider: (id, reason) => api.patch(`/admin/riders/${id}/suspend`, { reason }),
  reinstateRider: (id) => api.patch(`/admin/riders/${id}/reinstate`),
  deleteRider: (id) => api.delete(`/admin/riders/${id}`),
  getBookings: (params) => api.get('/admin/bookings', { params }),
  getBookingDetails: (id) => api.get(`/admin/bookings/${id}`),
  cancelBooking: (id, reason) => api.patch(`/admin/bookings/${id}/cancel`, { reason }),
  getPayments: (params) => api.get('/admin/payments', { params }),
  releasePayment: (id) => api.post(`/admin/payments/${id}/release`),
  flagPayment: (id, reason) => api.post(`/admin/payments/${id}/flag`, { reason }),
  getTickets: (params) => api.get('/admin/support/tickets', { params }),
  getTicketDetails: (id) => api.get(`/admin/support/tickets/${id}`),
  createTicket: (data) => api.post('/admin/support/tickets', data),
  updateTicketStatus: (id, status) => api.patch(`/admin/support/tickets/${id}/status`, { status }),
  addTicketMessage: (id, message, type) => api.post(`/admin/support/tickets/${id}/messages`, { message, type }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings) => api.put('/admin/settings', { settings }),
  getProfile: () => api.get('/admin/profile'),
  updateProfile: (data) => api.put('/admin/profile', data),
  getNotifications: (params) => api.get('/admin/notifications', { params }),
  markNotificationRead: (id) => api.patch(`/admin/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/admin/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/admin/notifications/${id}`),
};

export default api;
