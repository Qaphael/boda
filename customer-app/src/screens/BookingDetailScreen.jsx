import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { io } from 'socket.io-client';
import { bookingAPI } from '../services/api';

const SOCKET_URL = 'http://localhost:3000';

export default function BookingDetailScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadBooking();
    setupSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const socketRef = { current: null };

  const setupSocket = () => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:booking', { bookingId });
    });

    socket.on('rider:moved', (data) => {
      setRiderLocation(data);
    });
  };

  const loadBooking = async () => {
    try {
      const { data } = await bookingAPI.getBooking(bookingId);
      setBooking(data.booking);
    } catch (err) {
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await bookingAPI.cancelBooking(bookingId);
            Alert.alert('Success', 'Booking cancelled');
            loadBooking();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to cancel');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleRate = async (score) => {
    setActionLoading(true);
    try {
      await bookingAPI.rateBooking(bookingId, score, '');
      Alert.alert('Success', 'Thanks for your rating!');
      loadBooking();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit rating');
    } finally {
      setActionLoading(false);
    }
  };

  const statusColors = {
    pending: '#F59E0B',
    accepted: '#3B82F6',
    in_progress: '#10B981',
    completed: '#6B7280',
    cancelled: '#EF4444',
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text>Booking not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: statusColors[booking.status] }]} />
        <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trip Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{booking.type === 'ride' ? 'Ride' : 'Delivery'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pickup</Text>
          <Text style={styles.value}>{booking.pickup_address || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Dropoff</Text>
          <Text style={styles.value}>{booking.dropoff_address || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fare</Text>
          <Text style={styles.value}>UGX {(booking.fare_final || booking.fare_estimate || 0).toLocaleString()}</Text>
        </View>
      </View>

      {booking.rider_name && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rider</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{booking.rider_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{booking.rider_phone || 'N/A'}</Text>
          </View>
        </View>
      )}

      {riderLocation && booking.status === 'in_progress' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Tracking</Text>
          <Text style={styles.value}>Rider is on the way!</Text>
          <Text style={styles.label}>
            Lat: {riderLocation.lat?.toFixed(4)}, Lng: {riderLocation.lng?.toFixed(4)}
          </Text>
        </View>
      )}

      {booking.status === 'pending' && (
        <TouchableOpacity
          style={[styles.cancelButton, actionLoading && styles.buttonDisabled]}
          onPress={handleCancel}
          disabled={actionLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel Booking</Text>
        </TouchableOpacity>
      )}

      {booking.status === 'completed' && (
        <View style={styles.ratingSection}>
          <Text style={styles.ratingTitle}>Rate your experience</Text>
          <View style={styles.ratingButtons}>
            {[1, 2, 3, 4, 5].map((score) => (
              <TouchableOpacity
                key={score}
                style={styles.ratingButton}
                onPress={() => handleRate(score)}
                disabled={actionLoading}
              >
                <Text style={styles.ratingButtonText}>{score}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
