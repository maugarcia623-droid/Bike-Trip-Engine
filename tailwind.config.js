/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        '4.5': '1.125rem', /* 18px — Industry standard minimum UI size step */
        '5.5': '1.375rem',
        '84': '21rem',
      },
      /* Rounded data/headers are set in 700/800 (SF Pro Rounded 700/800, Nunito 600/700/800) */
      fontWeight: {
        semibold: '700',
        bold: '800',
        extrabold: '800',
      },
      colors: {
        canvas: 'rgb(var(--ds-canvas) / <alpha-value>)',
        well: 'rgb(var(--ds-well) / <alpha-value>)',
        card: 'rgb(var(--ds-card) / <alpha-value>)',
        pod: 'rgb(var(--ds-pod) / <alpha-value>)',
        chip: {
          DEFAULT: 'rgb(var(--ds-chip) / <alpha-value>)',
          hover: 'rgb(var(--ds-chip-hover) / <alpha-value>)',
        },
        elevated: 'rgb(var(--ds-elevated) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--ds-ink) / <alpha-value>)',
          secondary: 'rgb(var(--ds-ink-secondary) / <alpha-value>)',
          muted: 'rgb(var(--ds-ink-muted) / <alpha-value>)',
          inverse: 'rgb(var(--ds-ink-inverse) / <alpha-value>)',
        },
        volt: {
          DEFAULT: '#F2F455',
          dim: '#E2E442',
          lime: '#CAF164',
        },
        beacon: {
          red: '#FF3B30',
          orange: '#D94814',
          amber: '#F59E0B',
          lime: '#CAF164',
          green: '#3D9A00',
        },
      },
      borderRadius: {
        card: '2rem',       /* 32px — Primary borderless cards (16px inner pod + 16px padding = 32px) */
        pod: '1rem',        /* 16px — Nested sub-cards & pods */
        'sub-pod': '0.5rem',/* 8px — Nested elements inside pods when padding is 8px (8px + 8px = 16px) */
      },
      fontFamily: {
        /* Rounded voice (data, metrics, labels & headers): SF Pro Rounded on Mac, Nunito cross-platform fallback */
        sans: ['ui-rounded', '-apple-system-rounded', '"SF Pro Rounded"', 'Nunito', 'Inter', 'sans-serif'],
        mono: ['ui-rounded', '-apple-system-rounded', '"SF Pro Rounded"', 'Nunito', 'Inter', 'sans-serif'],
        /* Inter: comfortable reading text — paragraphs, placeholders, buttons, inputs */
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '3px',
      },
      boxShadow: {
        'beacon-volt': '0 0 12px 0 rgba(242, 244, 85, 0.45)',
        'beacon-lime': '0 0 12px 0 rgba(202, 241, 100, 0.45)',
        'beacon-amber': '0 0 12px 0 rgba(245, 158, 11, 0.45)',
        'beacon-red': '0 0 12px 0 rgba(255, 59, 48, 0.5)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(3px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'beacon-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'beacon-pulse': 'beacon-pulse 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
