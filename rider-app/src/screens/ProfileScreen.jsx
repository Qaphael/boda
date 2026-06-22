import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useModal } from '../components/useModal';
import { useAuth } from '../context/AuthContext';
import { riderAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { showModal, ModalComponent } = useModal();
  const { rider, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProfile = async () => {
    try {
      if (rider?.riderId) {
        const [profileRes, earningsRes] = await Promise.all([
          riderAPI.getProfile(rider.riderId),
          riderAPI.getEarnings(rider.riderId, 'all').catch(() => ({ data: { summary: {} } })),
        ]);
        setProfile(profileRes.data.rider);
        setEarnings(earningsRes.data.summary);
        setEditName(profileRes.data.rider?.name || '');
      } else if (rider) {
        setProfile({
          name: rider.name,
          phone: rider.phone,
          plate_number: rider.plate_number || 'N/A',
          status: rider.status || 'not_registered',
          avg_rating: rider.avg_rating,
          total_trips: 0,
          total_cancellations: 0,
          created_at: null,
        });
        setEditName(rider.name || '');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
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

  const handleEditProfile = () => setEditing(true);

  const handleCancelEdit = () => {
    setEditing(false);
    setEditName(profile?.name || '');
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showModal({ icon: '⚠️', title: 'Name Required', message: 'Please enter your name.' });
      return;
    }
    setSaving(true);
    try {
      if (rider?.riderId) {
        await riderAPI.updateVehicle(rider.riderId, { name: editName.trim() });
      }
      setProfile(prev => ({ ...prev, name: editName.trim() }));
      setEditing(false);
      showModal({ icon: '✅', title: 'Profile Updated', message: 'Your profile has been saved.' });
    } catch (err) {
      showModal({ icon: '❌', title: 'Update Failed', message: 'Could not save profile. Try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSupport = () => {
    navigation.navigate('Support');
  };

  const handlePrivacy = () => {
    showModal({ icon: '🔒', title: 'Privacy Policy', message: 'Boda collects location data during active rides only.\n\nYour phone number is never shared with customers.\n\nPayment data is processed securely via MTN/Airtel MoMo.' });
  };

  const handleTerms = () => {
    showModal({ icon: '📋', title: 'Terms of Service', message: 'By using Boda Rider you agree to our terms.\n\nYou must maintain valid vehicle documents.\n\nRatings help keep our community safe.' });
  };

  const formatCurrency = (amount) => {
    return `UGX ${Number(amount || 0).toLocaleString()}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const statusColor = profile?.status === 'verified' ? '#22c55e' : profile?.status === 'flagged' ? '#f59e0b' : profile?.status === 'suspended' ? colors.error : colors.onSurfaceVariant;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarGlow} />
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.name?.[0]?.toUpperCase() || rider?.phone?.[3] || '?'}
              </Text>
            </View>
            {!editing && (
              <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile} activeOpacity={0.7}>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <View style={styles.editForm}>
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Your name" placeholderTextColor={colors.onSurfaceVariant} />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit} activeOpacity={0.7}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveProfile} activeOpacity={0.7} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.userName}>{profile?.name || 'Set your name'}</Text>
              <Text style={styles.userPhone}>{profile?.phone ? `+${profile.phone}` : ''}</Text>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>{profile?.status || 'Not registered'}</Text>
              </View>
              <Text style={styles.memberSince}>Member since {formatDate(profile?.created_at)}</Text>
            </>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.total_trips || earnings?.total_trips || 0}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={[styles.statCard, styles.statCardMiddle]}>
            <Text style={styles.statValue}>{formatCurrency(earnings?.total_revenue)}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>⭐ {profile?.avg_rating || '--'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Vehicle</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.settingsItem} onPress={() => navigation.navigate('Vehicle')} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>🏍</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Vehicle & Safety</Text>
                <Text style={styles.itemSub}>{profile?.plate_number || 'N/A'} • Daily safety check</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Earnings</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.settingsItem} onPress={() => navigation.navigate('Earnings')} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>💰</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Earnings & History</Text>
                <Text style={styles.itemSub}>View trips and payouts</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.settingsItemBorder} />
            <TouchableOpacity style={styles.settingsItem} onPress={() => navigation.navigate('Incentives')} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>⭐</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Rewards & Incentives</Text>
                <Text style={styles.itemSub}>Tier status, quests, bonuses</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Account</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.settingsItem} onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>📝</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Update Registration</Text>
                <Text style={styles.itemSub}>Name, documents, vehicle info</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Support</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.settingsItem} onPress={handleSupport} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>🎧</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Help & Support</Text>
                <Text style={styles.itemSub}>Create tickets, FAQ, emergency</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Legal</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.settingsItem} onPress={handlePrivacy} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>🔒</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Privacy Policy</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.settingsItemBorder} />
            <TouchableOpacity style={styles.settingsItem} onPress={handleTerms} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>📋</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Terms of Service</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.version}>Boda Rider v1.0</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 56 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  heroSection: { alignItems: 'center', marginBottom: spacing.xl, paddingHorizontal: spacing.lg },
  avatarWrapper: { position: 'relative', marginBottom: spacing.lg },
  avatarGlow: { position: 'absolute', inset: -8, borderRadius: 72, backgroundColor: colors.primaryContainer, opacity: 0.2 },
  avatar: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.surfaceContainerHighest },
  avatarText: { ...typography.displayLg, color: colors.primary, fontSize: 48 },
  editBtn: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  editIcon: { fontSize: 16 },
  userName: { ...typography.headlineMd, color: colors.onSurface },
  userPhone: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: colors.surfaceContainerLow, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...typography.labelLg, textTransform: 'capitalize', fontWeight: '600' },
  memberSince: { ...typography.labelSm, color: colors.outline, marginTop: 6 },
  editForm: { width: '100%', gap: spacing.md, marginTop: spacing.sm },
  input: { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.onSurface },
  editActions: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.outlineVariant, alignItems: 'center' },
  cancelText: { ...typography.titleMd, color: colors.onSurfaceVariant },
  saveBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { ...typography.titleMd, color: '#fff', fontWeight: '700' },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.xl },
  statCard: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, alignItems: 'center', gap: 4 },
  statCardMiddle: { borderLeftWidth: 1, borderRightWidth: 1 },
  statValue: { ...typography.titleLg, color: colors.onSurface, fontWeight: '700' },
  statLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  settingsGroup: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  groupTitle: { ...typography.labelLg, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md, paddingLeft: 8 },
  groupCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden' },
  settingsItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  settingsItemBorder: { height: 1, backgroundColor: colors.outlineVariant, marginLeft: spacing.lg + 30 },
  itemIcon: { fontSize: 22 },
  itemContent: { flex: 1 },
  itemLabel: { ...typography.titleMd, color: colors.onSurface },
  itemSub: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  chevron: { fontSize: 24, color: colors.outline },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: spacing.lg, padding: spacing.lg, backgroundColor: colors.errorContainer, borderRadius: radius.xl, marginBottom: spacing.xl },
  logoutIcon: { fontSize: 20 },
  logoutText: { ...typography.titleMd, color: colors.error, fontWeight: '700' },
  footer: { alignItems: 'center', paddingBottom: spacing.xl },
  version: { ...typography.labelSm, color: colors.outline },
});
