import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { ticketAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

const CATEGORIES = [
  { icon: '🚗', label: 'Trip Issues', value: 'trip_issue' },
  { icon: '💰', label: 'Payment', value: 'payment' },
  { icon: '👤', label: 'Account', value: 'account' },
  { icon: '🛡', label: 'Safety', value: 'safety' },
  { icon: '🎁', label: 'Rewards', value: 'rewards' },
  { icon: '📌', label: 'Other', value: 'general' },
];

export default function SupportScreen({ navigation }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const { showModal, ModalComponent } = useModal();

  useEffect(() => { loadTickets(); }, []);

  const loadTickets = async () => {
    try {
      const { data } = await ticketAPI.getTickets();
      setTickets(data.tickets || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newDesc.trim()) {
      showModal({ icon: '⚠️', title: 'Missing Info', message: 'Subject and description are required.' });
      return;
    }
    setCreating(true);
    try {
      await ticketAPI.createTicket({ subject: newSubject.trim(), description: newDesc.trim(), category: newCategory });
      setNewSubject(''); setNewDesc(''); setNewCategory('general');
      showModal({ icon: '✅', title: 'Ticket Created', message: 'Your support ticket has been submitted.' });
      loadTickets();
    } catch (err) {
      showModal({ icon: '❌', title: 'Error', message: 'Failed to create ticket.' });
    } finally { setCreating(false); }
  };

  const statusColor = (s) => {
    if (s === 'open') return '#22c55e';
    if (s === 'in_progress') return '#f59e0b';
    return colors.onSurfaceVariant;
  };

  const FAQS = [
    { q: 'How do I earn more?', a: 'Stay online during peak hours, maintain a high rating, and complete quests in the Rewards tab.' },
    { q: 'When do I get paid?', a: 'Earnings are disbursed via MoMo after each trip completion. Weekly payouts are on Monday.' },
    { q: 'How to report a problem?', a: 'Use the "Create Ticket" form below. Select the right category for faster resolution.' },
    { q: 'Why was I flagged?', a: 'Flagging happens after cancellations or low ratings. Contact support for details.' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <TouchableOpacity style={styles.sosBtn} onPress={() => showModal({ icon: '🚨', title: 'Emergency', message: 'Emergency services: Call 112 or 999' })} activeOpacity={0.8}>
            <Text style={styles.sosIcon}>🚨</Text>
            <Text style={styles.sosText}>Emergency Assistance</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Quick Help</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.value} style={[styles.categoryCard, newCategory === cat.value && styles.categoryCardActive]}
              onPress={() => setNewCategory(cat.value)} activeOpacity={0.7}>
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Create Ticket</Text>
        <View style={styles.formCard}>
          <TextInput style={styles.input} value={newSubject} onChangeText={setNewSubject} placeholder="Subject" placeholderTextColor={colors.outline} />
          <TextInput style={[styles.input, styles.textArea]} value={newDesc} onChangeText={setNewDesc} placeholder="Describe your issue..." placeholderTextColor={colors.outline} multiline numberOfLines={4} textAlignVertical="top" />
          <TouchableOpacity style={[styles.createBtn, creating && { opacity: 0.5 }]} onPress={handleCreateTicket} disabled={creating} activeOpacity={0.8}>
            {creating ? <ActivityIndicator color={colors.onPrimaryContainer} /> : <Text style={styles.createBtnText}>Submit Ticket</Text>}
          </TouchableOpacity>
        </View>

        {tickets.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>My Tickets</Text>
            {tickets.map((ticket) => (
              <View key={ticket.id} style={styles.ticketItem}>
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketTitle}>{ticket.subject}</Text>
                  <Text style={styles.ticketMeta}>{ticket.category} • {new Date(ticket.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.ticketBadge, { backgroundColor: `${statusColor(ticket.status)}1a` }]}>
                  <Text style={[styles.ticketBadgeText, { color: statusColor(ticket.status) }]}>{ticket.status}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>FAQ</Text>
        {FAQS.map((faq, i) => (
          <TouchableOpacity key={i} style={styles.faqItem} onPress={() => setExpandedFaq(expandedFaq === i ? null : i)} activeOpacity={0.7}>
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{faq.q}</Text>
              <Text style={styles.faqChevron}>{expandedFaq === i ? '−' : '+'}</Text>
            </View>
            {expandedFaq === i && <Text style={styles.faqAnswer}>{faq.a}</Text>}
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 56 },
  heroCard: { marginHorizontal: spacing.lg, backgroundColor: colors.primaryContainer, borderRadius: 24, padding: spacing.xl, marginBottom: spacing.xl },
  heroTitle: { ...typography.headlineMd, color: colors.onPrimaryContainer, marginBottom: spacing.md },
  sosBtn: { backgroundColor: colors.errorContainer, borderRadius: radius.xl, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sosIcon: { fontSize: 20 },
  sosText: { ...typography.titleMd, color: colors.error },
  sectionTitle: { ...typography.titleMd, color: colors.onSurface, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.xl },
  categoryCard: { width: '30%', backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.outlineVariant },
  categoryCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryContainer },
  categoryIcon: { fontSize: 24, marginBottom: spacing.sm },
  categoryLabel: { ...typography.labelSm, color: colors.onSurface, textAlign: 'center' },
  formCard: { marginHorizontal: spacing.lg, marginBottom: spacing.xl },
  input: { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: spacing.lg, height: 52, ...typography.bodyMd, color: colors.onSurface, marginBottom: spacing.sm },
  textArea: { height: 100, paddingTop: spacing.md },
  createBtn: { backgroundColor: colors.primaryContainer, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { ...typography.titleMd, color: colors.onPrimaryContainer },
  ticketItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainer },
  ticketInfo: { flex: 1 },
  ticketTitle: { ...typography.labelLg, color: colors.onSurface, fontWeight: '600' },
  ticketMeta: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  ticketBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  ticketBadgeText: { ...typography.labelSm, fontWeight: '600' },
  faqItem: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.sm },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { ...typography.labelLg, color: colors.onSurface, flex: 1, fontWeight: '600' },
  faqChevron: { fontSize: 20, color: colors.primary, marginLeft: 8 },
  faqAnswer: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.md, lineHeight: 22 },
});
