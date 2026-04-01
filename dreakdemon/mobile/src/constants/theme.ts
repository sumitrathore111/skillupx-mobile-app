export const COLORS = {
  // Backgrounds
  background: '#0A0A0F',
  surface: '#13131A',
  surfaceElevated: '#1A1A24',
  border: '#1E1E2E',
  borderLight: '#2A2A3E',

  // Brand
  primary: '#6C63FF',
  primaryDark: '#5A52E0',
  primaryLight: '#8B85FF',
  accent: '#00D9FF',
  accentDark: '#00B8D9',

  // Status
  success: '#00E676',
  successDark: '#00C853',
  warning: '#FFB300',
  warningDark: '#FF8F00',
  danger: '#FF4757',
  dangerDark: '#D63031',

  // Difficulty
  easy: '#00E676',
  medium: '#FFB300',
  hard: '#FF4757',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#C9D1D9',
  textMuted: '#6B7280',
  textDisabled: '#3D3D5C',

  // Overlays
  overlay: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(0,0,0,0.4)',
} as const;

export const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'JetBrainsMono_400Regular',
} as const;

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 32,
  '4xl': 40,
  screen: {
    padding: 16,
    paddingLg: 20,
  },
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  primary: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  accent: {
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
