import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

const CATEGORIES = [
  { icon: '🚗', label: 'Trip Issues' },
  { icon: '💰', label: 'Payment Queries' },
  { icon: '👤', label: 'Account Help' },
  { icon: '🛡', label: 'Safety Hub' },
  { icon: '🎁', label: 'Rewards' },
  { icon: '📌', label: 'Other' },
];

const TICKETS = [
  { id: '#9821', title: 'Fare Adjustment', status: 'Active', time: '2 hours ago' },
  { id: '#8742', title: 'Document Update', status: 'Resolved', time: 'Yesterday' },
];

const FAQS = [
  { q: 'How do I withdraw my MoMo balance?', a: 'Go to Earnings > Withdraw to MoMo. Minimum withdrawal is UGX 5,000.' },
  { q: 'What to do if a passenger cancels?', a: 'Tap "Report Issue" in the trip details. Cancellation fees may apply.' },
];

export default function SupportScreen() {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const { showModal, ModalComponent } = useModal();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="Search for help topics..." placeholderTextColor={colors.outline} />
          </View>
          <Text style={styles.heroSubtext}>Available 24/7</Text>
        </View>

        <TouchableOpacity style={styles.sosBtn} onPress={() => showModal({ icon: '🚨', title: 'Emergency', message: 'Emergency services: Call 112 or 999' })} activeOpacity={0.8}>
          <Text style={styles.sosIcon}>🚨</Text>
          <Text style={styles.sosText}>Emergency Assistance (SOS)</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Quick Help</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.label} style={styles.categoryCard} onPress={() => showModal({ icon: cat.icon, title: cat.label, message: `${cat.label} help section coming soon.` })} activeOpacity={0.7}>
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Tickets</Text>
        {TICKETS.map((ticket) => (
          <View key={ticket.id} style={styles.ticketItem}>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketTitle}>{ticket.title} {ticket.id}</Text>
              <Text style={styles.ticketTime}>{ticket.time}</Text>
            </View>
            <View style={[styles.ticketBadge, ticket.status === 'Active' ? styles.ticketBadgeActive : styles.ticketBadgeResolved]}>
              <Text style={[styles.ticketBadgeText, ticket.status === 'Active' ? styles.ticketBadgeTextActive : styles.ticketBadgeTextResolved]}>{ticket.status}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Popular Questions</Text>
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

      <TouchableOpacity style={styles.chatFab} onPress={() => showModal({ icon: '💬', title: 'Chat', message: 'Live chat coming soon.' })} activeOpacity={0.8}>
        <Text style={styles.chatFabIcon}>💬</Text>
      </TouchableOpacity>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
  heroCard: { marginHorizontal: spacing.lg, backgroundColor: colors.primaryContainer, borderRadius: 24, padding: spacing.xl, marginBottom: spacing.lg },
  heroTitle: { ...typography.headlineMd, color: colors.onPrimaryContainer, marginBottom: spacing.md },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.surfaceContainerLowest}cc`, borderRadius: radius.xl, paddingHorizontal: spacing.lg, height: 48, gap: 8 },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, ...typography.bodyMd, color: colors.onSurface },
  heroSubtext: { ...typography.labelSm, color: colors.onPrimaryContainer, opacity: 0.7, marginTop: spacing.sm },
  sosBtn: { marginHorizontal: spacing.lg, backgroundColor: colors.errorContainer, borderRadius: radius.xl, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  sosIcon: { fontSize: 24 },
  sosText: { ...typography.titleMd, color: colors.error, flex: 1 },
  sectionTitle: { ...typography.titleMd, color: colors.onSurface, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.xl },
  categoryCard: { width: '30%', backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.outlineVariant, minHeight: 80, justifyContent: 'center' },
  categoryIcon: { fontSize: 24, marginBottom: spacing.sm },
  categoryLabel: { ...typography.labelSm, color: colors.onSurface, textAlign: 'center' },
  ticketItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainer },
  ticketInfo: { flex: 1 },
  ticketTitle: { ...typography.labelLg, color: colors.onSurface, fontWeight: '600' },
  ticketTime: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  ticketBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  ticketBadgeActive: { backgroundColor: colors.primaryContainer },
  ticketBadgeResolved: { backgroundColor: colors.surfaceContainerHigh },
  ticketBadgeText: { ...typography.labelSm, fontWeight: '600' },
  ticketBadgeTextActive: { color: colors.onPrimaryContainer },
  ticketBadgeTextResolved: { color: colors.onSurfaceVariant },
  faqItem: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.sm },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { ...typography.labelLg, color: colors.onSurface, flex: 1, fontWeight: '600' },
  faqChevron: { fontSize: 20, color: colors.primary, marginLeft: 8 },
  faqAnswer: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.md, lineHeight: 22 },
  chatFab: { position: 'absolute', bottom: 32, right: spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.tertiary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  chatFabIcon: { fontSize: 24 },
});
