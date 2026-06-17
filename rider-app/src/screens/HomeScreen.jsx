import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { riderAPI } from '../services/api';
import { useLocationTracking } from '../hooks/useLocationTracking';

export default function HomeScreen({ navigation }) {
  const { rider, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [profile, setProfile] = useState(null);
  const [earnings, setEarnings] = useState(null);

  useLocationTracking(rider?.riderId, null);

  useEffect(() => {
    loadProfile();
    loadEarnings();
  }, []);

  const loadProfile = async () => {
    try {
      if (rider?.riderId) {
        const { data } = await riderAPI.getProfile(rider.riderId);
        setProfile(data.rider);
        setIsOnline(data.rider?.is_online || false);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const loadEarnings = async () => {
    try {
      if (rider?.riderId) {
        const { data } = await riderAPI.getEarnings(rider.riderId, 'today');
        setEarnings(data.summary);
      }
    } catch (err) {
      console.error('Failed to load earnings:', err);
    }
  };

  const toggleOnline = async (value) => {
    try {
      if (!rider?.riderId) {
        Alert.alert('Error', 'Please complete registration first');
        return;
      }

      if (profile?.status !== 'verified') {
        Alert.alert('Error', 'Your account is not verified yet');
        return;
      }

      await riderAPI.toggleOnline(rider.riderId, value);
      setIsOnline(value);
    } catch (err) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: logout, style: 'destructive' },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {rider?.name || 'Rider'}!</Text>
          <Text style={styles.status}>
            Status: {profile?.status || 'Not registered'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Online Status</Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            trackColor={{ false: '#ccc', true: '#4F46E5' }}
            thumbColor={isOnline ? '#fff' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.statusText}>
          {isOnline ? 'You are online and can receive bookings' : 'You are offline'}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{earnings?.total_trips || 0}</Text>
          <Text style={styles.statLabel}>Today's Trips</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{(earnings?.total_revenue || 0).toLocaleString()}</Text>
          <Text style={styles.statLabel}>Today's Earnings (UGX)</Text>
        </View>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.cardTitle}>Profile</Text>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Phone</Text>
          <Text style={styles.profileValue}>{rider?.phone}</Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Rating</Text>
          <Text style={styles.profileValue}>
            {profile?.avg_rating ? `${profile.avg_rating} / 5` : 'No ratings yet'}
          </Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Total Trips</Text>
          <Text style={styles.profileValue}>{profile?.total_trips || 0}</Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Plate Number</Text>
          <Text style={styles.profileValue}>{profile?.plate_number || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Earnings')}
        >
          <Text style={styles.actionButtonText}>View Earnings History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.actionButtonText}>Update Registration</Text>
        </TouchableOpacity>
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
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#E0E7FF',
    marginTop: 4,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileLabel: {
    fontSize: 14,
    color: '#666',
  },
  profileValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
});
