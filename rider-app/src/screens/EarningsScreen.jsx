import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { riderAPI } from '../services/api';

export default function EarningsScreen() {
  const { rider } = useAuth();
  const [earnings, setEarnings] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [period, setPeriod] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEarnings();
  }, [period]);

  const loadEarnings = async () => {
    try {
      if (rider?.riderId) {
        const { data } = await riderAPI.getEarnings(rider.riderId, period);
        setEarnings(data.summary);
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to load earnings:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEarnings();
    setRefreshing(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const periods = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Earnings</Text>

      <View style={styles.periodSelector}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodButton, period === p.key && styles.periodButtonActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{earnings?.total_trips || 0}</Text>
            <Text style={styles.summaryLabel}>Trips</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{(earnings?.total_revenue || 0).toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Revenue</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{(earnings?.rider_share || 0).toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Your Share</Text>
          </View>
        </View>
      </View>

      <Text style={styles.listTitle}>Trip History</Text>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No trips found for this period</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingType}>
                {item.type === 'ride' ? 'Ride' : 'Delivery'}
              </Text>
              <Text style={styles.bookingFare}>
                UGX {(item.fare_final || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.bookingDetails}>
              <Text style={styles.bookingAddress}>
                {item.pickup_address || 'Pickup'} → {item.dropoff_address || 'Dropoff'}
              </Text>
              <Text style={styles.bookingDate}>{formatDate(item.completed_at)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#4F46E5',
  },
  periodText: {
    fontSize: 12,
    color: '#666',
  },
  periodTextActive: {
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#E0E7FF',
    marginTop: 4,
  },
  listTitle: {
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
    marginBottom: 8,
  },
  bookingType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  bookingFare: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  bookingDetails: {
    gap: 4,
  },
  bookingAddress: {
    fontSize: 13,
    color: '#666',
  },
  bookingDate: {
    fontSize: 12,
    color: '#999',
  },
});
