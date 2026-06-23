import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { riderAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

const CHECKLIST = [
  { id: 'brakes', label: 'Brakes working', icon: '🔴' },
  { id: 'lights', label: 'Headlights & indicators', icon: '💡' },
  { id: 'tires', label: 'Tires properly inflated', icon: '🛞' },
  { id: 'mirror', label: 'Mirrors intact', icon: '🪞' },
  { id: 'helmet', label: 'Helmet available', icon: '⛑️' },
  { id: 'license', label: 'License visible', icon: '📋' },
];

export default function VehicleSafetyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { rider } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState({});
  const { showModal, ModalComponent } = useModal();

  useFocusEffect(useCallback(() => { loadVehicle(); }, []));

  const loadVehicle = async () => {
    try {
      if (rider?.riderId) {
        const { data } = await riderAPI.getVehicle(rider.riderId);
        setVehicle(data.vehicle);
      } else if (rider) {
        setVehicle({
          name: rider.name, plate_number: rider.plate_number || 'N/A',
          status: rider.status, avg_rating: rider.avg_rating,
          total_trips: 0, total_cancellations: 0,
        });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleCheck = (id) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const allChecked = CHECKLIST.every(c => checked[c.id]);
  const completedCount = CHECKLIST.filter(c => checked[c.id]).length;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Vehicle & Safety</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleHeader}>
            <Text style={styles.vehicleIcon}>🏍</Text>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>{vehicle?.name || 'Rider'}</Text>
              <Text style={styles.vehiclePlate}>{vehicle?.plate_number || 'N/A'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: vehicle?.status === 'verified' ? '#22c55e1a' : '#f59e0b1a' }]}>
              <Text style={[styles.statusText, { color: vehicle?.status === 'verified' ? '#22c55e' : '#f59e0b' }]}>{vehicle?.status || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.vehicleStats}>
            <View style={styles.vehicleStat}>
              <Text style={styles.vehicleStatValue}>⭐ {vehicle?.avg_rating || '--'}</Text>
              <Text style={styles.vehicleStatLabel}>Rating</Text>
            </View>
            <View style={styles.vehicleStatDivider} />
            <View style={styles.vehicleStat}>
              <Text style={styles.vehicleStatValue}>{vehicle?.total_trips || 0}</Text>
              <Text style={styles.vehicleStatLabel}>Trips</Text>
            </View>
            <View style={styles.vehicleStatDivider} />
            <View style={styles.vehicleStat}>
              <Text style={styles.vehicleStatValue}>{vehicle?.total_cancellations || 0}</Text>
              <Text style={styles.vehicleStatLabel}>Cancellations</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Safety Check</Text>
            <Text style={styles.sectionProgress}>{completedCount}/{CHECKLIST.length}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(completedCount / CHECKLIST.length) * 100}%` }]} />
          </View>
          {CHECKLIST.map((item) => (
            <TouchableOpacity key={item.id} style={styles.checkItem} onPress={() => toggleCheck(item.id)} activeOpacity={0.7}>
              <Text style={styles.checkIcon}>{item.icon}</Text>
              <Text style={styles.checkLabel}>{item.label}</Text>
              <Switch value={!!checked[item.id]} onValueChange={() => toggleCheck(item.id)}
                trackColor={{ false: colors.surfaceContainerHigh, true: colors.primaryContainer }}
                thumbColor={checked[item.id] ? colors.primary : colors.surfaceContainerHighest} />
            </TouchableOpacity>
          ))}
        </View>

        {allChecked && (
          <View style={styles.readyCard}>
            <Text style={styles.readyIcon}>✅</Text>
            <Text style={styles.readyText}>Safety check complete! You're ready to ride.</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: colors.onSurface },
  topTitle: { ...typography.titleLg, color: colors.onSurface, fontWeight: '700' },
  vehicleCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLow, borderRadius: 24, padding: spacing.xl, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.xl },
  vehicleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  vehicleIcon: { fontSize: 40, marginRight: spacing.md },
  vehicleInfo: { flex: 1 },
  vehicleName: { ...typography.titleLg, color: colors.onSurface },
  vehiclePlate: { ...typography.bodyMd, color: colors.onSurfaceVariant, textTransform: 'uppercase', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  statusText: { ...typography.labelSm, fontWeight: '700', textTransform: 'capitalize' },
  vehicleStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.md },
  vehicleStat: { flex: 1, alignItems: 'center' },
  vehicleStatValue: { ...typography.titleMd, color: colors.onSurface, fontWeight: '700' },
  vehicleStatLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  vehicleStatDivider: { width: 1, height: 30, backgroundColor: colors.outlineVariant },
  section: { marginHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.titleMd, color: colors.onSurface },
  sectionProgress: { ...typography.labelLg, color: colors.primary, fontWeight: '700' },
  progressBar: { height: 4, backgroundColor: colors.surfaceContainerHigh, borderRadius: 2, marginBottom: spacing.lg },
  progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  checkItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.outlineVariant },
  checkIcon: { fontSize: 20, marginRight: spacing.md },
  checkLabel: { flex: 1, ...typography.titleMd, color: colors.onSurface },
  readyCard: { marginHorizontal: spacing.lg, backgroundColor: '#22c55e1a', borderRadius: radius.xl, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  readyIcon: { fontSize: 24 },
  readyText: { ...typography.bodyMd, color: '#22c55e', fontWeight: '600', flex: 1 },
});
