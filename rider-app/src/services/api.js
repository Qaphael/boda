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
  const token = await AsyncStorage.getItem('rider_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['rider_token', 'rider_data']);
      if (onAuthError) onAuthError();
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
};

export const riderAPI = {
  register: (data) => api.post('/riders/register', data),
  updateLocation: (riderId, lat, lng) => api.patch(`/riders/${riderId}/location`, { lat, lng }),
  toggleOnline: (riderId, is_online) => api.patch(`/riders/${riderId}/online`, { is_online }),
  getProfile: (riderId) => api.get(`/riders/${riderId}/profile`),
  getEarnings: (riderId, period) => api.get(`/riders/${riderId}/earnings`, { params: { period } }),
  updateDocuments: (riderId, data) => api.patch(`/riders/${riderId}/documents`, data),
  getVehicle: (riderId) => api.get(`/riders/${riderId}/vehicle`),
  updateVehicle: (riderId, data) => api.patch(`/riders/${riderId}/vehicle`, data),
  getIncentives: (riderId) => api.get(`/riders/${riderId}/incentives`),
};

export const ticketAPI = {
  getTickets: () => api.get('/riders/support/tickets'),
  createTicket: (data) => api.post('/riders/support/tickets', data),
  getTicket: (id) => api.get(`/riders/support/tickets/${id}`),
  replyToTicket: (id, message) => api.post(`/riders/support/tickets/${id}/reply`, { message }),
};

export const bookingAPI = {
  getBooking: (id) => api.get(`/bookings/${id}`),
  acceptBooking: (id) => api.patch(`/bookings/${id}/accept`),
  startBooking: (id) => api.patch(`/bookings/${id}/start`),
  completeBooking: (id) => api.patch(`/bookings/${id}/complete`),
  cancelBooking: (id) => api.patch(`/bookings/${id}/cancel`),
  getMyBookings: () => api.get('/bookings/my/rider'),
};

export default api;
