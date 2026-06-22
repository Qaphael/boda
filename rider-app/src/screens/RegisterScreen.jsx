import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

const STEPS = ['Details', 'Verify', 'Done'];

async function uriToBase64(uri) {
  const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpeg';
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', national_id: '', plate_number: '', id_photo: null, selfie_photo: null, termsAccepted: false });
  const [loading, setLoading] = useState(false);
  const { rider, register } = useAuth();
  const { showModal, ModalComponent } = useModal();

  const pickImage = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled) setForm({ ...form, [type]: result.assets[0].uri });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.national_id || !form.plate_number) {
      showModal({ icon: '⚠️', title: 'Error', message: 'Please fill in all required fields' });
      return;
    }
    if (!form.termsAccepted) {
      showModal({ icon: '⚠️', title: 'Error', message: 'Please accept the terms and conditions' });
      return;
    }
    setLoading(true);
    try {
      let id_photo_b64 = null;
      let selfie_photo_b64 = null;
      if (form.id_photo) id_photo_b64 = await uriToBase64(form.id_photo);
      if (form.selfie_photo) selfie_photo_b64 = await uriToBase64(form.selfie_photo);
      await register({ phone: rider?.phone, name: form.name, national_id: form.national_id, plate_number: form.plate_number, id_photo: id_photo_b64, selfie_photo: selfie_photo_b64 });
      showModal({ icon: '✅', title: 'Success', message: 'Registration submitted! Awaiting admin verification.', onClose: () => navigation.replace('Main') });
    } catch (err) {
      console.error('Registration error:', err?.response?.data || err.message || err);
      showModal({ icon: '⚠️', title: 'Error', message: err.response?.data?.error || err.message || 'Registration failed' });
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={styles.backIcon}>←</Text></TouchableOpacity>
        <Text style={styles.topTitle}>Become a Rider</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.stepper}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepCircle, i <= step && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, i <= step && styles.stepNumberActive]}>{i < step ? '✓' : i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, i <= step && styles.stepLabelActive]}>{s}</Text>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && styles.stepLineActive]} />}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <>
            <Text style={styles.sectionTitle}>Identity Information</Text>
            <View style={styles.card}>
              <Text style={styles.inputLabel}>Full Name (as on ID)</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="e.g. John Okello" placeholderTextColor={colors.outline} />
              <Text style={styles.inputLabel}>National ID Number (NIN)</Text>
              <TextInput style={styles.input} value={form.national_id} onChangeText={(v) => setForm({ ...form, national_id: v })} placeholder="CM00000000XXXX" placeholderTextColor={colors.outline} />
            </View>

            <Text style={styles.sectionTitle}>Vehicle Status</Text>
            <View style={styles.card}>
              <Text style={styles.inputLabel}>Number Plate</Text>
              <TextInput style={styles.input} value={form.plate_number} onChangeText={(v) => setForm({ ...form, plate_number: v })} placeholder="UEA 123X" placeholderTextColor={colors.outline} autoCapitalize="characters" />
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(1)} activeOpacity={0.8}>
              <Text style={styles.nextBtnText}>Continue →</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>Upload Documents</Text>
            <View style={styles.uploadGrid}>
              <TouchableOpacity style={styles.uploadCard} onPress={() => pickImage('id_photo')} activeOpacity={0.7}>
                <Text style={styles.uploadIcon}>🪪</Text>
                <Text style={styles.uploadLabel}>{form.id_photo ? 'ID Photo ✓' : 'National ID Photo'}</Text>
                <Text style={styles.uploadHint}>Tap to upload</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadCard} onPress={() => pickImage('selfie_photo')} activeOpacity={0.7}>
                <Text style={styles.uploadIcon}>🤳</Text>
                <Text style={styles.uploadLabel}>{form.selfie_photo ? 'Selfie ✓' : 'Verification Selfie'}</Text>
                <Text style={styles.uploadHint}>Tap to upload</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.checkboxRow} onPress={() => setForm({ ...form, termsAccepted: !form.termsAccepted })} activeOpacity={0.7}>
              <View style={[styles.checkbox, form.termsAccepted && styles.checkboxChecked]}>
                {form.termsAccepted && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>I agree to the Terms & Privacy Policy</Text>
            </TouchableOpacity>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(0)} activeOpacity={0.8}><Text style={styles.backStepBtnText}>← Back</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.nextBtn, { flex: 1 }]} onPress={() => setStep(2)} activeOpacity={0.8}><Text style={styles.nextBtnText}>Continue →</Text></TouchableOpacity>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>Review Your Details</Text>
              <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Name</Text><Text style={styles.reviewValue}>{form.name}</Text></View>
              <View style={styles.reviewRow}><Text style={styles.reviewLabel}>NIN</Text><Text style={styles.reviewValue}>{form.national_id}</Text></View>
              <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Plate</Text><Text style={styles.reviewValue}>{form.plate_number}</Text></View>
              <View style={styles.reviewRow}><Text style={styles.reviewLabel}>ID Photo</Text><Text style={styles.reviewValue}>{form.id_photo ? '✓ Uploaded' : 'Not uploaded'}</Text></View>
              <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Selfie</Text><Text style={styles.reviewValue}>{form.selfie_photo ? '✓ Uploaded' : 'Not uploaded'}</Text></View>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>Your registration will be reviewed by our team. This usually takes 24-48 hours. You'll be notified once verified.</Text>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(1)} activeOpacity={0.8}><Text style={styles.backStepBtnText}>← Back</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.nextBtn, { flex: 1 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color={colors.onPrimaryContainer} /> : <Text style={styles.nextBtnText}>Submit for Verification</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: colors.onSurface },
  topTitle: { ...typography.titleLg, color: colors.onSurface, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: colors.primaryContainer },
  stepNumber: { ...typography.labelLg, color: colors.onSurfaceVariant },
  stepNumberActive: { color: colors.onPrimaryContainer, fontWeight: '700' },
  stepLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginLeft: 6 },
  stepLabelActive: { color: colors.onSurface, fontWeight: '600' },
  stepLine: { width: 32, height: 2, backgroundColor: colors.surfaceContainerHigh, marginHorizontal: 6 },
  stepLineActive: { backgroundColor: colors.primaryContainer },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  sectionTitle: { ...typography.labelLg, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md, marginTop: spacing.lg },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.md },
  inputLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 6, marginLeft: 4 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: spacing.lg, height: 48, ...typography.bodyMd, color: colors.onSurface, marginBottom: spacing.md },
  uploadGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  uploadCard: { flex: 1, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.outlineVariant, padding: spacing.xl, alignItems: 'center', minHeight: 140 },
  uploadIcon: { fontSize: 32, marginBottom: spacing.sm },
  uploadLabel: { ...typography.labelLg, color: colors.onSurface, textAlign: 'center' },
  uploadHint: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
  checkmark: { fontSize: 14, color: colors.onPrimaryContainer, fontWeight: '700' },
  checkboxText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  btnRow: { flexDirection: 'row', gap: spacing.md },
  backStepBtn: { paddingHorizontal: spacing.xl, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.outlineVariant },
  backStepBtnText: { ...typography.titleMd, color: colors.onSurfaceVariant },
  nextBtn: { backgroundColor: colors.primaryContainer, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  nextBtnText: { ...typography.titleMd, color: colors.onPrimaryContainer },
  reviewCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.lg },
  reviewTitle: { ...typography.titleMd, color: colors.onSurface, marginBottom: spacing.md },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainer },
  reviewLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  reviewValue: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface },
  infoBox: { flexDirection: 'row', backgroundColor: `${colors.tertiaryContainer}66`, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl, gap: spacing.md },
  infoIcon: { fontSize: 20 },
  infoText: { ...typography.bodyMd, color: colors.onTertiaryContainer, flex: 1, lineHeight: 22 },
});
