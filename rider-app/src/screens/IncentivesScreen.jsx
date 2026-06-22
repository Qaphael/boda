import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { riderAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';

const TIER_COLORS = { Bronze: '#cd7f32', Silver: '#c0c0c0', Gold: '#ffd700', Platinum: '#e5e4e2' };

export default function IncentivesScreen({ navigation }) {
  const { rider } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncentives();
  }, []);

  const loadIncentives = async () => {
    try {
      if (rider?.riderId) {
        const { data: res } = await riderAPI.getIncentives(rider.riderId);
        setData(res);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const tierColor = TIER_COLORS[data?.tier] || '#cd7f32';
  const progress = data?.nextTierTrips ? Math.min((data?.stats?.totalTrips / data?.nextTierTrips) * 100, 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Rewards & Incentives</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.tierCard, { borderColor: `${tierColor}40` }]}>
          <View style={[styles.tierBadge, { backgroundColor: `${tierColor}20` }]}>
            <Text style={[styles.tierText, { color: tierColor }]}>{data?.tier || 'Bronze'} Tier</Text>
          </View>
          <Text style={styles.tierRating}>⭐ {data?.stats?.avgRating || '0.0'} Rating</Text>
          <Text style={styles.tierSub}>{data?.stats?.totalTrips || 0} total trips</Text>

          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: tierColor }]} />
            </View>
            <Text style={styles.progressLabel}>{data?.stats?.totalTrips || 0} / {data?.nextTierTrips || '—'} trips to {data?.nextTier || 'Max'}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>UGX {(data?.stats?.totalEarnings || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={styles.statValue}>UGX {(data?.stats?.avgFare || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Avg Fare</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Active Quests</Text>
        {(data?.quests || []).map((quest) => {
          const questProgress = Math.min((quest.current / quest.target) * 100, 100);
          return (
            <View key={quest.id} style={styles.questCard}>
              <View style={styles.questHeader}>
                <Text style={styles.questIcon}>{quest.icon}</Text>
                <View style={styles.questInfo}>
                  <Text style={styles.questTitle}>{quest.title}</Text>
                  <Text style={styles.questDesc}>{quest.description}</Text>
                </View>
              </View>
              <View style={styles.questProgress}>
                <View style={styles.questProgressBar}>
                  <View style={[styles.questProgressFill, { width: `${questProgress}%` }]} />
                </View>
                <Text style={styles.questProgressText}>{quest.current}/{quest.target}</Text>
              </View>
              <View style={styles.questReward}>
                <Text style={styles.questRewardLabel}>Reward:</Text>
                <Text style={styles.questRewardValue}>{quest.reward}</Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: colors.onSurface },
  topTitle: { ...typography.titleLg, color: colors.onSurface, fontWeight: '700' },
  tierCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLow, borderRadius: 24, padding: spacing.xl, borderWidth: 2, marginBottom: spacing.xl, alignItems: 'center' },
  tierBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: radius.full, marginBottom: spacing.md },
  tierText: { ...typography.titleMd, fontWeight: '800' },
  tierRating: { ...typography.headlineMd, color: colors.onSurface },
  tierSub: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4 },
  progressSection: { width: '100%', marginTop: spacing.lg },
  progressBar: { height: 8, backgroundColor: colors.surfaceContainerHigh, borderRadius: 4, marginBottom: spacing.sm },
  progressFill: { height: 8, borderRadius: 4 },
  progressLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, textAlign: 'center' },
  statsGrid: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.xl },
  statCard: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.outlineVariant },
  statIcon: { fontSize: 24, marginBottom: spacing.sm },
  statValue: { ...typography.titleMd, color: colors.onSurface, fontWeight: '700' },
  statLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  sectionTitle: { ...typography.titleMd, color: colors.onSurface, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  questCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.md },
  questHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  questIcon: { fontSize: 32, marginRight: spacing.md },
  questInfo: { flex: 1 },
  questTitle: { ...typography.titleMd, color: colors.onSurface, fontWeight: '700' },
  questDesc: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  questProgress: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  questProgressBar: { flex: 1, height: 6, backgroundColor: colors.surfaceContainerHigh, borderRadius: 3 },
  questProgressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  questProgressText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: '600' },
  questReward: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  questRewardLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  questRewardValue: { ...typography.labelLg, color: colors.primary, fontWeight: '700' },
});
