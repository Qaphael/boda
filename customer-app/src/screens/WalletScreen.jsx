import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModal } from '../components/useModal';
import { profileAPI, bookingAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';
import { useCallback } from 'react';

const PAYMENT_COLORS = {
  mtn: '#FFCC00',
  airtel: '#ED1C24',
  cash: '#4CAF50',
};

export default function WalletScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { showModal, ModalComponent } = useModal();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalSpent: 0, totalRides: 0, totalDeliveries: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [paymentRes, bookingRes, profileRes] = await Promise.all([
        profileAPI.getPaymentMethods().catch(() => ({ data: { methods: [] } })),
        bookingAPI.getMyBookings().catch(() => ({ data: { bookings: [] } })),
        profileAPI.getProfile().catch(() => ({ data: { stats: {} } })),
      ]);

      setPaymentMethods(paymentRes.data.methods || []);
      setStats(profileRes.data.stats || {});

      const bookings = (bookingRes.data.bookings || []).map(b => ({
        id: b.id,
        title: b.type === 'ride'
          ? `Ride to ${b.dropoff_address || 'Destination'}`
          : `Delivery to ${b.dropoff_address || 'Destination'}`,
        time: formatTime(b.created_at),
        amount: b.fare_final || b.fare_estimate || 0,
        status: b.status,
        type: b.type,
        icon: b.type === 'ride' ? '🏍' : '📦',
      }));

      setTransactions(bookings);
    } catch (err) {
      console.error('Failed to load wallet data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return colors.primary;
      case 'cancelled': return colors.error;
      case 'pending': return colors.onSurfaceVariant;
      case 'accepted':
      case 'in_progress': return '#FF9800';
      default: return colors.onSurfaceVariant;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'in_progress': return 'In Progress';
      default: return status;
    }
  };

  const defaultPayment = paymentMethods.find(m => m.is_default);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceContent}>
            <Text style={styles.balanceLabel}>Total Spent</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.currency}>UGX</Text>
              <Text style={styles.amount}>{Number(stats.total_spent || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total_rides || 0}</Text>
                <Text style={styles.statLabel}>Rides</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total_deliveries || 0}</Text>
                <Text style={styles.statLabel}>Deliveries</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total_bookings || 0}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>
          </View>
          <View style={styles.balanceGlow} />
        </View>

        {/* Default Payment */}
        {defaultPayment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paying with</Text>
            <View style={styles.defaultMethodCard}>
              <View style={[styles.methodIcon, { backgroundColor: `${PAYMENT_COLORS[defaultPayment.type] || '#999'}1a` }]}>
                <Text style={[styles.methodIconText, { color: PAYMENT_COLORS[defaultPayment.type] || '#999' }]}>
                  {defaultPayment.type.toUpperCase()}
                </Text>
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>
                  {defaultPayment.type === 'mtn' ? 'MTN Mobile Money' : defaultPayment.type === 'airtel' ? 'Airtel Money' : 'Cash'}
                </Text>
                <Text style={styles.methodNumber}>{defaultPayment.phone_number}</Text>
              </View>
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>Default</Text>
              </View>
            </View>
          </View>
        )}

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip History</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No trips yet</Text>
              <Text style={styles.emptySub}>Your ride and delivery history will appear here</Text>
            </View>
          ) : (
            transactions.map((tx) => (
              <TouchableOpacity key={tx.id} style={styles.txItem} onPress={() => navigation.navigate('BookingDetail', { bookingId: tx.id })} activeOpacity={0.7}>
                <View style={[styles.txIconBg, { backgroundColor: tx.status === 'completed' ? colors.primaryContainer : tx.status === 'cancelled' ? colors.errorContainer : colors.surfaceContainerLow }]}>
                  <Text style={styles.txIcon}>{tx.icon}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txTitle} numberOfLines={1}>{tx.title}</Text>
                  <Text style={styles.txTime}>{tx.time}</Text>
                </View>
                <View style={styles.txRight}>
                  {tx.amount > 0 && (
                    <Text style={[styles.txAmount, tx.status === 'cancelled' && styles.txAmountCancelled]}>
                      {tx.status === 'cancelled' ? '' : '-'}UGX {tx.amount.toLocaleString()}
                    </Text>
                  )}
                  <Text style={[styles.txStatus, { color: getStatusColor(tx.status) }]}>
                    {getStatusLabel(tx.status)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Payments are processed via MoMo escrow. Your money is held securely until your trip is completed.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  balanceCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.inverseSurface,
    borderRadius: 24,
    padding: spacing.xl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  balanceContent: { zIndex: 2 },
  balanceLabel: {
    ...typography.labelLg,
    color: colors.secondaryFixedDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: spacing.lg,
  },
  currency: {
    ...typography.headlineMd,
    color: colors.primaryContainer,
  },
  amount: {
    ...typography.displayLg,
    color: colors.surfaceBright,
    fontSize: 40,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.titleMd, color: colors.surfaceBright, fontWeight: '700' },
  statLabel: { ...typography.labelSm, color: colors.secondaryFixedDim, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },
  balanceGlow: {
    position: 'absolute',
    right: -48,
    top: -48,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: colors.primary,
    opacity: 0.1,
  },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { ...typography.labelLg, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  defaultMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: spacing.md,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconText: { fontSize: 10, fontWeight: '800' },
  methodInfo: { flex: 1 },
  methodName: { ...typography.titleMd, color: colors.onSurface },
  methodNumber: { ...typography.labelSm, color: colors.onSurfaceVariant, letterSpacing: 2 },
  defaultBadge: { backgroundColor: colors.primaryContainer, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  defaultText: { ...typography.labelSm, color: colors.onPrimaryContainer, fontWeight: '700' },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  txIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIcon: { fontSize: 18 },
  txInfo: { flex: 1 },
  txTitle: { ...typography.titleMd, color: colors.onSurface },
  txTime: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { ...typography.titleMd, color: colors.onSurface, fontWeight: '700' },
  txAmountCancelled: { color: colors.onSurfaceVariant, textDecorationLine: 'line-through' },
  txStatus: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.titleMd, color: colors.onSurface },
  emptySub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' },
  infoBox: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  infoText: { ...typography.bodySm, color: colors.onSurfaceVariant, lineHeight: 18 },
});
