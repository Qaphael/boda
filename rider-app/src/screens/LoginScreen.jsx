import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, radius } from '../theme';
import { useModal } from '../components/useModal';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { sendOTP, verifyOTP } = useAuth();
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];
  const { showModal, ModalComponent } = useModal();

  const handleSendOTP = async () => {
    if (!phone || phone.length < 9) {
      setError('Please enter a valid phone number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendOTP(`256${phone}`);
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (text, index) => {
    if (text.length > 1) text = text.slice(-1);
    if (!/^\d*$/.test(text)) return;
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 3) otpRefs[index + 1].current?.focus();
    if (newOtp.every(d => d.length === 1)) handleVerifyOTP(newOtp.join(''));
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyOTP = async (code) => {
    setError('');
    setLoading(true);
    try {
      await verifyOTP(`256${phone}`, code);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP');
      setOtp(['', '', '', '']);
      otpRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try { await sendOTP(`256${phone}`); } catch (err) { setError('Failed to resend'); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <View style={styles.brandBadge}><Text style={styles.brandText}>GuluRide Rider</Text></View>

        <View style={styles.header}>
          <Text style={styles.headline}>Start earning{'\n'}in Gulu</Text>
          <Text style={styles.subtitle}>Enter your mobile number to start riding.</Text>
        </View>

        <View style={styles.form}>
          {step === 'phone' ? (
            <View style={styles.phoneSection}>
              <View style={styles.phoneInputWrapper}>
                <View style={styles.phonePrefix}>
                  <View style={styles.flag}>
                    <View style={[styles.flagStripe, { backgroundColor: '#000' }]} />
                    <View style={[styles.flagStripe, { backgroundColor: '#FCDC04' }]} />
                    <View style={[styles.flagStripe, { backgroundColor: '#D90000' }]} />
                  </View>
                  <Text style={styles.prefixText}>+256</Text>
                </View>
                <TextInput style={styles.phoneInput} value={phone} onChangeText={setPhone} placeholder="700 000 000" keyboardType="phone-pad" maxLength={9} placeholderTextColor={colors.outline} />
              </View>
            </View>
          ) : (
            <View style={styles.otpSection}>
              <TouchableOpacity onPress={() => { setStep('phone'); setOtp(['', '', '', '']); }} style={styles.backBtn}>
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.otpLabel}>Enter 4-digit code</Text>
              <Text style={styles.otpSentTo}>Sent to +256 {phone}</Text>
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput key={i} ref={otpRefs[i]} style={[styles.otpInput, digit ? styles.otpInputFilled : null]} value={digit} onChangeText={(t) => handleOTPChange(t, i)} onKeyPress={(e) => handleKeyPress(e, i)} keyboardType="number-pad" maxLength={1} selectTextOnFocus />
                ))}
              </View>
              <TouchableOpacity onPress={handleResend} disabled={loading}>
                <Text style={styles.resendText}>Resend Code</Text>
              </TouchableOpacity>
            </View>
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={[styles.nextButton, loading && styles.buttonDisabled]} onPress={step === 'phone' ? handleSendOTP : () => handleVerifyOTP(otp.join(''))} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color={colors.onPrimaryContainer} /> : <Text style={styles.nextButtonText}>{step === 'phone' ? 'Get Started →' : 'Verify & Login'}</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerIcon}>🔒</Text>
          <Text style={styles.footerText}>Encrypted Connection</Text>
        </View>
      </View>
      <ModalComponent />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 80, paddingBottom: spacing.xxl, justifyContent: 'space-between' },
  brandBadge: { alignSelf: 'center', backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 8, borderRadius: radius.full },
  brandText: { ...typography.titleMd, color: colors.onPrimaryContainer, fontWeight: '700' },
  header: { marginTop: spacing.xl, marginBottom: spacing.lg },
  headline: { ...typography.headlineLgMobile, color: colors.onSurface, marginBottom: spacing.sm },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  form: { flex: 1, justifyContent: 'center' },
  phoneSection: { marginBottom: spacing.lg },
  phoneInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xl, borderWidth: 2, borderColor: 'transparent', height: 56 },
  phonePrefix: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.lg, gap: 8 },
  flag: { width: 24, height: 16, borderRadius: 2, overflow: 'hidden', borderWidth: 0.5, borderColor: colors.outlineVariant },
  flagStripe: { flex: 1 },
  prefixText: { ...typography.titleMd, color: colors.onSurface },
  phoneInput: { flex: 1, height: 56, paddingHorizontal: spacing.lg, ...typography.titleMd, color: colors.onSurface },
  otpSection: { marginBottom: spacing.lg },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  backIcon: { fontSize: 18, color: colors.onSurface },
  otpLabel: { ...typography.labelLg, color: colors.onSurfaceVariant, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  otpSentTo: { ...typography.bodyMd, color: colors.onSurface, textAlign: 'center', marginBottom: spacing.md },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  otpInput: { width: 56, height: 64, textAlign: 'center', ...typography.headlineMd, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, borderWidth: 2, borderColor: colors.outlineVariant, color: colors.onSurface },
  otpInputFilled: { borderColor: colors.primary },
  resendText: { ...typography.labelLg, color: colors.primary, textAlign: 'center' },
  errorText: { ...typography.labelLg, color: colors.error, textAlign: 'center', marginBottom: spacing.md },
  nextButton: { backgroundColor: colors.primaryContainer, height: spacing.touchMin, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  buttonDisabled: { opacity: 0.7 },
  nextButtonText: { ...typography.titleMd, color: colors.onPrimaryContainer },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  footerIcon: { fontSize: 14 },
  footerText: { ...typography.labelSm, color: colors.onSurfaceVariant },
});
