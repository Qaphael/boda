import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { riderAPI } from '../services/api';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

export default function HomeScreen({ navigation }) {
  const { rider, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [profile, setProfile] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const { showModal, ModalComponent } = useModal();

  useLocationTracking(rider?.riderId, null);

  useEffect(() => { loadProfile(); loadEarnings(); }, []);

  const loadProfile = async () => {
    try {
      if (rider?.riderId) {
        const { data } = await riderAPI.getProfile(rider.riderId);
        setProfile(data.rider);
        setIsOnline(data.rider?.is_online || false);
      }
    } catch (err) { console.error('Failed to load profile:', err); }
  };

  const loadEarnings = async () => {
    try {
      if (rider?.riderId) {
        const { data } = await riderAPI.getEarnings(rider.riderId, 'today');
        setEarnings(data.summary);
      }
    } catch (err) { console.error('Failed to load earnings:', err); }
  };

  const toggleOnline = async (value) => {
    try {
      if (!rider?.riderId) { showModal({ icon: '⚠️', title: 'Error', message: 'Complete registration first' }); return; }
      if (profile?.status !== 'verified') { showModal({ icon: '⚠️', title: 'Error', message: 'Account not verified yet' }); return; }
      await riderAPI.toggleOnline(rider.riderId, value);
      setIsOnline(value);
    } catch (err) { showModal({ icon: '⚠️', title: 'Error', message: 'Failed to update status' }); }
  };

  const handleLogout = () => {
    showModal({
      icon: '🚪',
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      actions: [
        { label: 'Cancel' },
        { label: 'Logout', primary: true, onPress: logout },
      ],
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapCanvas}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.menuBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.appBadge}>
            <Text style={styles.appBadgeText}>Gulu Express Rider</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7}>
            <Text style={styles.notifIcon}>🔔</Text>
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.onlineToggleContainer}>
          <View style={[styles.onlinePill, isOnline && styles.onlinePillActive]}>
            <View style={[styles.onlineDot, isOnline && styles.onlineDotActive]} />
            <Text style={[styles.onlineText, isOnline && styles.onlineTextActive]}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
            <Switch value={isOnline} onValueChange={toggleOnline} trackColor={{ false: colors.surfaceContainerHigh, true: colors.primaryContainer }} thumbColor={isOnline ? colors.primary : colors.surfaceContainerHighest} />
          </View>
        </View>
      </View>

      <ScrollView style={styles.bottomSheet} showsVerticalScrollIndicator={false}>
        <View style={styles.grabber}><View style={styles.grabberBar} /></View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{rider?.name?.[0] || 'R'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{rider?.name || 'Rider'}</Text>
            <View style={styles.profileMeta}>
              <Text style={styles.profileRating}>⭐ {profile?.avg_rating || '4.9'}</Text>
              <Text style={styles.profileDot}>•</Text>
              <Text style={styles.profilePlate}>{profile?.plate_number || 'N/A'}</Text>
            </View>
          </View>
          <Text style={styles.profileChevron}>›</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{earnings?.total_trips || 0}</Text>
            <Text style={styles.statLabel}>Today's Trips</Text>
            <Text style={styles.statTrend}>+2 from yesterday</Text>
          </View>
          <View style={[styles.statCard, styles.statCardHighlight]}>
            <Text style={styles.statValue}>UGX {(earnings?.total_revenue || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
            <Text style={styles.statTrend}>High demand zone</Text>
          </View>
        </View>

        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.quickLinkCard} onPress={() => navigation.navigate('Earnings')} activeOpacity={0.7}>
            <Text style={styles.quickLinkIcon}>💰</Text>
            <Text style={styles.quickLinkLabel}>Earnings Detail</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLinkCard} onPress={() => showModal({ icon: '🔧', title: 'Vehicle Status', message: 'Vehicle status coming soon.' })} activeOpacity={0.7}>
            <Text style={styles.quickLinkIcon}>🔧</Text>
            <Text style={styles.quickLinkLabel}>Vehicle Status</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Account Status</Text>
          <Text style={styles.statusValue}>{profile?.status || 'Not registered'}</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapCanvas: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surfaceContainerHighest, zIndex: 1 },
  topBar: { position: 'absolute', top: 56, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, zIndex: 10 },
  menuBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outlineVariant, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  menuIcon: { fontSize: 20, color: colors.onSurface },
  appBadge: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full },
  appBadgeText: { ...typography.labelLg, color: colors.onPrimaryContainer, fontWeight: '700' },
  notifBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outlineVariant },
  notifIcon: { fontSize: 20 },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  onlineToggleContainer: { position: 'absolute', top: 120, alignSelf: 'center', zIndex: 10 },
  onlinePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.surface}ee`, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.full, borderWidth: 2, borderColor: colors.outlineVariant, gap: 10 },
  onlinePillActive: { borderColor: '#22c55e', backgroundColor: '#22c55e1a' },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.outline },
  onlineDotActive: { backgroundColor: '#22c55e' },
  onlineText: { ...typography.labelLg, color: colors.onSurfaceVariant, letterSpacing: 1 },
  onlineTextActive: { color: '#22c55e', fontWeight: '700' },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 25, elevation: 16, zIndex: 20, maxHeight: '55%' },
  grabber: { alignItems: 'center', paddingVertical: spacing.md },
  grabberBar: { width: 40, height: 4, backgroundColor: colors.surfaceContainerHighest, borderRadius: 2 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLow, marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { ...typography.headlineMd, color: colors.onPrimaryContainer },
  profileInfo: { flex: 1 },
  profileName: { ...typography.titleMd, color: colors.onSurface },
  profileMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  profileRating: { ...typography.labelLg, color: colors.primary },
  profileDot: { color: colors.outlineVariant },
  profilePlate: { ...typography.labelLg, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  profileChevron: { fontSize: 24, color: colors.outline },
  statsGrid: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.inverseSurface, borderRadius: radius.xl, padding: spacing.lg },
  statCardHighlight: { backgroundColor: colors.primary },
  statValue: { ...typography.headlineMd, color: colors.surfaceBright, marginBottom: 4 },
  statLabel: { ...typography.labelSm, color: colors.secondaryFixedDim },
  statTrend: { ...typography.labelSm, color: colors.primaryContainer, marginTop: 4 },
  quickLinks: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  quickLinkCard: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.outlineVariant },
  quickLinkIcon: { fontSize: 28, marginBottom: spacing.sm },
  quickLinkLabel: { ...typography.labelLg, color: colors.onSurface },
  statusCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, flexDirection: 'row', justifyContent: 'space-between' },
  statusLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  statusValue: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface, textTransform: 'capitalize' },
});
