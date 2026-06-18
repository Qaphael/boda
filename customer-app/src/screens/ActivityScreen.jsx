import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { bookingAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';

const FILTERS = ['All', 'Rides', 'Deliveries'];

export default function ActivityScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data } = await bookingAPI.getMyBookings({ limit: 20 });
      setBookings(data.bookings || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = bookings.filter((b) => {
    if (filter === 'Rides') return b.type === 'ride';
    if (filter === 'Deliveries') return b.type === 'delivery';
    return true;
  });

  const statusColor = (status) => {
    if (status === 'completed') return colors.tertiaryContainer;
    if (status === 'cancelled') return colors.errorContainer;
    return colors.surfaceContainerHigh;
  };

  const statusTextColor = (status) => {
    if (status === 'completed') return colors.onTertiaryContainer;
    if (status === 'cancelled') return colors.onErrorContainer;
    return colors.onSurfaceVariant;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' • ' + d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headline}>Activity History</Text>
        <Text style={styles.subtitle}>View and manage your past trips</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>No activity yet</Text>
        ) : (
          filtered.map((booking) => (
            <TouchableOpacity
              key={booking.id}
              style={styles.activityCard}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <View style={[
                    styles.cardIconBg,
                    booking.type === 'delivery' ? styles.deliveryBg : null,
                  ]}>
                    <Text style={styles.cardIcon}>{booking.type === 'delivery' ? '📦' : '🏍'}</Text>
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>
                      {booking.type === 'ride' ? 'Boda Ride' : 'Delivery'}
                    </Text>
                    <Text style={styles.cardDate}>{formatDate(booking.created_at)}</Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardFare}>UGX {(booking.fare_estimate || 0).toLocaleString()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(booking.status) }]}>
                    <Text style={[styles.statusText, { color: statusTextColor(booking.status) }]}>
                      {booking.status?.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.routeSection}>
                <View style={styles.routeLine} />
                <View style={styles.routePoint}>
                  <View style={styles.greenDot} />
                  <Text style={styles.routeText} numberOfLines={1}>{booking.pickup_address || 'Pickup'}</Text>
                </View>
                <View style={styles.routePoint}>
                  <View style={styles.redDot} />
                  <Text style={styles.routeText} numberOfLines={1}>{booking.dropoff_address || 'Dropoff'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  headline: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  filterChipActive: {
    backgroundColor: colors.primaryContainer,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  filterTextActive: {
    color: colors.onPrimaryContainer,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 40,
  },
  activityCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  cardIconBg: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryBg: {
    backgroundColor: colors.secondaryContainer,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  cardDate: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cardFare: {
    ...typography.titleMd,
    color: colors.primary,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeSection: {
    paddingLeft: spacing.lg,
    gap: spacing.sm,
  },
  routeLine: {
    position: 'absolute',
    left: 25,
    top: 8,
    bottom: 8,
    width: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  greenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#fff',
  },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: '#fff',
  },
  routeText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
});
