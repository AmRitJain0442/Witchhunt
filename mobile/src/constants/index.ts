export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:8000/api/v1'   // Android emulator → localhost
  : 'https://api.kutumb.health/api/v1';

export const COLORS = {
  primary: '#2D6A4F',      // Forest green
  primaryLight: '#52B788',
  primaryDark: '#1B4332',
  secondary: '#F4845F',    // Warm orange
  accent: '#FFB703',       // Golden
  background: '#F8F9FA',
  surface: '#FFFFFF',
  error: '#D62839',
  warning: '#F4A261',
  success: '#2D6A4F',
  text: {
    primary: '#1A1A2E',
    secondary: '#495057',
    disabled: '#ADB5BD',
    inverse: '#FFFFFF',
  },
  border: '#DEE2E6',
  divider: '#E9ECEF',
  heartScore: '#E63946',
  brainScore: '#7B2D8B',
  gutScore: '#F4A261',
  lungsScore: '#4CC9F0',
};

export const FONTS = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
