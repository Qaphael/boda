import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { bookingAPI } from '../services/api';
import Grabber from '../components/Grabber';
import { colors, typography, spacing, radius } from '../theme';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
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

  const statusColors = {
    pending: '#F59E0B',
    accepted: '#3B82F6',
    in_progress: '#10B981',
    completed: colors.primary,
    cancelled: colors.error,
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-UG', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapCanvas}>
        <View style={styles.mapOverlay}>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Finding active bodas nearby</Text>
          </View>
        </View>

        <View style={styles.floatingActions}>
          <TouchableOpacity
            style={styles.rideCard}
            onPress={() => navigation.navigate('NewBooking', { type: 'ride' })}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>🏍</Text>
            <Text style={styles.actionTitle}>Request Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deliveryCard}
            onPress={() => navigation.navigate('DeliveryDetails')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionTitle}>Send Delivery</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomSheet}>
        <Grabber />
        <View style={styles.sheetContent}>
          <Text style={styles.greeting}>Hello, Gulu!</Text>

          <View style={styles.activityHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Activity')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.activityList} showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
            ) : recentBookings.length === 0 ? (
              <Text style={styles.emptyText}>No recent activity</Text>
            ) : (
              recentBookings.map((booking, index) => (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.activityItem}
                  onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.activityIconBg,
                    booking.type === 'delivery' ? styles.deliveryIconBg : null,
                  ]}>
                    <Text style={styles.activityIconText}>
                      {booking.type === 'delivery' ? '📦' : '🏍'}
                    </Text>
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>
                      {booking.type === 'ride' ? 'Ride' : 'Delivery'}
                    </Text>
                    <Text style={styles.activityStatus}>
                      Status: {booking.status?.replace('_', ' ')}
                    </Text>
                  </View>
                  <View style={styles.activityRight}>
                    <Text style={styles.activityFare}>
                      UGX {(booking.fare_estimate || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.activityTime}>{formatTime(booking.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceContainerHighest,
    zIndex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  statusText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  floatingActions: {
    position: 'absolute',
    bottom: '42%',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.lg,
    zIndex: 20,
  },
  rideCard: {
    flex: 1,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.xl,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  deliveryCard: {
    flex: 1,
    backgroundColor: colors.inverseSurface,
    borderRadius: radius.xl,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 64,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 16,
    maxHeight: '50%',
    zIndex: 30,
  },
  sheetContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 16,
  },
  greeting: {
    ...typography.headlineLgMobile,
    color: colors.onBackground,
    marginBottom: spacing.lg,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  seeAll: {
    ...typography.labelLg,
    color: colors.primary,
  },
  activityList: {
    maxHeight: 220,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.sm,
  },
  activityIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryFixedDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  deliveryIconBg: {
    backgroundColor: colors.secondaryContainer,
  },
  activityIconText: {
    fontSize: 20,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  activityStatus: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activityFare: {
    ...typography.titleMd,
    color: colors.primary,
    fontWeight: '700',
  },
  activityTime: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
});
