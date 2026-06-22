import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { io } from 'socket.io-client';
import { bookingAPI } from '../services/api';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

const SOCKET_URL = 'https://boda.ocaya.space';

export default function ActiveBookingScreen({ route, navigation }) {
  const { booking } = route.params || {};
  const [tripPhase, setTripPhase] = useState('pickup');
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);
  const { showModal, ModalComponent } = useModal();

  useLocationTracking(null, booking?.id);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join:booking', { bookingId: booking?.id }));
    socket.on('booking:status', (data) => {
      if (data.status === 'in_progress') setTripPhase('trip');
    });
    return () => socket.disconnect();
  }, [booking?.id]);

  const handleConfirmPickup = async () => {
    setLoading(true);
    try {
      await bookingAPI.startBooking(booking.id);
      setTripPhase('trip');
    } catch (err) {
      showModal({ icon: '⚠️', title: 'Error', message: 'Failed to confirm pickup' });
    } finally { setLoading(false); }
  };

  const handleCompleteTrip = async () => {
    setLoading(true);
    try {
      await bookingAPI.completeBooking(booking.id);
      navigation.replace('TripDetails', { booking });
    } catch (err) {
      showModal({ icon: '⚠️', title: 'Error', message: 'Failed to complete trip' });
    } finally { setLoading(false); }
  };

  const handleCancel = async () => {
    showModal({
      icon: '⚠️',
      title: 'Cancel Trip',
      message: 'Are you sure you want to cancel?',
      actions: [
        { label: 'No' },
        {
          label: 'Yes', primary: true, onPress: async () => {
            try { await bookingAPI.cancelBooking(booking.id); navigation.goBack(); } catch (err) { showModal({ icon: '⚠️', title: 'Error', message: 'Failed to cancel' }); }
          }
        },
      ],
    });
  };

  const progressPercent = tripPhase === 'pickup' ? 25 : tripPhase === 'trip' ? 60 : 100;
  const progressSteps = ['To Pickup', 'In Progress', 'Complete'];
  const activeStep = tripPhase === 'pickup' ? 0 : tripPhase === 'trip' ? 1 : 2;

  return (
    <View style={styles.container}>
      <View style={styles.mapCanvas}>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusPillText}>{tripPhase === 'pickup' ? 'Heading to Pickup' : 'Trip in Progress'}</Text>
        </View>
      </View>

      <View style={styles.customerCard}>
        <View style={styles.customerAvatar}>
          <Text style={styles.customerAvatarText}>{booking?.customer_name?.[0] || 'C'}</Text>
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{booking?.customer_name || 'Customer'}</Text>
          <Text style={styles.customerMeta}>⭐ {booking?.customer_rating || '--'} • {booking?.customer_trips || 0} trips</Text>
        </View>
        <View style={styles.contactBtns}>
          <TouchableOpacity style={styles.callBtn} onPress={() => { const p = booking?.customer_phone; p ? Linking.openURL(`tel:${p}`) : showModal({ icon: '⚠️', title: 'Error', message: 'Phone not available' }); }} activeOpacity={0.7}>
            <Text style={styles.contactIcon}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatBtn} onPress={() => showModal({ icon: '💬', title: 'Chat', message: 'Messaging coming soon.' })} activeOpacity={0.7}>
            <Text style={styles.contactIcon}>💬</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.grabber}><View style={styles.grabberBar} /></View>

        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.progressSteps}>
            {progressSteps.map((step, i) => (
              <Text key={step} style={[styles.progressStepText, i === activeStep && styles.progressStepActive]}>{step}</Text>
            ))}
          </View>
        </View>

        <View style={styles.locationSection}>
          <View style={styles.locationRow}>
            <View style={styles.greenDot} />
            <Text style={styles.locationText}>{booking?.pickup_address || 'Pickup'}</Text>
          </View>
          <View style={styles.dashedLine} />
          <View style={styles.locationRow}>
            <View style={styles.redDot} />
            <Text style={styles.locationText}>{booking?.dropoff_address || 'Dropoff'}</Text>
          </View>
        </View>

        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Fare</Text>
          <Text style={styles.fareAmount}>UGX {(booking?.fare_estimate || 0).toLocaleString()}</Text>
        </View>

        <View style={styles.actions}>
          {tripPhase === 'pickup' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirmPickup} disabled={loading} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>{loading ? 'Confirming...' : 'Confirm Pickup'}</Text>
            </TouchableOpacity>
          )}
          {tripPhase === 'trip' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleCompleteTrip} disabled={loading} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>{loading ? 'Completing...' : 'Complete Trip'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>Cancel Trip</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapCanvas: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surfaceContainerHigh, zIndex: 1 },
  statusPill: { position: 'absolute', top: 56, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.primaryContainer}ee`, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.full, zIndex: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginRight: 8 },
  statusPillText: { ...typography.titleMd, color: colors.onPrimaryContainer },
  customerCard: { position: 'absolute', top: 110, left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.surface}ee`, borderRadius: radius.xl, padding: spacing.md, zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  customerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  customerAvatarText: { ...typography.titleMd, color: colors.onPrimaryContainer },
  customerInfo: { flex: 1 },
  customerName: { ...typography.titleMd, color: colors.onSurface },
  customerMeta: { ...typography.labelSm, color: colors.onSurfaceVariant },
  contactBtns: { flexDirection: 'row', gap: 8 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  chatBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondaryContainer, alignItems: 'center', justifyContent: 'center' },
  contactIcon: { fontSize: 18 },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 30, elevation: 16, zIndex: 20, paddingBottom: 32 },
  grabber: { alignItems: 'center', paddingVertical: spacing.md },
  grabberBar: { width: 40, height: 4, backgroundColor: colors.surfaceContainerHighest, borderRadius: 2 },
  progressSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  progressBar: { height: 6, backgroundColor: colors.surfaceContainerHigh, borderRadius: 3, marginBottom: spacing.sm },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  progressSteps: { flexDirection: 'row', justifyContent: 'space-between' },
  progressStepText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  progressStepActive: { color: colors.primary, fontWeight: '700' },
  locationSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  greenDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e' },
  redDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.error },
  dashedLine: { width: 2, height: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.outlineVariant, marginLeft: 5 },
  locationText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  fareLabel: { ...typography.titleMd, color: colors.onSurfaceVariant },
  fareAmount: { ...typography.headlineMd, color: colors.onSurface },
  actions: { paddingHorizontal: spacing.lg, gap: spacing.md },
  primaryBtn: { backgroundColor: colors.primary, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { ...typography.titleMd, color: colors.onPrimaryContainer },
  cancelBtn: { height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.outlineVariant },
  cancelBtnText: { ...typography.titleMd, color: colors.onSurfaceVariant },
});
