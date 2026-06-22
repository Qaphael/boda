import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'https://boda.ocaya.space';

export const useLocationTracking = (riderId, bookingId) => {
  const intervalRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!riderId) return;

    let socket;
    let cancelled = false;

    (async () => {
      const token = await AsyncStorage.getItem('rider_token');
      if (cancelled) return;

      socket = io(SOCKET_URL, {
        transports: ['websocket'],
        auth: { token },
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Location tracking connected');
      });

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
    })();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (socket) socket.disconnect();
    };
  }, [riderId, bookingId]);

  return socketRef;
};
