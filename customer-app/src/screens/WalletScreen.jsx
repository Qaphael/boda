import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useModal } from '../components/useModal';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, radius } from '../theme';

const MOCK_PAYMENT_METHODS = [
  { id: 'mtn', name: 'MTN MoMo', number: '•••• •892', color: '#FFCC00', active: true },
  { id: 'airtel', name: 'Airtel Money', number: '•••• •415', color: '#FF0000', active: false },
];

const MOCK_TRANSACTIONS = [
  { id: 1, title: 'Ride to Gulu Market', time: 'Today, 10:24 AM', amount: -3500, status: 'Success', icon: '🏍', bgColor: colors.primaryContainer },
  { id: 2, title: 'Wallet Top-up', time: 'Yesterday, 4:15 PM', amount: 20000, status: 'Success', icon: '💳', bgColor: colors.secondaryContainer },
  { id: 3, title: 'Failed Ride Request', time: 'May 12, 11:30 AM', amount: 0, status: 'Cancelled', icon: '⚠️', bgColor: colors.errorContainer },
  { id: 4, title: 'Ride to Lacor Hosp.', time: 'May 11, 09:12 AM', amount: -7000, status: 'Success', icon: '🏍', bgColor: colors.primaryContainer },
];

export default function WalletScreen() {
  const { showModal, ModalComponent } = useModal();
  const [paymentMethods, setPaymentMethods] = useState(MOCK_PAYMENT_METHODS);

  const handleTopUp = () => {
    showModal({ icon: '💳', title: 'Top Up Wallet', message: 'MTN MoMo and Airtel Money top-up coming soon.' });
  };

  const handleWithdraw = () => {
    showModal({ icon: '💰', title: 'Withdraw', message: 'Withdrawal feature coming soon.' });
  };

  const handleAddNew = () => {
    showModal({ icon: '💳', title: 'Add Payment Method', message: 'Add MTN MoMo or Airtel Money to your wallet.' });
  };

  const handleSelectMethod = (methodId) => {
    setPaymentMethods(prev =>
      prev.map(m => ({ ...m, active: m.id === methodId }))
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceContent}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.currency}>UGX</Text>
              <Text style={styles.amount}>45,250</Text>
            </View>
            <View style={styles.balanceActions}>
              <TouchableOpacity style={styles.topUpBtn} onPress={handleTopUp} activeOpacity={0.8}>
                <Text style={styles.topUpIcon}>＋</Text>
                <Text style={styles.topUpText}>Top Up</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw} activeOpacity={0.8}>
                <Text style={styles.withdrawIcon}>💰</Text>
                <Text style={styles.withdrawText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.balanceGlow} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <TouchableOpacity onPress={handleAddNew}>
              <Text style={styles.addNew}>+ Add New</Text>
            </TouchableOpacity>
          </View>
          {(paymentMethods || []).map((method) => (
            <TouchableOpacity key={method.id} style={styles.methodCard} onPress={() => handleSelectMethod(method.id)} activeOpacity={0.7}>
              <View style={[styles.methodIcon, { backgroundColor: `${method.color}1a`, borderColor: method.color }]}>
                <Text style={[styles.methodIconText, { color: method.color === '#FFCC00' ? '#000' : method.color }]}>
                  {method.name.split(' ')[0]}
                </Text>
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>{method.name}</Text>
                <Text style={styles.methodNumber}>{method.number}</Text>
              </View>
              <Text style={[styles.methodCheck, method.active ? styles.methodCheckActive : null]}>
                {method.active ? '✓' : '○'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </View>
          {(MOCK_TRANSACTIONS || []).map((tx) => (
            <View key={tx.id} style={styles.txItem}>
              <View style={[styles.txIconBg, { backgroundColor: tx.bgColor }]}>
                <Text style={styles.txIcon}>{tx.icon}</Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txTitle}>{tx.title}</Text>
                <Text style={styles.txTime}>{tx.time}</Text>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, tx.amount > 0 && styles.txAmountPositive]}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount === 0 ? '0' : tx.amount.toLocaleString()}
                </Text>
                <Text style={[styles.txStatus, tx.status === 'Cancelled' && styles.txStatusCancelled]}>
                  {tx.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  balanceCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.inverseSurface,
    borderRadius: 24,
    padding: spacing.xl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  balanceContent: {
    zIndex: 2,
  },
  balanceLabel: {
    ...typography.labelLg,
    color: colors.secondaryFixedDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: spacing.xl,
  },
  currency: {
    ...typography.headlineMd,
    color: colors.primaryContainer,
  },
  amount: {
    ...typography.displayLg,
    color: colors.surfaceBright,
    fontSize: 40,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  topUpBtn: {
    flex: 1,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  topUpIcon: {
    fontSize: 16,
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
  topUpText: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
  withdrawBtn: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.lg,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  withdrawIcon: {
    fontSize: 16,
  },
  withdrawText: {
    ...typography.titleMd,
    color: colors.inverseSurface,
    fontWeight: '700',
  },
  balanceGlow: {
    position: 'absolute',
    right: -48,
    top: -48,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: colors.primary,
    opacity: 0.1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  addNew: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '700',
  },
  seeAll: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: spacing.md,
  },
  methodIconText: {
    fontSize: 10,
    fontWeight: '800',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  methodNumber: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    letterSpacing: 2,
  },
  methodCheck: {
    fontSize: 20,
    color: colors.outlineVariant,
  },
  methodCheckActive: {
    color: colors.primary,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  txIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  txIcon: {
    fontSize: 18,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  txTime: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  txAmountPositive: {
    color: colors.tertiary,
  },
  txStatus: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.primary,
  },
  txStatusCancelled: {
    color: colors.error,
  },
});
