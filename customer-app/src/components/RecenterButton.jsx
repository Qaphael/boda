import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function RecenterButton({ onPress, top = 120 }) {
  return (
    <TouchableOpacity
      style={[styles.btn, { top }]}
      onPress={onPress}
      activeOpacity={0.8}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.icon}>◎</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    zIndex: 10,
  },
  icon: { fontSize: 22, color: colors.onSurface },
});
