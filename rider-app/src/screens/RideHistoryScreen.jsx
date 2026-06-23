import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { bookingAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';

export default function RideHistoryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { rider } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    try {
      const { data } = await bookingAPI.getMyBookings();
      setBookings(data.bookings || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadHistory(); }, []));

  const onRefresh = () => { setRefreshing(true); loadHistory(); };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-UG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const statusColor = (status) => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'cancelled': return colors.error;
      case 'in_progress': return colors.primary;
      case 'accepted': return '#3b82f6';
      default: return colors.onSurfaceVariant;
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('TripDetails', { booking: item })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: item.type === 'delivery' ? colors.secondaryContainer : colors.primaryContainer }]}>
          <Text style={styles.typeIcon}>{item.type === 'delivery' ? '📦' : '🏍'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardType}>{item.type === 'ride' ? 'Ride' : 'Delivery'}</Text>
          <Text style={styles.cardDate}>{formatDate(item.completed_at || item.created_at)}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardFare}>UGX {(item.fare_final || item.fare_estimate || 0).toLocaleString()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status?.replace('_', ' ')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardRoute}>
        <View style={styles.routeRow}>
          <View style={styles.greenDot} />
          <Text style={styles.routeText} numberOfLines={1}>{item.pickup_address || 'Pickup'}</Text>
        </View>
        <View style={styles.dashedLine} />
        <View style={styles.routeRow}>
          <View style={styles.redDot} />
          <Text style={styles.routeText} numberOfLines={1}>{item.dropoff_address || 'Dropoff'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Ride History</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No rides yet</Text>
              <Text style={styles.emptySub}>Your completed rides will appear here</Text>
            </View>
          )
        }
        contentContainerStyle={bookings.length === 0 ? styles.emptyList : styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: colors.onSurface },
  topTitle: { ...typography.titleLg, color: colors.onSurface, fontWeight: '700' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  emptyList: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.headlineMd, color: colors.onSurface, marginBottom: 4 },
  emptySub: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.outlineVariant },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  typeBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  typeIcon: { fontSize: 20 },
  cardInfo: { flex: 1 },
  cardType: { ...typography.titleMd, color: colors.onSurface },
  cardDate: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardFare: { ...typography.titleMd, color: colors.primary, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  statusText: { ...typography.labelSm, fontWeight: '600', textTransform: 'capitalize' },
  cardRoute: {},
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  dashedLine: { width: 2, height: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.outlineVariant, marginLeft: 3 },
  routeText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
});
