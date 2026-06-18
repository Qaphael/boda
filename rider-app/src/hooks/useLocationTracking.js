import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://boda.ocaya.space';

export const useLocationTracking = (riderId, bookingId) => {
  const intervalRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!riderId) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      intervalRef.current = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          socket.emit('rider:location', {
            riderId,
            bookingId,
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
        } catch (err) {
          console.error('Location error:', err);
        }
      }, 3000);
    };

    startTracking();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [riderId, bookingId]);

  return socketRef;
};
