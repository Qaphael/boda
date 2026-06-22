import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, Share } from 'react-native';
import { useModal } from '../components/useModal';
import { profileAPI } from '../services/api';
import { colors, typography, spacing, radius } from '../theme';

export default function ReferralScreen({ navigation }) {
  const { showModal, ModalComponent } = useModal();
  const [code, setCode] = useState('');
  const [uses, setUses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [inputCode, setInputCode] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await profileAPI.getReferral();
        setCode(data.code);
        setUses(data.uses || 0);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join Boda and get a ride discount! Use my referral code: ${code}\n\nDownload now: https://boda.ocaya.space`,
        title: 'Invite friends to Boda',
      });
    } catch (err) { console.error(err); }
  };

  const handleApply = async () => {
    if (!inputCode.trim()) {
      showModal({ icon: '⚠️', title: 'Enter Code', message: 'Please enter a referral code.' });
      return;
    }
    setApplying(true);
    try {
      await profileAPI.applyReferral(inputCode.trim());
      setInputCode('');
      showModal({ icon: '🎉', title: 'Referral Applied!', message: 'You and your friend will earn rewards on your next rides.' });
    } catch (err) {
      showModal({ icon: '❌', title: 'Error', message: err.response?.data?.error || 'Invalid referral code' });
    } finally { setApplying(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Referrals</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroIcon}>🎁</Text>
          <Text style={styles.heroTitle}>Invite Friends, Earn Rewards</Text>
          <Text style={styles.heroSub}>Share your code with friends. When they complete their first ride, you both earn UGX 2,000 off your next trip.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Referral Code</Text>
          <View style={styles.codeCard}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.codeText}>{code}</Text>
                <Text style={styles.codeUses}>{uses} friend{uses !== 1 ? 's' : ''} referred</Text>
              </>
            )}
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
            <Text style={styles.shareIcon}>📤</Text>
            <Text style={styles.shareText}>Share Code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Have a Code?</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={inputCode}
              onChangeText={setInputCode}
              placeholder="Enter referral code"
              placeholderTextColor={colors.onSurfaceVariant}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.applyBtn, applying && { opacity: 0.6 }]}
              onPress={handleApply}
              disabled={applying}
              activeOpacity={0.7}
            >
              {applying ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.applyBtnText}>Apply</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepCard}>
            <View style={styles.stepDot}><Text style={styles.stepNum}>1</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Share your code</Text>
              <Text style={styles.stepDesc}>Send your referral code to friends via SMS, WhatsApp, or social media</Text>
            </View>
          </View>
          <View style={styles.stepCard}>
            <View style={styles.stepDot}><Text style={styles.stepNum}>2</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Friend signs up</Text>
              <Text style={styles.stepDesc}>They download Boda, register, and enter your code when prompted</Text>
            </View>
          </View>
          <View style={styles.stepCard}>
            <View style={styles.stepDot}><Text style={styles.stepNum}>3</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Both earn rewards</Text>
              <Text style={styles.stepDesc}>After their first completed ride, you both get UGX 2,000 off</Text>
            </View>
          </View>
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
  heroSection: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xl, marginBottom: spacing.lg },
  heroIcon: { fontSize: 64, marginBottom: spacing.lg },
  heroTitle: { ...typography.headlineMd, color: colors.onSurface, textAlign: 'center' },
  heroSub: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.md, lineHeight: 20 },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { ...typography.labelLg, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  codeCard: { backgroundColor: colors.primaryContainer, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md },
  codeText: { ...typography.displayMd, color: colors.onPrimaryContainer, letterSpacing: 4, fontWeight: '800' },
  codeUses: { ...typography.bodySm, color: colors.onPrimaryContainer, marginTop: spacing.sm },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.primary },
  shareIcon: { fontSize: 18 },
  shareText: { ...typography.titleMd, color: '#fff', fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: spacing.md },
  input: { flex: 1, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.onSurface, textTransform: 'uppercase' },
  applyBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  applyBtnText: { ...typography.titleMd, color: '#fff', fontWeight: '700' },
  stepCard: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg, alignItems: 'flex-start' },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  stepNum: { ...typography.titleMd, color: colors.onPrimaryContainer, fontWeight: '800' },
  stepContent: { flex: 1 },
  stepTitle: { ...typography.titleMd, color: colors.onSurface },
  stepDesc: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4, lineHeight: 18 },
});
