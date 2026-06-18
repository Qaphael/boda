import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setUser({ token });
    }
    setLoading(false);
  }, []);

  const sendOTP = async (phone) => {
    await authAPI.sendOTP(phone);
  };

  const verifyOTP = async (phone, otp) => {
    const { data } = await authAPI.verifyOTP(phone, otp);
    localStorage.setItem('admin_token', data.token);
    if (data.refreshToken) {
      localStorage.setItem('admin_refresh_token', data.refreshToken);
    }
    setUser({ token: data.token, ...data.user });
    return data;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('admin_refresh_token');
    try {
      await authAPI.logout(refreshToken);
    } catch (err) {
      // Ignore logout API errors
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, sendOTP, verifyOTP, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
