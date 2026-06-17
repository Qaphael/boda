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
  sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getPendingRiders: (params) => api.get('/admin/riders/pending', { params }),
  getRiderDetails: (id) => api.get(`/admin/riders/${id}`),
  verifyRider: (id, status, reason) => api.patch(`/admin/riders/${id}/verify`, { status, reason }),
  suspendRider: (id, reason) => api.patch(`/admin/riders/${id}/suspend`, { reason }),
  reinstateRider: (id) => api.patch(`/admin/riders/${id}/reinstate`),
  getBookings: (params) => api.get('/admin/bookings', { params }),
  getBookingDetails: (id) => api.get(`/admin/bookings/${id}`),
  getPayments: (params) => api.get('/admin/payments', { params }),
  releasePayment: (id) => api.post(`/admin/payments/${id}/release`),
  flagPayment: (id, reason) => api.post(`/admin/payments/${id}/flag`, { reason }),
};

export default api;
