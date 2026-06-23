import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

export default function BackButton({ onPress, light = false }) {
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity
      style={[styles.btn, { top: insets.top + 8 }]}
      onPress={onPress}
      activeOpacity={0.8}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Text style={[styles.icon, light && styles.iconLight]}>&#8592;</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  icon: { fontSize: 20, color: colors.onSurface },
  iconLight: { color: '#fff' },
});
