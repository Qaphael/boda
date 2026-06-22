import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://boda.ocaya.space';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

let onAuthError = null;
export function setAuthErrorHandler(handler) {
  onAuthError = handler;
}

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('customer_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['customer_token', 'customer_data']);
      if (onAuthError) onAuthError();
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
};

export const bookingAPI = {
  create: (data) => api.post('/bookings', data),
  getBooking: (id) => api.get(`/bookings/${id}`),
  getMyBookings: (params) => api.get('/bookings/my/customer', { params }),
  cancelBooking: (id) => api.patch(`/bookings/${id}/cancel`),
  rateBooking: (id, score, comment) => api.post(`/bookings/${id}/rate`, { score, comment }),
  requestRider: (id, riderId) => api.post(`/bookings/${id}/request-rider`, { riderId }),
  requestAny: (id) => api.post(`/bookings/${id}/request-rider`),
  confirmDelivery: (id, confirmation_code) => api.post(`/deliveries/${id}/confirm`, { confirmation_code }),
  getPaymentStatus: (id) => api.get(`/bookings/${id}/payment-status`),
};

export const riderAPI = {
  getNearby: (lat, lng, radius) => api.get('/riders/nearby', { params: { lat, lng, radius } }),
  getProfile: (id) => api.get(`/riders/${id}/profile`),
};

export const profileAPI = {
  getProfile: () => api.get('/profile/customer'),
  updateProfile: (data) => api.put('/profile/customer', data),
  getSavedPlaces: () => api.get('/profile/saved-places'),
  addSavedPlace: (data) => api.post('/profile/saved-places', data),
  updateSavedPlace: (id, data) => api.put(`/profile/saved-places/${id}`, data),
  deleteSavedPlace: (id) => api.delete(`/profile/saved-places/${id}`),
  getPaymentMethods: () => api.get('/profile/payment-methods'),
  addPaymentMethod: (data) => api.post('/profile/payment-methods', data),
  setDefaultPayment: (id) => api.patch(`/profile/payment-methods/${id}/default`),
  deletePaymentMethod: (id) => api.delete(`/profile/payment-methods/${id}`),
  getReferral: () => api.get('/profile/referral'),
  applyReferral: (code) => api.post('/profile/referral/apply', { code }),
  getEmergencyContacts: () => api.get('/profile/emergency-contacts'),
  addEmergencyContact: (data) => api.post('/profile/emergency-contacts', data),
  deleteEmergencyContact: (id) => api.delete(`/profile/emergency-contacts/${id}`),
  getSettings: () => api.get('/profile/settings'),
  updateSettings: (data) => api.put('/profile/settings', data),
  getNotifications: () => api.get('/profile/notifications'),
  markNotificationRead: (id) => api.patch(`/profile/notifications/${id}/read`),
  markAllRead: () => api.patch('/profile/notifications/read-all'),
};

export default api;
