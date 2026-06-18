import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

export default function TripDetailsScreen({ route, navigation }) {
  const { booking } = route.params || {};
  const { showModal, ModalComponent } = useModal();

  const fare = booking?.fare_estimate || 4500;
  const baseFare = 1000;
  const distanceCharge = fare - baseFare - 500;
  const tip = 500;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.mapPlaceholder}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Main')} activeOpacity={0.7}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emergencyBtn} onPress={() => showModal({ icon: '🚨', title: 'Emergency', message: 'Emergency services coming soon.' })} activeOpacity={0.7}>
            <Text style={styles.emergencyIcon}>🚨</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tripCard}>
          <View style={styles.tripBadge}>
            <Text style={styles.tripBadgeText}>BODA BODA</Text>
          </View>
          <Text style={styles.tripDate}>{booking?.completed_at ? new Date(booking.completed_at).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'May 12, 10:42 AM'}</Text>
          <View style={styles.tripStatus}>
            <Text style={styles.tripStatusText}>Trip Completed</Text>
          </View>
          <Text style={styles.tripFare}>UGX {fare.toLocaleString()}</Text>
          <View style={styles.starsRow}>
            {[1,2,3,4,5].map(s => <Text key={s} style={styles.star}>★</Text>)}
          </View>

          <View style={styles.routeSection}>
            <View style={styles.locationRow}>
              <View style={styles.greenDot} />
              <Text style={styles.locationText}>{booking?.pickup_address || 'Gulu Main Market'}</Text>
            </View>
            <View style={styles.dashedLine} />
            <View style={styles.locationRow}>
              <View style={styles.redDot} />
              <Text style={styles.locationText}>{booking?.dropoff_address || "St. Mary's Hospital Lacor"}</Text>
            </View>
          </View>

          <View style={styles.bentoGrid}>
            <View style={styles.bentoCard}>
              <Text style={styles.bentoValue}>12 mins</Text>
              <Text style={styles.bentoLabel}>Duration</Text>
            </View>
            <View style={styles.bentoCard}>
              <Text style={styles.bentoValue}>4.2 km</Text>
              <Text style={styles.bentoLabel}>Distance</Text>
            </View>
          </View>

          <View style={styles.fareBreakdown}>
            <Text style={styles.fareBreakdownTitle}>Fare Breakdown</Text>
            <View style={styles.fareRow}><Text style={styles.fareLabel}>Base Fare</Text><Text style={styles.fareValue}>UGX {baseFare.toLocaleString()}</Text></View>
            <View style={styles.fareRow}><Text style={styles.fareLabel}>Distance 4.2km</Text><Text style={styles.fareValue}>UGX {distanceCharge.toLocaleString()}</Text></View>
            <View style={styles.fareRow}><Text style={styles.fareLabel}>Tip</Text><Text style={styles.fareValue}>UGX {tip.toLocaleString()}</Text></View>
            <View style={[styles.fareRow, styles.fareRowTotal]}><Text style={styles.fareLabelTotal}>Total</Text><Text style={styles.fareValueTotal}>UGX {fare.toLocaleString()}</Text></View>
          </View>

          <View style={styles.paymentStatus}>
            <Text style={styles.paymentIcon}>✓</Text>
            <Text style={styles.paymentText}>Paid via MoMo (***123)</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => showModal({ icon: '📋', title: 'Report', message: 'Issue reporting coming soon.' })} activeOpacity={0.8}>
            <Text style={styles.ghostBtnText}>Report an Issue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Main')} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapPlaceholder: { height: 300, backgroundColor: colors.surfaceContainerHigh, position: 'relative' },
  backBtn: { position: 'absolute', top: 56, left: spacing.lg, width: 48, height: 48, borderRadius: 24, backgroundColor: `${colors.surface}ee`, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  backIcon: { fontSize: 20, color: colors.onSurface },
  emergencyBtn: { position: 'absolute', top: 56, right: spacing.lg, width: 48, height: 48, borderRadius: 24, backgroundColor: `${colors.errorContainer}ee`, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  emergencyIcon: { fontSize: 20 },
  tripCard: { marginHorizontal: spacing.lg, marginTop: -40, backgroundColor: colors.surfaceContainerLowest, borderRadius: 24, padding: spacing.xl, borderWidth: 1, borderColor: colors.outlineVariant, zIndex: 10 },
  tripBadge: { backgroundColor: colors.inverseSurface, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full, marginBottom: spacing.md },
  tripBadgeText: { ...typography.labelSm, color: colors.inverseOnSurface, fontWeight: '700' },
  tripDate: { ...typography.labelLg, color: colors.onSurfaceVariant, marginBottom: 4 },
  tripStatus: { marginBottom: spacing.sm },
  tripStatusText: { ...typography.labelLg, color: '#22c55e', fontWeight: '600' },
  tripFare: { ...typography.displayLg, color: colors.onSurface, fontSize: 32, marginBottom: spacing.sm },
  starsRow: { flexDirection: 'row', gap: 4, marginBottom: spacing.lg },
  star: { fontSize: 20, color: colors.primary },
  routeSection: { marginBottom: spacing.lg },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  greenDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e' },
  redDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.error },
  dashedLine: { width: 2, height: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.outlineVariant, marginLeft: 5 },
  locationText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  bentoGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  bentoCard: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center' },
  bentoValue: { ...typography.titleMd, color: colors.onSurface },
  bentoLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  fareBreakdown: { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg },
  fareBreakdownTitle: { ...typography.titleMd, color: colors.onSurface, marginBottom: spacing.md },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  fareLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  fareValue: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface },
  fareRowTotal: { borderTopWidth: 1, borderTopColor: colors.outlineVariant, marginTop: spacing.sm, paddingTop: spacing.md },
  fareLabelTotal: { ...typography.titleMd, color: colors.onSurface, fontWeight: '700' },
  fareValueTotal: { ...typography.titleMd, color: colors.primary, fontWeight: '700' },
  paymentStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paymentIcon: { fontSize: 16, color: '#22c55e', fontWeight: '700' },
  paymentText: { ...typography.labelLg, color: colors.onSurfaceVariant },
  actions: { paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: spacing.lg },
  ghostBtn: { height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.outlineVariant },
  ghostBtnText: { ...typography.titleMd, color: colors.onSurfaceVariant },
  primaryBtn: { backgroundColor: colors.primaryContainer, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { ...typography.titleMd, color: colors.onPrimaryContainer },
});
