import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { io } from 'socket.io-client';
import { useModal } from '../components/useModal';
import { bookingAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';

const SOCKET_URL = 'https://boda.ocaya.space';

export default function BookingDetailScreen({ route, navigation }) {
  const { showModal, ModalComponent } = useModal();
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    loadBooking();
    setupSocket();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const setupSocket = () => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join:booking', { bookingId }));
    socket.on('rider:moved', (data) => setRiderLocation(data));
  };

  const loadBooking = async () => {
    try {
      const { data } = await bookingAPI.getBooking(bookingId);
      setBooking(data.booking);
      if (data.booking?.payment) {
        setPaymentStatus(data.booking.payment);
      } else {
        try {
          const { data: payData } = await bookingAPI.getPaymentStatus(bookingId);
          const latest = payData.payments?.[0];
          if (latest) setPaymentStatus(latest);
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load booking:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    showModal({
      icon: '⚠️',
      title: 'Cancel Booking?',
      message: 'Are you sure you want to cancel this booking?',
      actions: [
        { label: 'No' },
        { label: 'Yes, cancel', primary: true, onPress: async () => {
          setActionLoading(true);
          try {
            await bookingAPI.cancelBooking(bookingId);
            loadBooking();
            showModal({ icon: '✅', title: 'Cancelled', message: 'Your booking has been cancelled.' });
          } catch (err) {
            const msg = err.response?.data?.error || 'Failed to cancel booking.';
            showModal({ icon: '⚠️', title: 'Error', message: msg });
          } finally {
            setActionLoading(false);
          }
        }},
      ],
    });
  };

  const handleRate = async (score) => {
    setActionLoading(true);
    try {
      await bookingAPI.rateBooking(bookingId, score, '');
      showModal({ icon: '✅', title: 'Thanks!', message: 'Your rating has been submitted.' });
      loadBooking();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit rating.';
      showModal({ icon: '⚠️', title: 'Rating', message: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const statusColors = {
    pending: '#f59e0b',
    accepted: colors.primary,
    in_progress: '#22c55e',
    completed: colors.primary,
    cancelled: colors.error,
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.onSurface }}>Booking not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: statusColors[booking.status] }]} />
        <Text style={styles.statusText}>{booking.status?.replace('_', ' ')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trip Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{booking.type === 'ride' ? 'Ride' : 'Delivery'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pickup</Text>
          <Text style={styles.value}>{booking.pickup_address || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Dropoff</Text>
          <Text style={styles.value}>{booking.dropoff_address || 'N/A'}</Text>
        </View>
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={styles.label}>Fare</Text>
          <Text style={[styles.value, { color: colors.primary, fontWeight: '700' }]}>
            UGX {(booking.fare_final || booking.fare_estimate || 0).toLocaleString()}
          </Text>
        </View>
        {paymentStatus && (
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={styles.label}>Payment</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: paymentStatus.status === 'released' || paymentStatus.status === 'held' ? '#22c55e' : paymentStatus.status === 'failed' ? '#ef4444' : '#f59e0b' }} />
              <Text style={[styles.value, { fontSize: 13 }]}>
                {paymentStatus.status === 'released' ? 'Paid' : paymentStatus.status === 'held' ? 'In Escrow' : paymentStatus.status === 'failed' ? 'Failed' : 'Processing'}
                {paymentStatus.method ? ` (${paymentStatus.method.toUpperCase()})` : ''}
              </Text>
            </View>
          </View>
        )}
      </View>

      {booking.rider_name && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rider</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{booking.rider_name}</Text>
          </View>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{booking.rider_phone || 'N/A'}</Text>
          </View>
        </View>
      )}

      {(booking.status === 'pending' || booking.status === 'accepted') && (
        <>
          <TouchableOpacity
            style={[styles.continueButton, actionLoading && { opacity: 0.5 }]}
            onPress={() => navigation.navigate('Tracking', { bookingId })}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelButton, actionLoading && { opacity: 0.5 }]}
            onPress={handleCancel}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        </>
      )}

      {booking.status === 'completed' && !booking.my_rating && (
        <View style={styles.ratingSection}>
          <Text style={styles.ratingTitle}>Rate your experience</Text>
          <View style={styles.ratingButtons}>
            {[1, 2, 3, 4, 5].map((score) => (
              <TouchableOpacity
                key={score}
                style={styles.ratingButton}
                onPress={() => handleRate(score)}
                disabled={actionLoading}
              >
                <Text style={styles.ratingButtonText}>{score}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {booking.status === 'completed' && booking.my_rating && (
        <View style={styles.ratingSection}>
          <Text style={styles.ratingTitle}>Your rating</Text>
          <Text style={{ ...typography.headlineMd, color: colors.primary, textAlign: 'center' }}>
            {'★'.repeat(booking.my_rating)}{'☆'.repeat(5 - booking.my_rating)}
          </Text>
          {booking.my_rating_comment ? (
            <Text style={{ ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.sm }}>
              "{booking.my_rating_comment}"
            </Text>
          ) : null}
        </View>
      )}
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingTop: 56,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.lg,
  },
  backIcon: {
    fontSize: 20,
    color: colors.onSurface,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    ...typography.titleMd,
    color: colors.onSurface,
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  cardTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  label: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  value: {
    ...typography.bodyMd,
    fontWeight: '500',
    color: colors.onSurface,
    maxWidth: '60%',
    textAlign: 'right',
  },
  continueButton: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.xl,
    height: spacing.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  continueButtonText: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: colors.errorContainer,
    borderRadius: radius.xl,
    height: spacing.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  cancelButtonText: {
    ...typography.titleMd,
    color: colors.error,
    fontWeight: '700',
  },
  ratingSection: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginTop: spacing.lg,
  },
  ratingTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginBottom: spacing.lg,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ratingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingButtonText: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
  },
});
