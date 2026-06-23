import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { riderAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

export default function EarningsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { rider } = useAuth();
  const [earnings, setEarnings] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [period, setPeriod] = useState('today');
  const [refreshing, setRefreshing] = useState(false);
  const { showModal, ModalComponent } = useModal();
  const canGoBack = navigation.canGoBack() && route.name === 'Earnings';

  useFocusEffect(
    useCallback(() => {
      loadEarnings();
    }, [period])
  );

  const loadEarnings = async () => {
    try {
      if (rider?.riderId) {
        const { data } = await riderAPI.getEarnings(rider.riderId, period);
        setEarnings(data.summary);
        setBookings(data.bookings || []);
      }
    } catch (err) { console.error('Failed to load earnings:', err); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadEarnings(); setRefreshing(false); };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {canGoBack ? (
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>←</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
        <Text style={styles.topTitle}>Earnings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.periodTabs}>
        {PERIODS.map((p) => (
          <TouchableOpacity key={p.key} style={[styles.periodTab, period === p.key && styles.periodTabActive]} onPress={() => setPeriod(p.key)} activeOpacity={0.7}>
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Rider's Net Share</Text>
              <Text style={styles.summaryAmount}>UGX {(earnings?.rider_share || 0).toLocaleString()}</Text>
              <View style={styles.summaryMeta}>
                <Text style={styles.summaryMetaText}>{earnings?.total_trips || 0} Rides</Text>
                <Text style={styles.summaryDot}>•</Text>
                <Text style={styles.summaryMetaText}>UGX {(earnings?.total_revenue || 0).toLocaleString()} Gross</Text>
              </View>
            </View>

            <Text style={styles.listTitle}>Recent Trips</Text>
          </>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No trips found for this period</Text>}
        renderItem={({ item }) => (
          <View style={styles.tripItem}>
            <View style={[styles.tripIcon, item.status === 'cancelled' ? styles.tripIconCancelled : null]}>
              <Text style={styles.tripIconText}>{item.type === 'delivery' ? '📦' : '🏍'}</Text>
            </View>
            <View style={styles.tripInfo}>
              <Text style={styles.tripTitle}>{item.type === 'ride' ? 'Ride Trip' : 'Food Delivery'}</Text>
              <Text style={styles.tripRoute}>{item.pickup_address || 'Pickup'} → {item.dropoff_address || 'Dropoff'}</Text>
              <Text style={styles.tripTime}>{formatDate(item.completed_at)} • {item.status}</Text>
            </View>
            <Text style={[styles.tripFare, item.status === 'cancelled' && styles.tripFareCancelled]}>
              {item.status === 'cancelled' ? 'UGX 0' : `UGX ${(item.fare_final || 0).toLocaleString()}`}
            </Text>
          </View>
        )}
        ListFooterComponent={
          <>
            <TouchableOpacity style={styles.withdrawBtn} onPress={() => showModal({ icon: '💰', title: 'Withdraw', message: 'MoMo withdrawal coming soon.' })} activeOpacity={0.8}>
              <Text style={styles.withdrawBtnText}>💰 Withdraw to MoMo</Text>
            </TouchableOpacity>
            <View style={{ height: 100 }} />
          </>
        }
      />
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  menuBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 18, color: colors.onSurface },
  topTitle: { ...typography.titleLg, color: colors.onSurface, fontWeight: '700' },
  periodTabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.lg },
  periodTab: { flex: 1, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center' },
  periodTabActive: { backgroundColor: colors.primary },
  periodText: { ...typography.labelLg, color: colors.onSurfaceVariant },
  periodTextActive: { color: colors.onPrimaryContainer, fontWeight: '700' },
  summaryCard: { marginHorizontal: spacing.lg, backgroundColor: colors.primary, borderRadius: 24, padding: spacing.xl, marginBottom: spacing.lg },
  summaryLabel: { ...typography.labelLg, color: colors.onPrimaryContainer, opacity: 0.8, marginBottom: 4 },
  summaryAmount: { ...typography.displayLg, color: colors.onPrimaryContainer, fontSize: 36, marginBottom: spacing.sm },
  summaryMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryMetaText: { ...typography.labelLg, color: colors.onPrimaryContainer, opacity: 0.8 },
  summaryDot: { color: colors.onPrimaryContainer, opacity: 0.5 },
  insightsGrid: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.xl },
  insightCard: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant },
  insightIcon: { fontSize: 20, marginBottom: spacing.sm },
  insightLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  insightValue: { ...typography.titleMd, color: colors.onSurface, marginTop: 2 },
  listTitle: { ...typography.titleMd, color: colors.onSurface, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  emptyText: { textAlign: 'center', color: colors.onSurfaceVariant, marginTop: 40 },
  tripItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainer },
  tripIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  tripIconCancelled: { backgroundColor: colors.errorContainer },
  tripIconText: { fontSize: 18 },
  tripInfo: { flex: 1 },
  tripTitle: { ...typography.labelLg, color: colors.onSurface, fontWeight: '700' },
  tripRoute: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  tripTime: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  tripFare: { ...typography.labelLg, color: colors.onSurface, fontWeight: '700' },
  tripFareCancelled: { color: colors.onSurfaceVariant },
  withdrawBtn: { marginHorizontal: spacing.lg, backgroundColor: colors.inverseSurface, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  withdrawBtnText: { ...typography.titleMd, color: colors.inverseOnSurface },
  payoutInfo: { ...typography.labelSm, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.md },
});
