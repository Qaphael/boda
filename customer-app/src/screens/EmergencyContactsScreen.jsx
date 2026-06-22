import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useModal } from '../components/useModal';
import { profileAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';

const RELATIONSHIPS = ['Family', 'Friend', 'Partner', 'Colleague', 'Other'];

export default function EmergencyContactsScreen({ navigation }) {
  const { showModal, ModalComponent } = useModal();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('256');
  const [relationship, setRelationship] = useState('Family');

  const fetchContacts = async () => {
    try {
      const { data } = await profileAPI.getEmergencyContacts();
      setContacts(data.contacts);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchContacts(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) {
      showModal({ icon: '⚠️', title: 'Missing Info', message: 'Name is required.' });
      return;
    }
    const cleanPhone = phone.replace(/\s/g, '');
    if (!/^256\d{9}$/.test(cleanPhone)) {
      showModal({ icon: '⚠️', title: 'Invalid Phone', message: 'Enter a valid Ugandan number: 256XXXXXXXXX (12 digits).' });
      return;
    }
    setAdding(true);
    try {
      const { data } = await profileAPI.addEmergencyContact({ name: name.trim(), phone: cleanPhone, relationship });
      setContacts(prev => [...prev, data.contact]);
      setName(''); setPhone('256');
      showModal({ icon: '✅', title: 'Added', message: `${name} added as emergency contact.` });
    } catch (err) {
      showModal({ icon: '❌', title: 'Error', message: err.response?.data?.error || 'Failed to add' });
    } finally { setAdding(false); }
  };

  const handleDelete = (id, contactName) => {
    showModal({
      icon: '🗑',
      title: 'Remove Contact',
      message: `Remove ${contactName} from emergency contacts?`,
      actions: [
        { label: 'Cancel' },
        { label: 'Remove', primary: true, onPress: async () => {
          try {
            await profileAPI.deleteEmergencyContact(id);
            setContacts(prev => prev.filter(c => c.id !== id));
          } catch (err) { showModal({ icon: '❌', title: 'Error', message: 'Failed to remove' }); }
        }},
      ],
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={false} onRefresh={fetchContacts} tintColor={colors.primary} />}>
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>These contacts will be notified during your trips. You can share your live location with them when riding.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Contact ({contacts.length}/3)</Text>
          {contacts.length < 3 && (
            <>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Contact name" placeholderTextColor={colors.onSurfaceVariant} />
              <TextInput style={[styles.input, { marginTop: spacing.sm }]} value={phone} onChangeText={setPhone} placeholder="256XXXXXXXXX" placeholderTextColor={colors.onSurfaceVariant} keyboardType="phone-pad" maxLength={12} />
              <View style={styles.relRow}>
                {RELATIONSHIPS.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.relChip, relationship === r && styles.relChipActive]}
                    onPress={() => setRelationship(r)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.relText, relationship === r && styles.relTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.addBtn, adding && { opacity: 0.6 }]}
                onPress={handleAdd}
                disabled={adding}
                activeOpacity={0.7}
              >
                {adding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addBtnText}>Add Contact</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Contacts</Text>
          {contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🚨</Text>
              <Text style={styles.emptyText}>No emergency contacts</Text>
              <Text style={styles.emptySub}>Add someone you trust to be notified during your rides</Text>
            </View>
          ) : contacts.map(c => (
            <View key={c.id} style={styles.contactCard}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactInitial}>{c.name[0].toUpperCase()}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactPhone}>{c.phone}</Text>
                {c.relationship && <Text style={styles.contactRel}>{c.relationship}</Text>}
              </View>
              <TouchableOpacity onPress={() => handleDelete(c.id, c.name)} style={styles.deleteBtn} activeOpacity={0.7}>
                <Text style={styles.deleteIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
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
  infoBox: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.xl, backgroundColor: colors.primaryContainer, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  infoIcon: { fontSize: 18 },
  infoText: { ...typography.bodySm, color: colors.onPrimaryContainer, flex: 1, lineHeight: 18 },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { ...typography.labelLg, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  input: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.onSurface },
  relRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  relChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest },
  relChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryContainer },
  relText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  relTextActive: { color: colors.onPrimaryContainer, fontWeight: '600' },
  addBtn: { marginTop: spacing.md, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center' },
  addBtnText: { ...typography.titleMd, color: '#fff', fontWeight: '700' },
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.md, gap: spacing.md },
  contactAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.errorContainer, alignItems: 'center', justifyContent: 'center' },
  contactInitial: { ...typography.headlineMd, color: colors.error },
  contactInfo: { flex: 1 },
  contactName: { ...typography.titleMd, color: colors.onSurface },
  contactPhone: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  contactRel: { ...typography.labelSm, color: colors.primary, marginTop: 2 },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.errorContainer, alignItems: 'center', justifyContent: 'center' },
  deleteIcon: { fontSize: 14, color: colors.error, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.titleMd, color: colors.onSurface },
  emptySub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' },
});
