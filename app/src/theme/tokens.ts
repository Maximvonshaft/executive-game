export const spacingScale = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40
} as const;

export type SpacingToken = keyof typeof spacingScale;

export const radiusScale = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  full: 999
} as const;

export type RadiusToken = keyof typeof radiusScale;

export const elevationShadow = {
  resting: '0 2px 4px rgba(0, 0, 0, 0.32)',
  raised: '0 6px 16px rgba(0, 0, 0, 0.35)',
  overlay: '0 12px 32px rgba(0, 0, 0, 0.5)'
} as const;

export type ElevationToken = keyof typeof elevationShadow;

export const colorTokens = {
  background: '#050505',
  surface: '#111111',
  surfaceMuted: '#1a1a1a',
  primary: '#f5c451',
  primaryStrong: '#f0b429',
  primaryMuted: '#8a6b1f',
  accent: '#ffd666',
  positive: '#34d399',
  caution: '#facc15',
  critical: '#f87171',
  text: '#f5f5f5',
  textMuted: '#c1c1c1',
  border: '#2c2c2c',
  focus: '#f5c451',
  backdrop: 'rgba(7, 7, 7, 0.72)'
} as const;

export const highContrastTokens = {
  ...colorTokens,
  surface: '#000000',
  surfaceMuted: '#0d0d0d',
  text: '#ffffff',
  textMuted: '#ededed',
  border: '#f5c451'
};

export const typographyScale = {
  caption: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 0
  },
  headline: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0
  }
} as const;

export type TypographyVariant = keyof typeof typographyScale;

export const motionTokens = {
  durationShort: '120ms',
  durationMedium: '180ms',
  durationLong: '320ms',
  easingStandard: 'cubic-bezier(0.2, 0, 0, 1)'
};
