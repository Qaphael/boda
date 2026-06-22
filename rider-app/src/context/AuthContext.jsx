import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, riderAPI, setAuthErrorHandler } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [rider, setRider] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRider();
    setAuthErrorHandler(() => setRider(null));
  }, []);

  const loadRider = async () => {
    try {
      const token = await AsyncStorage.getItem('rider_token');
      const riderData = await AsyncStorage.getItem('rider_data');
      if (token && riderData) {
        setRider({ token, ...JSON.parse(riderData) });
      }
    } catch (err) {
      console.error('Failed to load rider:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('rider_token');
      const riderData = await AsyncStorage.getItem('rider_data');
      if (!token || !riderData) return;

      const parsed = JSON.parse(riderData);
      if (parsed.riderId) {
        const { data } = await riderAPI.getProfile(parsed.riderId);
        const fresh = data.rider;
        const updated = {
          ...parsed,
          status: fresh?.status || parsed.status,
          name: fresh?.name || parsed.name,
          plate_number: fresh?.plate_number || parsed.plate_number,
          avg_rating: fresh?.avg_rating || parsed.avg_rating,
          is_online: fresh?.is_online || false,
        };
        await AsyncStorage.setItem('rider_data', JSON.stringify(updated));
        setRider({ token, ...updated });
        return updated;
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
    return null;
  }, []);

  const sendOTP = async (phone) => {
    await authAPI.sendOTP(phone);
  };

  const verifyOTP = async (phone, otp) => {
    const { data } = await authAPI.verifyOTP(phone, otp);
    await AsyncStorage.setItem('rider_token', data.token);

    const riderData = {
      id: data.user?.id,
      phone,
      riderId: data.rider?.id || null,
      status: data.rider?.status || null,
      name: data.rider?.name || data.user?.name,
      plate_number: data.rider?.plate_number || null,
      avg_rating: data.rider?.avg_rating || null,
    };
    await AsyncStorage.setItem('rider_data', JSON.stringify(riderData));

    setRider({ token: data.token, ...riderData });
    return data;
  };

  const register = async (riderData) => {
    const { data } = await riderAPI.register(riderData);
    const updatedRider = { ...rider, riderId: data.riderId, status: data.status };
    await AsyncStorage.setItem('rider_data', JSON.stringify(updatedRider));
    setRider(updatedRider);
    return data;
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['rider_token', 'rider_data']);
    setRider(null);
  };

  return (
    <AuthContext.Provider value={{ rider, loading, sendOTP, verifyOTP, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
