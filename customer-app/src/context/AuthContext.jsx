import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, setAuthErrorHandler } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
    setAuthErrorHandler(() => setUser(null));
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('customer_token');
      const userData = await AsyncStorage.getItem('customer_data');
      if (token && userData) {
        setUser({ token, ...JSON.parse(userData) });
      }
    } catch (err) {
      console.error('Failed to load user:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async (phone) => {
    await authAPI.sendOTP(phone);
  };

  const verifyOTP = async (phone, otp) => {
    const { data } = await authAPI.verifyOTP(phone, otp);
    await AsyncStorage.setItem('customer_token', data.token);

    const userData = { id: data.user?.id, phone, ...data.user };
    await AsyncStorage.setItem('customer_data', JSON.stringify(userData));

    setUser({ token: data.token, ...userData });
    return data;
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['customer_token', 'customer_data']);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, sendOTP, verifyOTP, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
