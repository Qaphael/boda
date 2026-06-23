import { forwardRef } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { colors, typography, spacing, radius } from '../theme';

const SheetTextInput = forwardRef(function SheetTextInput(
  { style, ...rest },
  ref
) {
  return (
    <BottomSheetTextInput
      ref={ref}
      style={[styles.input, style]}
      placeholderTextColor={colors.onSurfaceVariant}
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    ...typography.bodyMd,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
});

export default SheetTextInput;
