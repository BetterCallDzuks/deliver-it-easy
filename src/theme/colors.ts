/** Shared palette + spacing so every screen looks like one app. */
export const colors = {
  primary: '#0B7285',
  primaryDark: '#095c6b',
  accent: '#F59F00',
  success: '#2F9E44',
  danger: '#E03131',
  background: '#F1F3F5',
  surface: '#FFFFFF',
  border: '#DEE2E6',
  textPrimary: '#212529',
  textSecondary: '#868E96',
  markerText: '#FFFFFF',
  polyline: '#0B7285',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
} as const;
