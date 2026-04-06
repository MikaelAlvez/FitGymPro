// Dark Mode)
export const colors = {
  // Brand
  primary:        '#E8450A',   // laranja principal
  primaryDark:    '#C43A08',   // hover / pressed
  primaryLight:   '#FF6B35',   // destaque suave

  // Background (dark mode)
  background:     '#0F0F0F',   // fundo da tela
  surface:        '#1A1A1A',   // cards, inputs
  surfaceHigh:    '#242424',   // elevation 2

  // Texto
  textPrimary:    '#FFFFFF',
  textSecondary:  '#A0A0A0',
  textDisabled:   '#555555',
  textInverse:    '#0F0F0F',

  // Estados
  success:        '#22C55E',
  warning:        '#F59E0B',
  error:          '#EF4444',
  info:           '#3B82F6',

  // Bordas e divisores
  border:         '#2A2A2A',
  divider:        '#1F1F1F',

  // Extras
  white:          '#FFFFFF',
  black:          '#000000',
  transparent:    'transparent',
} as const;

export const typography = {
  family: {
    regular: 'Inter_400Regular',
    medium:  'Inter_500Medium',
    semiBold:'Inter_600SemiBold',
    bold:    'Inter_700Bold',
  },
  size: {
    xs:   10,
    sm:   12,
    md:   14,
    base: 16,
    lg:   18,
    xl:   20,
    '2xl':24,
    '3xl':28,
    '4xl':32,
  },
  lineHeight: {
    tight:  1.2,
    normal: 1.5,
    loose:  1.8,
  },
} as const;

export const spacing = {
  '0':    0,
  '1':    4,
  '2':    8,
  '3':   12,
  '4':   16,
  '5':   20,
  '6':   24,
  '7':   28,
  '8':   32,
  '10':  40,
  '12':  48,
  '16':  64,
} as const;

export const radii = {
  none:   0,
  sm:     4,
  md:     8,
  lg:     12,
  xl:     16,
  '2xl':  20,
  full:   9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#E8450A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

const theme = { colors, typography, spacing, radii, shadows };
export default theme;