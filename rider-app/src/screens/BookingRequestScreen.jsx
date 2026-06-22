import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { bookingAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

export default function BookingRequestScreen({ route, navigation }) {
  const { booking } = route.params || {};
  const [countdown, setCountdown] = useState(15);
  const [accepting, setAccepting] = useState(false);
  const timerRef = useRef(null);
  const { showModal, ModalComponent } = useModal();

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          navigation.goBack();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleAccept = async () => {
    clearInterval(timerRef.current);
    setAccepting(true);
    try {
      await bookingAPI.acceptBooking(booking.id);
      navigation.replace('ActiveBooking', { booking });
    } catch (err) {
      showModal({ icon: '⚠️', title: 'Error', message: err.response?.data?.error || 'Failed to accept booking' });
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    clearInterval(timerRef.current);
    navigation.goBack();
  };

  const tripDistance = booking?.distance_km ? `${booking.distance_km} km` : '--';
  const customerName = booking?.customer_name || 'Customer';
  const customerRating = booking?.customer_rating || '--';
  const customerTrips = booking?.customer_trips || 0;
  const pickup = booking?.pickup_address || 'Pickup location';
  const dropoff = booking?.dropoff_address || 'Dropoff location';
  const fare = booking?.fare_estimate || 0;

  return (
    <View style={styles.container}>
      <View style={styles.overlay} />
      <View style={styles.bottomSheet}>
        <View style={styles.grabber}><View style={styles.grabberBar} /></View>

        <View style={styles.badgeRow}>
          <View style={styles.newRequestBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.badgeText}>New Request</Text>
          </View>
        </View>

        <View style={styles.countdownContainer}>
          <View style={styles.countdownCircle}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
          <Text style={styles.countdownLabel}>seconds remaining</Text>
        </View>

        <View style={styles.customerSection}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>{customerName[0]}</Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customerName}</Text>
            <View style={styles.customerMeta}>
              <Text style={styles.customerRating}>⭐ {customerRating}</Text>
              <Text style={styles.customerDot}>•</Text>
              <Text style={styles.customerTrips}>{customerTrips} trips</Text>
            </View>
          </View>
          <View style={styles.rideTypeBadge}>
            <Text style={styles.rideTypeText}>{booking?.type === 'delivery' ? 'Delivery' : 'Boda Ride'}</Text>
          </View>
        </View>

        <View style={styles.locationSection}>
          <View style={styles.locationRow}>
            <View style={styles.greenDot} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationAddress}>{pickup}</Text>
            </View>
          </View>
          <View style={styles.dashedLine} />
          <View style={styles.locationRow}>
            <View style={styles.redDot} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Drop-off</Text>
              <Text style={styles.locationAddress}>{dropoff}</Text>
              <Text style={styles.locationDistance}>{tripDistance} total trip</Text>
            </View>
          </View>
        </View>

        <View style={styles.fareCard}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Estimated Fare</Text>
            <Text style={styles.fareAmount}>UGX {fare.toLocaleString()}</Text>
          </View>
          <View style={styles.fareRow}>
            <View style={styles.mtnMini}><Text style={styles.mtnMiniText}>MTN</Text></View>
            <Text style={styles.paymentInfo}>MoMo payment</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.acceptBtn, accepting && { opacity: 0.5 }]} onPress={handleAccept} disabled={accepting} activeOpacity={0.8}>
            <Text style={styles.acceptBtnText}>{accepting ? 'Accepting...' : 'Accept Ride'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} disabled={accepting} activeOpacity={0.8}>
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: '85%' },
  grabber: { alignItems: 'center', paddingVertical: spacing.md },
  grabberBar: { width: 40, height: 4, backgroundColor: colors.surfaceContainerHighest, borderRadius: 2 },
  badgeRow: { alignItems: 'center', marginBottom: spacing.lg },
  newRequestBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryContainer, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, gap: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  badgeText: { ...typography.labelLg, color: colors.onPrimaryContainer, fontWeight: '700' },
  countdownContainer: { alignItems: 'center', marginBottom: spacing.xl },
  countdownCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  countdownText: { ...typography.headlineMd, color: colors.primary },
  countdownLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 4 },
  customerSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  customerAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  customerAvatarText: { ...typography.headlineMd, color: colors.primary },
  customerInfo: { flex: 1 },
  customerName: { ...typography.titleMd, color: colors.onSurface },
  customerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  customerRating: { ...typography.labelLg, color: colors.primary },
  customerDot: { color: colors.outlineVariant },
  customerTrips: { ...typography.labelLg, color: colors.onSurfaceVariant },
  rideTypeBadge: { backgroundColor: colors.secondaryContainer, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  rideTypeText: { ...typography.labelSm, color: colors.onSecondaryContainer, fontWeight: '600' },
  locationSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  greenDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', marginTop: 4 },
  redDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.error, marginTop: 4 },
  dashedLine: { width: 2, height: 24, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.outlineVariant, marginLeft: 5 },
  locationInfo: { flex: 1 },
  locationLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1 },
  locationAddress: { ...typography.bodyMd, color: colors.onSurface, marginTop: 2 },
  locationDistance: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  fareCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.xl },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  fareLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  fareAmount: { ...typography.headlineMd, color: colors.onSurface },
  mtnMini: { width: 24, height: 16, borderRadius: 4, backgroundColor: '#FFCC00', alignItems: 'center', justifyContent: 'center' },
  mtnMiniText: { fontSize: 7, fontWeight: '800', color: '#000' },
  paymentInfo: { ...typography.labelLg, color: colors.onSurfaceVariant },
  actions: { paddingHorizontal: spacing.lg, gap: spacing.md },
  acceptBtn: { backgroundColor: colors.primaryContainer, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  acceptBtnText: { ...typography.headlineMd, color: colors.onPrimaryContainer },
  declineBtn: { backgroundColor: colors.inverseSurface, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  declineBtnText: { ...typography.titleMd, color: colors.inverseOnSurface },
});
