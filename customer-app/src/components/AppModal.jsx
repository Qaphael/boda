import { View, Text, TouchableOpacity, StyleSheet, Modal as RNModal, Pressable } from 'react-native';
import { colors, typography, spacing, radius } from '../theme';

export default function AppModal({ visible, onClose, title, message, actions, icon }) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          {title && <Text style={styles.title}>{title}</Text>}
          {message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.actions}>
            {(actions || []).map((action, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.btn, action.primary ? styles.btnPrimary : styles.btnSecondary]}
                onPress={() => { action.onPress?.(); onClose(); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnText, action.primary ? styles.btnTextPrimary : styles.btnTextSecondary]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: spacing.touchMin,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: colors.primaryContainer,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  btnSecondary: {
    borderWidth: 2,
    borderColor: colors.outlineVariant,
  },
  btnText: {
    ...typography.titleMd,
  },
  btnTextPrimary: {
    color: colors.onPrimaryContainer,
  },
  btnTextSecondary: {
    color: colors.onSurfaceVariant,
  },
});
