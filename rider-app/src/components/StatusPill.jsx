import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../theme';

export default function StatusPill({ text, color = colors.primaryContainer, textColor = colors.onPrimaryContainer }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.pill, { top: insets.top + 8, backgroundColor: color }]}>
      <Text style={[styles.text, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    zIndex: 20,
  },
  text: {
    ...typography.labelLg,
    textAlign: 'center',
  },
});
