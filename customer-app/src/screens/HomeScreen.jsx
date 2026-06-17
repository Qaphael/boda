import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { bookingAPI } from '../services/api';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentBookings();
  }, []);

  const loadRecentBookings = async () => {
    try {
      const { data } = await bookingAPI.getMyBookings({ limit: 5 });
      setRecentBookings(data.bookings || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: logout, style: 'destructive' },
    ]);
  };

  const statusColors = {
    pending: '#F59E0B',
    accepted: '#3B82F6',
    in_progress: '#10B981',
    completed: '#6B7280',
    cancelled: '#EF4444',
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'there'}!</Text>
          <Text style={styles.subtitle}>Where are you going?</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionCards}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('NewBooking', { type: 'ride' })}
        >
          <Text style={styles.actionEmoji}>Motorcycle</Text>
          <Text style={styles.actionTitle}>Request Ride</Text>
          <Text style={styles.actionDesc}>Get a ride to your destination</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('NewBooking', { type: 'delivery' })}
        >
          <Text style={styles.actionEmoji}>Package</Text>
          <Text style={styles.actionTitle}>Send Delivery</Text>
          <Text style={styles.actionDesc}>Send items to anyone</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Recent Bookings</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#4F46E5" />
        ) : recentBookings.length === 0 ? (
          <Text style={styles.emptyText}>No bookings yet</Text>
        ) : (
          recentBookings.map((booking) => (
            <TouchableOpacity
              key={booking.id}
              style={styles.bookingCard}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
            >
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingType}>
                  {booking.type === 'ride' ? 'Ride' : 'Delivery'}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColors[booking.status] || '#6B7280' }]}>
                  <Text style={styles.statusText}>{booking.status}</Text>
                </View>
              </View>
              <Text style={styles.bookingAddress}>
                {booking.pickup_address || 'Pickup'} → {booking.dropoff_address || 'Dropoff'}
              </Text>
              <Text style={styles.bookingFare}>
                UGX {(booking.fare_estimate || 0).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
  },
  actionCards: {
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 20,
  },
  actionEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionDesc: {
    fontSize: 14,
    color: '#E0E7FF',
    marginTop: 4,
  },
  historySection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  bookingAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  bookingFare: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
