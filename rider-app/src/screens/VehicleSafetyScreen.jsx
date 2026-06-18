import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

const CHECKLIST = [
  { id: 'brakes', label: 'Brake Pressure', desc: 'Check front and rear levers' },
  { id: 'tires', label: 'Tire Condition', desc: 'Check for punctures and tread' },
  { id: 'lights', label: 'Lights & Indicators', desc: 'Headlight and signal check' },
  { id: 'helmet', label: 'Helmet Check', desc: 'Straps secure for rider & passenger' },
];

export default function VehicleSafetyScreen() {
  const [checked, setChecked] = useState({});
  const { showModal, ModalComponent } = useModal();

  const toggleCheck = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allChecked = CHECKLIST.every((item) => checked[item.id]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.vehicleHero}>
          <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active Vehicle</Text></View>
          <Text style={styles.vehicleName}>Bajaj Boxer</Text>
          <Text style={styles.vehiclePlate}>UER 452T</Text>
          <Text style={styles.vehicleStatus}>Status: Ready</Text>
          <Text style={styles.vehicleIcon}>🏍</Text>
        </View>

        <View style={styles.docGrid}>
          <TouchableOpacity style={styles.docCard} onPress={() => showModal({ icon: '🛡', title: 'Insurance', message: 'Insurance is active, expires in 45 days.' })} activeOpacity={0.7}>
            <View style={styles.docHeader}>
              <Text style={styles.docIcon}>🛡</Text>
              <View style={styles.docStatusDot} />
            </View>
            <Text style={styles.docLabel}>Insurance</Text>
            <Text style={styles.docSubtext}>Expires in 45 days</Text>
            <Text style={styles.docStatus}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.docCard} onPress={() => showModal({ icon: '📋', title: 'Permit', message: 'Permit is valid, Class A verified.' })} activeOpacity={0.7}>
            <View style={styles.docHeader}>
              <Text style={styles.docIcon}>📋</Text>
              <View style={[styles.docStatusDot, { backgroundColor: '#22c55e' }]} />
            </View>
            <Text style={styles.docLabel}>Permit</Text>
            <Text style={styles.docSubtext}>Valid Class A</Text>
            <Text style={styles.docStatus}>Verified</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Daily Safety Checklist</Text>
        <View style={styles.checklistCard}>
          {CHECKLIST.map((item, idx) => (
            <TouchableOpacity key={item.id} style={[styles.checkItem, idx < CHECKLIST.length - 1 && styles.checkItemBorder]} onPress={() => toggleCheck(item.id)} activeOpacity={0.7}>
              <View style={[styles.checkbox, checked[item.id] && styles.checkboxChecked]}>
                {checked[item.id] && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.checkInfo}>
                <Text style={styles.checkLabel}>{item.label}</Text>
                <Text style={styles.checkDesc}>{item.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, !allChecked && styles.submitBtnDisabled]}
          onPress={() => showModal({ icon: '✅', title: 'Checklist Submitted', message: 'Safety checklist completed for today.' })}
          disabled={!allChecked}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>Submit Checklist</Text>
        </TouchableOpacity>

        <View style={styles.actionsList}>
          <TouchableOpacity style={styles.actionItem} onPress={() => showModal({ icon: '🔧', title: 'Maintenance', message: 'Maintenance logs coming soon.' })} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>🔧</Text>
            <Text style={styles.actionLabel}>Maintenance Logs</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => showModal({ icon: '🚨', title: 'Incident', message: 'Incident reporting coming soon.' })} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>🚨</Text>
            <Text style={styles.actionLabel}>Report Incident</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
  vehicleHero: { marginHorizontal: spacing.lg, backgroundColor: colors.inverseSurface, borderRadius: 24, padding: spacing.xl, marginBottom: spacing.xl, position: 'relative', overflow: 'hidden' },
  activeBadge: { backgroundColor: '#22c55e33', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full, marginBottom: spacing.md },
  activeBadgeText: { ...typography.labelSm, color: '#22c55e', fontWeight: '700' },
  vehicleName: { ...typography.headlineMd, color: colors.surfaceBright },
  vehiclePlate: { ...typography.titleMd, color: colors.primaryContainer, marginTop: 4 },
  vehicleStatus: { ...typography.labelLg, color: colors.secondaryFixedDim, marginTop: 4 },
  vehicleIcon: { position: 'absolute', right: 16, bottom: 16, fontSize: 48, opacity: 0.3 },
  docGrid: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  docCard: { flex: 1, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant },
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  docIcon: { fontSize: 24 },
  docStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  docLabel: { ...typography.titleMd, color: colors.onSurface },
  docSubtext: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  docStatus: { ...typography.labelSm, color: '#22c55e', fontWeight: '600', marginTop: 4 },
  sectionTitle: { ...typography.titleMd, color: colors.onSurface, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  checklistCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden', marginBottom: spacing.lg },
  checkItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  checkItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  checkbox: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
  checkmark: { fontSize: 14, color: colors.onPrimaryContainer, fontWeight: '700' },
  checkInfo: { flex: 1 },
  checkLabel: { ...typography.titleMd, color: colors.onSurface },
  checkDesc: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  submitBtn: { marginHorizontal: spacing.lg, backgroundColor: colors.primaryContainer, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { ...typography.titleMd, color: colors.onPrimaryContainer },
  actionsList: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden' },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  actionIcon: { fontSize: 20 },
  actionLabel: { ...typography.titleMd, color: colors.onSurface, flex: 1 },
  actionChevron: { fontSize: 24, color: colors.outline },
});
