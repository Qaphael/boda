import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useModal } from '../components/useModal';
import { colors, typography, spacing, radius } from '../theme';

const PACKAGE_SIZES = [
  { id: 'small', label: 'Small', desc: 'Envelope, small bag', icon: '✉️' },
  { id: 'medium', label: 'Medium', desc: 'Backpack, box', icon: '🎒' },
  { id: 'large', label: 'Large', desc: 'Multiple items, sack', icon: '📦' },
];

export default function DeliveryDetailsScreen({ route, navigation }) {
  const { showModal, ModalComponent } = useModal();
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [packageSize, setPackageSize] = useState('small');
  const [instructions, setInstructions] = useState('');

  const handleContinue = () => {
    navigation.navigate('NewBooking', {
      type: 'delivery',
      recipient: { name: recipientName, phone: `256${recipientPhone}` },
      packageSize,
      instructions,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>👤</Text> Recipient Information
        </Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Recipient Name</Text>
          <TextInput
            style={styles.input}
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder="e.g. Samuel Okello"
            placeholderTextColor={colors.outline}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.phonePrefix}>
              <Text style={styles.phonePrefixText}>+256</Text>
            </View>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              value={recipientPhone}
              onChangeText={setRecipientPhone}
              placeholder="700 000 000"
              keyboardType="phone-pad"
              maxLength={9}
              placeholderTextColor={colors.outline}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
          <Text style={styles.sectionIcon}>📦</Text> Package Size
        </Text>
        <View style={styles.packageRow}>
          {PACKAGE_SIZES.map((size) => (
            <TouchableOpacity
              key={size.id}
              style={[styles.packageCard, packageSize === size.id && styles.packageCardActive]}
              onPress={() => setPackageSize(size.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.packageIcon}>{size.icon}</Text>
              <Text style={[styles.packageLabel, packageSize === size.id && styles.packageLabelActive]}>
                {size.label}
              </Text>
              <Text style={styles.packageDesc}>{size.desc}</Text>
              {packageSize === size.id && <Text style={styles.packageCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
          <Text style={styles.sectionIcon}>📝</Text> Delivery Instructions
        </Text>
        <TextInput
          style={styles.textArea}
          value={instructions}
          onChangeText={setInstructions}
          placeholder="e.g. Drop at the reception, or call when outside the main gate..."
          placeholderTextColor={colors.outline}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View style={styles.momoPreview}>
          <View style={styles.momoLeft}>
            <View style={styles.mtnBadge}><Text style={styles.mtnText}>MTN</Text></View>
            <View>
              <Text style={styles.momoName}>MTN MoMo</Text>
              <Text style={styles.momoNumber}>•••• ••42</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => showModal({ icon: '💳', title: 'Change Payment', message: 'Payment method selection coming soon.' })}>
            <Text style={styles.changeBtn}>Change</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.continueButton, !recipientName && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!recipientName}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>Continue to Payment</Text>
          <Text style={styles.continueArrow}>→</Text>
        </TouchableOpacity>
      </View>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 80,
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  sectionTitle: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.lg,
    height: 56,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  phonePrefix: {
    width: 72,
    height: 56,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phonePrefixText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  phoneInput: {
    flex: 1,
  },
  packageRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  packageCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  packageCardActive: {
    borderColor: colors.onSurface,
    backgroundColor: colors.primaryContainer,
  },
  packageIcon: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  packageLabel: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  packageLabelActive: {
    fontWeight: '700',
  },
  packageDesc: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 2,
  },
  packageCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 16,
    color: colors.onSurface,
  },
  textArea: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
    ...typography.bodyMd,
    color: colors.onSurface,
    minHeight: 120,
    marginBottom: spacing.xl,
  },
  momoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: `${colors.primaryFixed}1a`,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: `${colors.primaryFixed}4d`,
    marginBottom: spacing.xl,
  },
  momoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mtnBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: '#FFD200',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },
  momoName: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  momoNumber: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  changeBtn: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceBright,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  continueButton: {
    backgroundColor: colors.primaryContainer,
    height: spacing.touchMin,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueText: {
    ...typography.headlineMd,
    color: colors.onPrimaryContainer,
  },
  continueArrow: {
    fontSize: 20,
    color: colors.onPrimaryContainer,
  },
});
