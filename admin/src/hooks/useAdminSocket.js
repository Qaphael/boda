import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'https://boda.ocaya.space';

export function useAdminSocket(onEvent) {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const socket = io(API_URL, {
      transports: ['websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Admin socket connected');
    });

    socket.on('rider:status-changed', (data) => {
      if (onEvent) onEvent('rider:status-changed', data);
    });

    socket.on('booking:created', (data) => {
      if (onEvent) onEvent('booking:created', data);
    });

    socket.on('dashboard:refresh', (data) => {
      if (onEvent) onEvent('dashboard:refresh', data);
    });

    return () => socket.disconnect();
  }, []);

  return socketRef;
}
