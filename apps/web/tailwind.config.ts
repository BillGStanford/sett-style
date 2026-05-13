import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './shared/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // SETT Design System — exact spec from brand guidelines
        white: '#FFFFFF',
        'off-white': '#F7F7F7',
        black: '#000000',
        'near-black': '#0A0A0A',
        gray: {
          primary: '#444444',
          secondary: '#666666',
          tertiary: '#888888',
          border: '#E0E0E0',
          bg: '#F5F5F5',
          canvas: '#E8E8E8',
        },
        // shadcn/ui tokens mapped to SETT system
        border: '#E0E0E0',
        input: '#E0E0E0',
        ring: '#000000',
        background: '#FFFFFF',
        foreground: '#0A0A0A',
        primary: {
          DEFAULT: '#000000',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F7F7F7',
          foreground: '#0A0A0A',
        },
        muted: {
          DEFAULT: '#F5F5F5',
          foreground: '#888888',
        },
        accent: {
          DEFAULT: '#F5F5F5',
          foreground: '#0A0A0A',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#FFFFFF',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#0A0A0A',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#0A0A0A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['Inter', 'var(--font-inter)', 'sans-serif'],
      },
      fontWeight: {
        black: '900',
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        elevated: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        modal: '0 20px 60px rgba(0,0,0,0.12)',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config
