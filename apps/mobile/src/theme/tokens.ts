/**
 * Tokens de diseño base — Huella SOS.
 *
 * Set mínimo y sobrio mientras no exista `docs/design-system.md`.
 * Reemplazable cuando llegue el sistema de diseño formal: el resto de la UI
 * sólo consume estos tokens, no colores ni medidas hardcodeadas.
 */

export const colors = {
  // Superficies
  background: '#F7F6F2', // crema cálido, no blanco puro
  surface: '#FFFFFF',
  surfaceMuted: '#EFEDE7',
  border: '#E2DFD6',

  // Texto
  text: '#1F2421',
  textMuted: '#6B716C',
  textInverse: '#FFFFFF',

  // Marca: verde-azulado sobrio y confiable (rescate), no degradado genérico
  primary: '#0F766E',
  primaryStrong: '#0B5750',
  primaryMuted: '#D7EBE8',

  // Estados
  danger: '#B4231E',
  dangerMuted: '#FBE6E5',
  success: '#2E7D32',
  successMuted: '#E4F1E4',
  warning: '#B5740B',
  warningMuted: '#FBF0DC',

  overlay: 'rgba(31, 36, 33, 0.45)',
} as const;

/** Color por tipo de reporte (chips/badges). Mapea report_type del contrato. */
export const reportTypeColors = {
  lost: colors.danger,
  injured: colors.warning,
  sighting: colors.primary,
  abandoned: colors.textMuted,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const theme = {
  colors,
  reportTypeColors,
  spacing,
  radius,
  fontSize,
  fontWeight,
} as const;

export type Theme = typeof theme;
