/**
 * @sett/design-system — Design Tokens
 *
 * Single source of truth for all visual constants.
 * Used by Tailwind config AND any future React Native / email templates.
 *
 * Brand spec: SETT is editorial, minimal, image-first.
 * The only "brand color" is black. Fashion items supply all other color.
 */

export const colors = {
  white: '#FFFFFF',
  offWhite: '#F7F7F7',
  black: '#000000',
  nearBlack: '#0A0A0A',

  gray: {
    primary: '#444444',
    secondary: '#666666',
    tertiary: '#888888',
    border: '#E0E0E0',
    bg: '#F5F5F5',
    canvas: '#E8E8E8',
  },
} as const

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, sans-serif',
  },
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem',  // 72px
  },
} as const

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const

export const borderRadius = {
  input: '8px',
  card: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px',
} as const

export const shadows = {
  card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  elevated: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
  modal: '0 20px 60px rgba(0,0,0,0.12)',
} as const

/** SETT aesthetic categories — used for tags, onboarding, and feed filtering */
export const AESTHETICS = [
  'Quiet Luxury',
  'Y2K',
  'Streetwear',
  'Dark Academia',
  'Cottagecore',
  'Coastal Cowgirl',
  'Mob Wife',
  'Minimalist',
  'Vintage',
  'Grunge',
  'Preppy',
  'Boho',
  'Business Casual',
  'Athleisure',
  'Festival',
  'Old Money',
  'Indie Sleaze',
  'Gorpcore',
] as const

export type Aesthetic = typeof AESTHETICS[number]
