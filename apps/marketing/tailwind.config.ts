import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#6B96F0',
          500: '#4178E8',
          600: '#1654D9',
          700: '#0E3FA8',
          faint: 'rgba(22,84,217,0.10)',
          glow: 'rgba(22,84,217,0.28)',
        },
        accent: {
          500: '#00C2A8',
          faint: 'rgba(0,194,168,0.10)',
        },
        surface: {
          base: 'var(--bg-base)',
          subtle: 'var(--bg-subtle)',
          muted: 'var(--bg-muted)',
        },
        ink: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },
        dark: {
          base: '#080D1B',
          raised: '#0D1526',
          elevated: '#131E33',
          border: '#1F2D48',
          'border-hover': '#2A3D5C',
          'text-primary': '#EFF4FF',
          'text-secondary': '#8DA0C0',
          'text-tertiary': '#6B809E',
        },
        border: { DEFAULT: '#E2E8F0', subtle: '#EDF2F7' },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      fontSize: {
        'display-2xl': ['72px', { lineHeight: '80px', fontWeight: '800' }],
        'display-xl': ['60px', { lineHeight: '68px', fontWeight: '800' }],
        'display-lg': ['48px', { lineHeight: '56px', fontWeight: '700' }],
        'display-md': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'display-sm': ['30px', { lineHeight: '38px', fontWeight: '700' }],
        'heading-lg': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'heading-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'heading-sm': ['18px', { lineHeight: '26px', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-xs': ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      borderRadius: {
        xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '16px', '2xl': '24px', '3xl': '32px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.06)',
        sm: '0 1px 6px rgba(0,0,0,0.08)',
        md: '0 4px 16px rgba(0,0,0,0.10)',
        lg: '0 8px 32px rgba(0,0,0,0.12)',
        xl: '0 16px 48px rgba(0,0,0,0.16)',
        brand: '0 8px 32px rgba(22,84,217,0.28)',
        'glow-hero': '0 0 80px rgba(22,84,217,0.20), 0 0 160px rgba(22,84,217,0.10)',
      },
      maxWidth: { content: '1280px', prose: '720px' },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
