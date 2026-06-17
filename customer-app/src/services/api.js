import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://boda.ocaya.space';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

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
      await AsyncStorage.removeItem('customer_token');
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
  confirmDelivery: (id, confirmation_code) => api.post(`/deliveries/${id}/confirm`, { confirmation_code }),
};

export const riderAPI = {
  getNearby: (lat, lng, radius) => api.get('/riders/nearby', { params: { lat, lng, radius } }),
  getProfile: (id) => api.get(`/riders/${id}/profile`),
};

export default api;
