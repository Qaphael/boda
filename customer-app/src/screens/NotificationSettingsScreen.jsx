import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, RefreshControl } from 'react-native';
import { useModal } from '../components/useModal';
import { profileAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';

export default function NotificationSettingsScreen({ navigation }) {
  const { showModal, ModalComponent } = useModal();
  const [settings, setSettings] = useState({
    push_enabled: 'true',
    sms_enabled: 'true',
    email_enabled: 'false',
    ride_updates: 'true',
    promotions: 'true',
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchSettings = async () => {
    try {
      const { data } = await profileAPI.getSettings();
      setSettings(prev => ({ ...prev, ...data.settings }));
    } catch (err) { console.error(err); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const toggleSetting = async (key) => {
    const newValue = settings[key] === 'true' ? 'false' : 'true';
    setSettings(prev => ({ ...prev, [key]: newValue }));
    try {
      await profileAPI.updateSettings({ [key]: newValue });
    } catch (err) {
      setSettings(prev => ({ ...prev, [key]: newValue === 'true' ? 'false' : 'true' }));
      showModal({ icon: '❌', title: 'Error', message: 'Failed to update setting' });
    }
  };

  const ToggleRow = ({ label, sub, settingKey }) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleContent}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {sub && <Text style={styles.toggleSub}>{sub}</Text>}
      </View>
      <Switch
        value={settings[settingKey] === 'true'}
        onValueChange={() => toggleSetting(settingKey)}
        trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
        thumbColor={settings[settingKey] === 'true' ? colors.primary : colors.outline}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSettings(); }} tintColor={colors.primary} />}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Channels</Text>
          <View style={styles.card}>
            <ToggleRow label="Push Notifications" sub="Receive alerts on your phone" settingKey="push_enabled" />
            <View style={styles.divider} />
            <ToggleRow label="SMS Notifications" sub="Get text message updates" settingKey="sms_enabled" />
            <View style={styles.divider} />
            <ToggleRow label="Email Notifications" sub="Receive updates via email" settingKey="email_enabled" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.card}>
            <ToggleRow label="Ride Updates" sub="Booking status, rider arrival, trip complete" settingKey="ride_updates" />
            <View style={styles.divider} />
            <ToggleRow label="Promotions & Offers" sub="Discounts, referral rewards, new features" settingKey="promotions" />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>You can always change these settings later. Important safety alerts will be sent regardless of your preferences.</Text>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: colors.onSurface, lineHeight: 30 },
  headerTitle: { ...typography.headlineMd, color: colors.onSurface },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { ...typography.labelLg, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  toggleContent: { flex: 1, marginRight: spacing.md },
  toggleLabel: { ...typography.titleMd, color: colors.onSurface },
  toggleSub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.outlineVariant, marginLeft: spacing.lg },
  infoBox: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant },
  infoText: { ...typography.bodySm, color: colors.onSurfaceVariant, lineHeight: 18 },
});
