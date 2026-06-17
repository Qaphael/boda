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
    setUser({ token: data.token, ...data.user });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, sendOTP, verifyOTP, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
