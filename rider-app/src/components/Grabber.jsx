import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

export default function Grabber() {
  return (
    <View style={styles.container}>
      <View style={styles.bar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  bar: {
    width: 40,
    height: 4,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 2,
  },
});
