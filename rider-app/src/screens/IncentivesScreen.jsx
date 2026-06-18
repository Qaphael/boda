import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

export default function IncentivesScreen() {
  const { showModal, ModalComponent } = useModal();
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.tierCard}>
          <Text style={styles.tierLabel}>Current Status</Text>
          <Text style={styles.tierName}>⭐ Gold Tier</Text>
          <Text style={styles.tierRating}>Rating: 4.95</Text>
          <Text style={styles.tierRank}>Top 5% of Gulu riders</Text>
          <View style={styles.tierBadges}>
            <View style={styles.tierBadge}><Text style={styles.tierBadgeText}>Lower Service Fees</Text></View>
            <View style={styles.tierBadge}><Text style={styles.tierBadgeText}>Priority Support</Text></View>
          </View>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Today's Progress</Text>
          <Text style={styles.progressTarget}>Target: UGX 5,000 Bonus</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '50%' }]} />
          </View>
          <Text style={styles.progressText}>5 / 10 Trips Completed</Text>
          <Text style={styles.progressTip}>Complete 5 more trips before midnight to unlock your daily bonus!</Text>
        </View>

        <Text style={styles.sectionTitle}>Active Quests</Text>
        <View style={styles.questCard}>
          <View style={styles.questHeader}>
            <Text style={styles.questName}>Weekend Warrior</Text>
            <View style={styles.questRewardBadge}><Text style={styles.questRewardText}>UGX 15,000</Text></View>
          </View>
          <Text style={styles.questDesc}>Friday 6 PM - Sunday Midnight • 20 trips target</Text>
          <TouchableOpacity style={styles.questBtn} onPress={() => showModal({ icon: '🎯', title: 'Quest', message: 'Weekend Warrior quest activated!' })} activeOpacity={0.8}>
            <Text style={styles.questBtnText}>Start Quest</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.questCard}>
          <View style={styles.questHeader}>
            <Text style={styles.questName}>Loyalty Streak</Text>
            <View style={styles.questRewardBadge}><Text style={styles.questRewardText}>+2% Earnings</Text></View>
          </View>
          <Text style={styles.questDesc}>Maintain 4.8+ rating for 7 days</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '80%' }]} />
          </View>
          <Text style={styles.progressText}>6 / 7 Days</Text>
        </View>

        <View style={styles.referralCard}>
          <Text style={styles.referralTitle}>Refer a Friend</Text>
          <Text style={styles.referralDesc}>Get UGX 2,000 for every rider you bring to Gulu Rider</Text>
          <TouchableOpacity style={styles.referralBtn} onPress={() => showModal({ icon: '🎁', title: 'Referral', message: 'Referral link sharing coming soon.' })} activeOpacity={0.8}>
            <Text style={styles.referralBtnText}>Invite Now</Text>
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
  tierCard: { marginHorizontal: spacing.lg, backgroundColor: colors.inverseSurface, borderRadius: 24, padding: spacing.xl, marginBottom: spacing.xl },
  tierLabel: { ...typography.labelSm, color: colors.secondaryFixedDim, textTransform: 'uppercase', letterSpacing: 1 },
  tierName: { ...typography.headlineMd, color: colors.surfaceBright, marginTop: 4 },
  tierRating: { ...typography.titleMd, color: colors.primaryContainer, marginTop: 4 },
  tierRank: { ...typography.labelLg, color: colors.secondaryFixedDim, marginTop: 2 },
  tierBadges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  tierBadge: { backgroundColor: `${colors.primaryContainer}33`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  tierBadgeText: { ...typography.labelSm, color: colors.primaryContainer },
  progressCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLowest, borderRadius: 24, padding: spacing.xl, borderWidth: 1, borderColor: colors.outlineVariant, borderLeftWidth: 4, borderLeftColor: colors.primary, marginBottom: spacing.xl },
  progressTitle: { ...typography.titleMd, color: colors.onSurface },
  progressTarget: { ...typography.labelLg, color: colors.primary, marginTop: 4, marginBottom: spacing.md },
  progressBar: { height: 8, backgroundColor: colors.surfaceContainerHigh, borderRadius: 4, marginBottom: spacing.sm },
  progressFill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  progressText: { ...typography.labelLg, color: colors.onSurface },
  progressTip: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: spacing.sm, lineHeight: 18 },
  sectionTitle: { ...typography.titleMd, color: colors.onSurface, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  questCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.md },
  questHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  questName: { ...typography.titleMd, color: colors.onSurface },
  questRewardBadge: { backgroundColor: colors.primaryContainer, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  questRewardText: { ...typography.labelSm, color: colors.onPrimaryContainer, fontWeight: '700' },
  questDesc: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.md },
  questBtn: { backgroundColor: colors.primaryContainer, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  questBtnText: { ...typography.labelLg, color: colors.onPrimaryContainer, fontWeight: '700' },
  referralCard: { marginHorizontal: spacing.lg, backgroundColor: colors.primaryContainer, borderRadius: 24, padding: spacing.xl, marginBottom: spacing.xl },
  referralTitle: { ...typography.headlineMd, color: colors.onPrimaryContainer },
  referralDesc: { ...typography.bodyMd, color: colors.onPrimaryContainer, opacity: 0.8, marginTop: spacing.sm, marginBottom: spacing.lg },
  referralBtn: { backgroundColor: colors.inverseSurface, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  referralBtnText: { ...typography.titleMd, color: colors.inverseOnSurface },
});
