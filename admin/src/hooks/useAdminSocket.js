import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'https://boda.ocaya.space';

export function useAdminSocket(onEvent) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const socket = io(API_URL, {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('connect', () => {
      console.log('Admin socket connected');
    });

    socket.on('rider:status-changed', (data) => {
      console.log('Live: rider status changed', data);
      callbackRef.current?.('rider:status-changed', data);
    });

    socket.on('booking:created', (data) => {
      console.log('Live: booking created', data);
      callbackRef.current?.('booking:created', data);
    });

    socket.on('dashboard:refresh', (data) => {
      console.log('Live: dashboard refresh', data);
      callbackRef.current?.('dashboard:refresh', data);
    });

    return () => socket.disconnect();
  }, []);
}
