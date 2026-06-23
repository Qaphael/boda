export const colors = {
  primary: '#6d5e00',
  onPrimary: '#ffffff',
  primaryContainer: '#fde047',
  onPrimaryContainer: '#726300',
  inversePrimary: '#e2c62d',

  secondary: '#5e5e5e',
  onSecondary: '#ffffff',
  secondaryContainer: '#e2e2e2',
  onSecondaryContainer: '#646464',

  tertiary: '#0053db',
  onTertiary: '#ffffff',
  tertiaryContainer: '#d8dfff',
  onTertiaryContainer: '#0e58e0',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  surface: '#fcf9f8',
  onSurface: '#1c1b1b',
  onSurfaceVariant: '#4b4734',
  surfaceDim: '#dcd9d9',
  surfaceBright: '#fcf9f8',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f6f3f2',
  surfaceContainer: '#f0edec',
  surfaceContainerHigh: '#ebe7e7',
  surfaceContainerHighest: '#e5e2e1',
  surfaceVariant: '#e5e2e1',
  surfaceTint: '#6d5e00',

  inverseSurface: '#313030',
  inverseOnSurface: '#f3f0ef',

  outline: '#7d7761',
  outlineVariant: '#cec6ad',

  background: '#fcf9f8',
  onBackground: '#1c1b1b',

  primaryFixed: '#ffe24c',
  primaryFixedDim: '#e2c62d',
  onPrimaryFixed: '#211b00',
  onPrimaryFixedVariant: '#524600',
  secondaryFixed: '#e2e2e2',
  secondaryFixedDim: '#c6c6c6',
  onSecondaryFixed: '#1b1b1b',
  onSecondaryFixedVariant: '#474747',
  tertiaryFixed: '#dbe1ff',
  tertiaryFixedDim: '#b4c5ff',
  onTertiaryFixed: '#00174b',
  onTertiaryFixedVariant: '#003ea8',
};

export const typography = {
  displayLg: { fontFamily: 'Outfit', fontSize: 48, fontWeight: '700', lineHeight: 56, letterSpacing: -0.02, maxFontSizeMultiplier: 1.2 },
  headlineLg: { fontFamily: 'Outfit', fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: -0.01, maxFontSizeMultiplier: 1.2 },
  headlineMd: { fontFamily: 'Outfit', fontSize: 24, fontWeight: '600', lineHeight: 32, maxFontSizeMultiplier: 1.3 },
  headlineLgMobile: { fontFamily: 'Outfit', fontSize: 28, fontWeight: '700', lineHeight: 36, maxFontSizeMultiplier: 1.2 },
  titleLg: { fontFamily: 'Outfit', fontSize: 20, fontWeight: '600', lineHeight: 28, maxFontSizeMultiplier: 1.3 },
  titleMd: { fontFamily: 'Outfit', fontSize: 18, fontWeight: '600', lineHeight: 24, maxFontSizeMultiplier: 1.3 },
  bodyLg: { fontFamily: 'Outfit', fontSize: 18, fontWeight: '400', lineHeight: 28, maxFontSizeMultiplier: 1.4 },
  bodyMd: { fontFamily: 'Outfit', fontSize: 16, fontWeight: '400', lineHeight: 24, maxFontSizeMultiplier: 1.4 },
  labelLg: { fontFamily: 'Outfit', fontSize: 14, fontWeight: '600', lineHeight: 20, letterSpacing: 0.02, maxFontSizeMultiplier: 1.2 },
  labelSm: { fontFamily: 'Outfit', fontSize: 12, fontWeight: '500', lineHeight: 16, letterSpacing: 0.04, maxFontSizeMultiplier: 1.2 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  touchMin: 48,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export default { colors, typography, spacing, radius };
