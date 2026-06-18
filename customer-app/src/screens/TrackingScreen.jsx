import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useModal } from '../components/useModal';
import { io } from 'socket.io-client';
import { bookingAPI } from '../services/api';
import Grabber from '../components/Grabber';
import { colors, typography, spacing, radius } from '../theme';

const SOCKET_URL = 'https://boda.ocaya.space';

export default function TrackingScreen({ route, navigation }) {
  const { showModal, ModalComponent } = useModal();
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
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

    socket.on('connect', () => {
      socket.emit('join:booking', { bookingId });
    });

    socket.on('rider:moved', (data) => {
      setRiderLocation(data);
    });
  };

  const loadBooking = async () => {
    try {
      const { data } = await bookingAPI.getBooking(bookingId);
      setBooking(data.booking);
    } catch (err) {
      console.error('Failed to load booking:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await bookingAPI.cancelBooking(bookingId);
      loadBooking();
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const statusPillText = () => {
    if (!booking) return '';
    switch (booking.status) {
      case 'pending': return 'Finding a rider...';
      case 'accepted': return 'Rider is on the way';
      case 'in_progress': return 'Rider is 3 mins away';
      case 'completed': return 'Trip completed!';
      case 'cancelled': return 'Trip cancelled';
      default: return booking.status;
    }
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
      <View style={styles.mapCanvas}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusPillText}>{statusPillText()}</Text>
        </View>

        {riderLocation && (
          <View style={styles.riderMarker}>
            <View style={styles.riderPulse} />
            <View style={styles.riderIcon}>
              <Text style={styles.riderEmoji}>🏍</Text>
            </View>
            <View style={styles.riderLabel}>
              <Text style={styles.riderName}>{booking.rider_name || 'Rider'}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.bottomSheet}>
        <Grabber />
        <View style={styles.sheetContent}>
          <View style={styles.riderSection}>
            <View style={styles.riderAvatar}>
              <Text style={styles.riderAvatarText}>
                {booking.rider_name?.[0] || 'R'}
              </Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            </View>
            <View style={styles.riderInfo}>
              <Text style={styles.riderDetailName}>{booking.rider_name || 'Rider'}</Text>
              <View style={styles.riderMeta}>
                <Text style={styles.riderRating}>⭐ 4.9</Text>
                <Text style={styles.riderDot}>•</Text>
                <Text style={styles.riderPlate}>Boda #{Math.floor(Math.random() * 900 + 100)}</Text>
              </View>
            </View>
            <View style={styles.contactButtons}>
              <TouchableOpacity style={styles.chatBtn} onPress={() => showModal({ icon: '💬', title: 'Chat', message: 'Messaging feature coming soon.' })} activeOpacity={0.7}>
                <Text style={styles.contactIcon}>💬</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => {
                  const phone = booking.rider_phone;
                  if (phone) {
                    Linking.openURL(`tel:${phone}`);
                  } else {
                    showModal({ icon: '📞', title: 'Call Rider', message: 'Rider phone number not available yet.' });
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.contactIcon}>📞</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Vehicle</Text>
              <Text style={styles.detailValue}>Bajaj Pulsar</Text>
              <Text style={styles.detailSub}>Black/Red</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Estimated Fare</Text>
              <Text style={styles.detailValue}>UGX {(booking.fare_estimate || 0).toLocaleString()}</Text>
              <View style={styles.paymentInfo}>
                <View style={styles.mtnMini}><Text style={styles.mtnMiniText}>MTN</Text></View>
                <Text style={styles.paymentNumber}>•••• 6789</Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            {(booking.status === 'pending' || booking.status === 'accepted') && (
              <>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => showModal({ icon: '✅', title: 'Pickup Confirmed', message: 'Your rider is on the way!' })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryBtnText}>Confirm Pickup Location</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancel}
                  disabled={actionLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Cancel Trip</Text>
                </TouchableOpacity>
              </>
            )}
            {booking.status === 'completed' && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.replace('Rating', { bookingId, booking })}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Rate Your Trip</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  mapCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceContainerHigh,
    zIndex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  backIcon: {
    fontSize: 20,
    color: colors.onSurface,
  },
  statusPill: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.surfaceContainerLowest}ee`,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  statusPillText: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  riderMarker: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  riderPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryContainer,
    opacity: 0.3,
  },
  riderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  riderEmoji: {
    fontSize: 24,
  },
  riderLabel: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  riderName: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '600',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 16,
    zIndex: 40,
  },
  sheetContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 32,
  },
  riderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  riderAvatar: {
    position: 'relative',
    marginRight: spacing.md,
  },
  riderAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    marginRight: spacing.md,
  },
  riderAvatarText: {
    ...typography.headlineMd,
    color: colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedIcon: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  riderInfo: {
    flex: 1,
  },
  riderDetailName: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  riderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  riderRating: {
    ...typography.labelLg,
    color: colors.primary,
  },
  riderDot: {
    color: colors.outlineVariant,
  },
  riderPlate: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chatBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIcon: {
    fontSize: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  detailCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  detailLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  detailSub: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  mtnMini: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#FFCC00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mtnMiniText: {
    fontSize: 6,
    fontWeight: '800',
    color: '#000',
  },
  paymentNumber: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  actions: {
    gap: spacing.md,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    height: spacing.touchMin,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
  },
  cancelBtn: {
    height: spacing.touchMin,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.outlineVariant,
  },
  cancelBtnText: {
    ...typography.titleMd,
    color: colors.onSurfaceVariant,
  },
});
