import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModal } from '../components/useModal';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { showModal, ModalComponent } = useModal();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProfile = async () => {
    try {
      const [profileRes, paymentRes] = await Promise.all([
        profileAPI.getProfile(),
        profileAPI.getPaymentMethods().catch(() => ({ data: { methods: [] } })),
      ]);
      setProfile(profileRes.data.user);
      setStats(profileRes.data.stats);
      setPaymentMethods(paymentRes.data.methods || []);
      setEditName(profileRes.data.user.name || '');
      setEditEmail(profileRes.data.user.email || '');
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
    setEditEmail(profile?.email || '');
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showModal({ icon: '⚠️', title: 'Name Required', message: 'Please enter your name.' });
      return;
    }
    setSaving(true);
    try {
      const { data } = await profileAPI.updateProfile({ name: editName.trim(), email: editEmail.trim() || null });
      setProfile(data.user);
      setEditing(false);
      showModal({ icon: '✅', title: 'Profile Updated', message: 'Your profile has been saved.' });
    } catch (err) {
      showModal({ icon: '❌', title: 'Update Failed', message: 'Could not save profile. Try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSupport = () => {
    showModal({ icon: '📞', title: 'Help & Support', message: 'For ride issues, use the support ticket in your booking details.\n\nFor account issues, email support@boda.app\n\nAvailable 24/7 in Gulu.' });
  };

  const handlePrivacy = () => {
    showModal({ icon: '🔒', title: 'Privacy Policy', message: 'Boda collects location data during active rides only.\n\nYour phone number is never shared with riders.\n\nPayment data is processed securely via MTN/Airtel MoMo.' });
  };

  const handleTerms = () => {
    showModal({ icon: '📋', title: 'Terms of Service', message: 'By using Boda you agree to our terms.\n\nRides are between you and the rider.\nBoda facilitates payment via escrow.\n\nRatings help keep our community safe.' });
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
        {/* Hero / Avatar */}
        <View style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarGlow} />
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.name?.[0]?.toUpperCase() || profile?.phone?.[3] || '?'}
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
              <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} placeholder="Email (optional)" placeholderTextColor={colors.onSurfaceVariant} keyboardType="email-address" autoCapitalize="none" />
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
              {profile?.email && <Text style={styles.userEmail}>{profile.email}</Text>}
              <Text style={styles.memberSince}>Member since {formatDate(profile?.created_at)}</Text>
            </>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.total_rides || 0}</Text>
            <Text style={styles.statLabel}>Rides</Text>
          </View>
          <View style={[styles.statCard, styles.statCardMiddle]}>
            <Text style={styles.statValue}>{stats?.total_deliveries || 0}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(stats?.total_spent)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>

        {stats && stats.total_bookings > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Trip Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{stats.total_bookings}</Text>
                <Text style={styles.summaryLabel}>Total Trips</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{stats.avg_distance} km</Text>
                <Text style={styles.summaryLabel}>Avg Distance</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{stats.ratings_given}</Text>
                <Text style={styles.summaryLabel}>Reviews</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{stats.total_cancellations}</Text>
                <Text style={styles.summaryLabel}>Cancelled</Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment Methods */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Payment</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.settingsItem} onPress={() => navigation.navigate('PaymentMethods')} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>💳</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Payment Methods</Text>
                <Text style={styles.itemSub}>{defaultPayment ? `${defaultPayment.type.toUpperCase()} • ${defaultPayment.phone_number}` : 'No methods added'}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Saved Places */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Saved Places</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.settingsItem} onPress={() => navigation.navigate('SavedPlaces')} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>📍</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Manage Saved Places</Text>
                <Text style={styles.itemSub}>Home, Work, and favorites</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Referrals */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Referrals</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.settingsItem} onPress={() => navigation.navigate('Referral')} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>🎁</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Invite Friends</Text>
                <Text style={styles.itemSub}>Share your code, earn rewards</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Safety */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Safety</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.settingsItem} onPress={() => navigation.navigate('EmergencyContacts')} activeOpacity={0.7}>
              <Text style={[styles.itemIcon, { color: colors.error }]}>🚨</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Emergency Contacts</Text>
                <Text style={styles.itemSub}>Up to 3 trusted contacts</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.settingsItemBorder} />
            <TouchableOpacity style={styles.settingsItem} onPress={() => navigation.navigate('NotificationSettings')} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>🔔</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Notification Settings</Text>
                <Text style={styles.itemSub}>Push, SMS, email preferences</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Preferences</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.settingsItem} onPress={() => navigation.navigate('Language')} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>🌐</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Language</Text>
                <Text style={styles.itemSub}>English, Luganda, Acholi</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Support</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.settingsItem} onPress={handleSupport} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>❓</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Help & Support</Text>
                <Text style={styles.itemSub}>24/7 customer support</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal */}
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
          <Text style={styles.version}>Boda v1.0</Text>
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
  heroSection: { alignItems: 'center', marginBottom: spacing.xl, paddingHorizontal: spacing.lg },
  avatarWrapper: { position: 'relative', marginBottom: spacing.lg },
  avatarGlow: { position: 'absolute', inset: -8, borderRadius: 72, backgroundColor: colors.primaryContainer, opacity: 0.2 },
  avatar: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.surfaceContainerHighest },
  avatarText: { ...typography.displayLg, color: colors.primary, fontSize: 48 },
  editBtn: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  editIcon: { fontSize: 16 },
  userName: { ...typography.headlineMd, color: colors.onSurface },
  userPhone: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4 },
  userEmail: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
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
  summaryCard: { marginHorizontal: spacing.lg, marginBottom: spacing.xl, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant },
  summaryTitle: { ...typography.labelLg, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryValue: { ...typography.titleMd, color: colors.onSurface, fontWeight: '700' },
  summaryLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
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
