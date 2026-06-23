import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useModal } from '../components/useModal';
import { profileAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';

const METHODS = [
  { key: 'mtn', label: 'MTN Mobile Money', icon: '📱', color: '#FFCC00' },
  { key: 'airtel', label: 'Airtel Money', icon: '📱', color: '#ED1C24' },
  { key: 'cash', label: 'Cash Payment', icon: '💵', color: '#4CAF50' },
];

export default function PaymentMethodsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { showModal, ModalComponent } = useModal();
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedType, setSelectedType] = useState('mtn');
  const [phoneNumber, setPhoneNumber] = useState('256');

  const fetchMethods = async () => {
    try {
      const { data } = await profileAPI.getPaymentMethods();
      setMethods(data.methods);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchMethods(); }, []));

  const handleAdd = async () => {
    if (phoneNumber.length < 12) {
      showModal({ icon: '⚠️', title: 'Invalid Number', message: 'Enter a valid Ugandan number (256XXXXXXXXX)' });
      return;
    }
    setAdding(true);
    try {
      const { data } = await profileAPI.addPaymentMethod({ type: selectedType, phone_number: phoneNumber });
      setMethods(prev => [data.method, ...prev]);
      setPhoneNumber('256');
      showModal({ icon: '✅', title: 'Added', message: `${METHODS.find(m => m.key === selectedType).label} added successfully.` });
    } catch (err) {
      showModal({ icon: '❌', title: 'Error', message: err.response?.data?.error || 'Failed to add method' });
    } finally {
      setAdding(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await profileAPI.setDefaultPayment(id);
      setMethods(prev => prev.map(m => ({ ...m, is_default: m.id === id })));
    } catch (err) {
      showModal({ icon: '❌', title: 'Error', message: 'Failed to set default' });
    }
  };

  const handleDelete = (id) => {
    showModal({
      icon: '🗑',
      title: 'Remove Method',
      message: 'Are you sure you want to remove this payment method?',
      actions: [
        { label: 'Cancel' },
        {
          label: 'Remove', primary: true, onPress: async () => {
            try {
              await profileAPI.deletePaymentMethod(id);
              setMethods(prev => prev.filter(m => m.id !== id));
            } catch (err) {
              showModal({ icon: '❌', title: 'Error', message: 'Failed to remove' });
            }
          }
        },
      ],
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={false} onRefresh={fetchMethods} tintColor={colors.primary} />}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Payment Method</Text>
          <View style={styles.typeRow}>
            {METHODS.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.typeChip, selectedType === m.key && styles.typeChipActive]}
                onPress={() => setSelectedType(m.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.typeIcon}>{m.icon}</Text>
                <Text style={[styles.typeLabel, selectedType === m.key && styles.typeLabelActive]}>{m.label.replace(' Payment', '')}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedType !== 'cash' && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="256XXXXXXXXX"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="phone-pad"
                maxLength={12}
              />
              <TouchableOpacity
                style={[styles.addBtn, adding && { opacity: 0.6 }]}
                onPress={handleAdd}
                disabled={adding}
                activeOpacity={0.7}
              >
                {adding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Methods</Text>
          {methods.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyText}>No payment methods yet</Text>
              <Text style={styles.emptySub}>Add a MoMo number above to get started</Text>
            </View>
          ) : (
            methods.map(m => {
              const typeInfo = METHODS.find(mt => mt.key === m.type);
              return (
                <View key={m.id} style={styles.methodCard}>
                  <View style={styles.methodLeft}>
                    <Text style={styles.methodIcon}>{typeInfo?.icon}</Text>
                    <View>
                      <Text style={styles.methodType}>{typeInfo?.label}</Text>
                      <Text style={styles.methodPhone}>{m.phone_number}</Text>
                    </View>
                  </View>
                  <View style={styles.methodRight}>
                    {m.is_default ? (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => handleSetDefault(m.id)} activeOpacity={0.7}>
                        <Text style={styles.setDefaultText}>Set Default</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleDelete(m.id)} style={styles.deleteBtn} activeOpacity={0.7}>
                      <Text style={styles.deleteIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: colors.onSurface, lineHeight: 30 },
  headerTitle: { ...typography.headlineMd, color: colors.onSurface },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { ...typography.labelLg, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  typeChip: { flex: 1, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.outlineVariant, alignItems: 'center', backgroundColor: colors.surfaceContainerLowest },
  typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryContainer },
  typeIcon: { fontSize: 20, marginBottom: 4 },
  typeLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  typeLabelActive: { color: colors.onPrimaryContainer, fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: spacing.md },
  input: { flex: 1, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.onSurface },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { ...typography.titleMd, color: '#fff', fontWeight: '700' },
  methodCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.md },
  methodLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  methodIcon: { fontSize: 28 },
  methodType: { ...typography.titleMd, color: colors.onSurface },
  methodPhone: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  methodRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  defaultBadge: { backgroundColor: colors.primaryContainer, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  defaultText: { ...typography.labelSm, color: colors.onPrimaryContainer, fontWeight: '700' },
  setDefaultText: { ...typography.labelSm, color: colors.primary, fontWeight: '600' },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.errorContainer, alignItems: 'center', justifyContent: 'center' },
  deleteIcon: { fontSize: 14, color: colors.error, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.titleMd, color: colors.onSurface },
  emptySub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4 },
});
