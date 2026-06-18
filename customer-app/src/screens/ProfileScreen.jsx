import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useModal } from '../components/useModal';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, radius } from '../theme';

const SETTINGS_GROUPS = [
  {
    title: 'Saved Places',
    items: [
      { icon: '🏠', label: 'Home', sub: 'Gulu City, Main Street' },
      { icon: '💼', label: 'Work', sub: 'Gulu University Gate' },
      { icon: '🏪', label: 'Market', sub: 'Gulu Main Market' },
    ],
  },
  {
    title: 'Safety Settings',
    items: [
      { icon: '🚨', label: 'Emergency Contacts', sub: 'Notify contacts in case of emergency', iconColor: colors.error },
      { icon: '🛡', label: 'Trusted Contacts', sub: 'Share your trip status automatically' },
    ],
  },
  {
    title: 'Support & Extras',
    items: [
      { icon: '❓', label: 'Help & Support' },
      { icon: '🏷', label: 'Promotions & Discounts', badge: '2 NEW' },
    ],
  },
];

export default function ProfileScreen() {
  const { showModal, ModalComponent } = useModal();
  const { user, logout } = useAuth();

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

  const handleEditProfile = () => {
    showModal({ icon: '✏️', title: 'Edit Profile', message: 'Profile editing coming soon.' });
  };

  const handleSettingsItem = (label) => {
    showModal({ icon: '⚙️', title: label, message: `${label} settings coming soon.` });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarGlow} />
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.[0] || user?.phone?.[3] || '?'}
              </Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile} activeOpacity={0.7}>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userPhone}>{user?.phone ? `+${user.phone}` : ''}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statValue}>4.92</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🏍</Text>
            <Text style={styles.statLabel}>Total Rides</Text>
            <Text style={styles.statValue}>128</Text>
          </View>
        </View>

        {SETTINGS_GROUPS.map((group) => (
          <View key={group.title} style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.settingsItem, idx < group.items.length - 1 && styles.settingsItemBorder]}
                  onPress={() => handleSettingsItem(item.label)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.itemIcon, item.iconColor && { color: item.iconColor }]}>{item.icon}</Text>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    {item.sub && <Text style={styles.itemSub}>{item.sub}</Text>}
                  </View>
                  {item.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => showModal({ icon: '🔒', title: 'Privacy Policy', message: 'Privacy policy coming soon.' })}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => showModal({ icon: '📋', title: 'Terms of Service', message: 'Terms of service coming soon.' })}>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.version}>Version 2.4.1 (Gulu-Stable)</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  avatarGlow: {
    position: 'absolute',
    inset: -8,
    borderRadius: 72,
    backgroundColor: colors.primaryContainer,
    opacity: 0.2,
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.surfaceContainerHighest,
  },
  avatarText: {
    ...typography.displayLg,
    color: colors.primary,
    fontSize: 48,
  },
  editBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  editIcon: {
    fontSize: 16,
  },
  userName: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  userPhone: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: 4,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  statValue: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  settingsGroup: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  groupTitle: {
    ...typography.labelLg,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    paddingLeft: 8,
  },
  groupCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  settingsItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  itemIcon: {
    fontSize: 22,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  itemSub: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.onPrimaryContainer,
  },
  chevron: {
    fontSize: 24,
    color: colors.outline,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.xl,
    marginBottom: spacing.xl,
  },
  logoutIcon: {
    fontSize: 20,
  },
  logoutText: {
    ...typography.titleMd,
    color: colors.error,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  footerLink: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
  version: {
    ...typography.labelSm,
    color: colors.outline,
  },
});
