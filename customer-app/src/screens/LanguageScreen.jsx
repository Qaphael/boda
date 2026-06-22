import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useModal } from '../components/useModal';
import { profileAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';

const LANGUAGES = [
  { key: 'en', label: 'English', native: 'English' },
  { key: 'lg', label: 'Luganda', native: 'Luganda' },
  { key: 'ach', label: 'Acholi', native: 'Acholi' },
  { key: 'sw', label: 'Swahili', native: 'Kiswahili' },
];

export default function LanguageScreen({ navigation }) {
  const { showModal, ModalComponent } = useModal();
  const [selected, setSelected] = useState('en');
  const [refreshing, setRefreshing] = useState(false);

  const fetchSettings = async () => {
    try {
      const { data } = await profileAPI.getSettings();
      if (data.settings.language) setSelected(data.settings.language);
    } catch (err) { console.error(err); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSelect = async (key) => {
    setSelected(key);
    try {
      await profileAPI.updateSettings({ language: key });
      showModal({ icon: '✅', title: 'Language Updated', message: `App language set to ${LANGUAGES.find(l => l.key === key).label}.` });
    } catch (err) {
      showModal({ icon: '❌', title: 'Error', message: 'Failed to update language' });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Language</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSettings(); }} tintColor={colors.primary} />}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Language</Text>
          <View style={styles.card}>
            {LANGUAGES.map((lang, idx) => (
              <TouchableOpacity
                key={lang.key}
                style={[styles.langRow, idx < LANGUAGES.length - 1 && styles.langRowBorder]}
                onPress={() => handleSelect(lang.key)}
                activeOpacity={0.7}
              >
                <View style={styles.langInfo}>
                  <Text style={styles.langLabel}>{lang.label}</Text>
                  <Text style={styles.langNative}>{lang.native}</Text>
                </View>
                {selected === lang.key ? (
                  <View style={styles.checkCircle}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                ) : (
                  <View style={styles.radio} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Boda supports English, Luganda, Acholi, and Swahili. Language preference is saved to your profile.</Text>
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
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  langRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  langInfo: { flex: 1 },
  langLabel: { ...typography.titleMd, color: colors.onSurface },
  langNative: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 16, fontWeight: '700' },
  radio: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.outlineVariant },
  infoBox: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant },
  infoText: { ...typography.bodySm, color: colors.onSurfaceVariant, lineHeight: 18 },
});
