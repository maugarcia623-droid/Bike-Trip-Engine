import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cadence — Inline PostCSS Tailwind config ensures live Vite dev server
// reloads design-system tokens immediately without Node ESM module cache staleness.
export default defineConfig({
  plugins: [react()],
server: {
allowedHosts: true,
},
  resolve: {
    alias: {
      '@phosphor-icons/react': path.resolve(__dirname, './src/components/icons'),
      '@/components/icons': path.resolve(__dirname, './src/components/icons'),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          darkMode: 'class',
          content: [
            './index.html',
            './src/**/*.{js,ts,jsx,tsx}',
          ],
          theme: {
            extend: {
              spacing: {
                '4.5': '1.125rem',
                '5.5': '1.375rem',
                '84': '21rem',
              },
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
                /* ── Personality Color System ── */
                moss: {
                  DEFAULT: '#494A22',
                  deep: '#494A22',
                  volt: '#F2F455',
                  light: '#FEFFAE',
                  tint: '#FFFFE4',
                },
                coral: {
                  DEFAULT: '#FD683E',
                  rust: '#862401',
                  light: '#FFC0AE',
                  tint: '#FFEAE4',
                },
                terracotta: {
                  DEFAULT: '#862401',
                  coral: '#FD683E',
                  light: '#FFC0AE',
                  tint: '#FFEAE4',
                },
                petrol: {
                  DEFAULT: '#445F6A',
                  ice: '#DBF1FE',
                  light: '#AEE1FF',
                  tint: '#E4F5FF',
                },
                ice: {
                  DEFAULT: '#DBF1FE',
                  sky: '#71CBFF',
                  tint: '#E4F5FF',
                },
                navy: {
                  DEFAULT: '#172540',
                  steel: '#92BAD4',
                  light: '#AEDFFF',
                  tint: '#E4F4FF',
                },
                steel: {
                  DEFAULT: '#92BAD4',
                  navy: '#172540',
                  light: '#AEDFFF',
                },
                pine: {
                  DEFAULT: '#343B29',
                  sage: '#B5C1AB',
                  lime: '#B1FF71',
                  tint: '#F0FFE4',
                },
                sage: {
                  DEFAULT: '#B5C1AB',
                  pine: '#343B29',
                  lime: '#D3FFAE',
                  tint: '#F0FFE4',
                },
                plum: {
                  DEFAULT: '#3C222D',
                  mauve: '#C1A1AE',
                  rose: '#FFAED0',
                  tint: '#FFE4EF',
                },
                mauve: {
                  DEFAULT: '#C1A1AE',
                  plum: '#3C222D',
                  rose: '#FFAED0',
                  tint: '#FFE4EF',
                },
                orchid: '#FDB4FD',
                buttercream: '#F8F8B8',
                espresso: '#28140B',
                saddle: '#6F422D',
                sand: '#ECE7E3',
                cobalt: '#146CFC',
              },
              borderRadius: {
                card: '2rem',       /* 32px — Primary borderless cards (16px inner pod + 16px p-4 = 32px) */
                pod: '1rem',        /* 16px — Nested sub-cards & pods */
                'sub-pod': '0.5rem',/* 8px — Nested elements inside pods */
              },
              fontFamily: {
                sans: ['ui-rounded', '-apple-system-rounded', '"SF Pro Rounded"', 'Nunito', 'Inter', 'sans-serif'],
                mono: ['ui-rounded', '-apple-system-rounded', '"SF Pro Rounded"', 'Nunito', 'Inter', 'sans-serif'],
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
                'beacon-coral': '0 0 14px 0 rgba(253, 104, 62, 0.45)',
                'beacon-cobalt': '0 0 14px 0 rgba(20, 108, 252, 0.45)',
                'beacon-sage': '0 0 14px 0 rgba(181, 193, 171, 0.45)',
                'beacon-mauve': '0 0 14px 0 rgba(193, 161, 174, 0.45)',
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
        }),
        autoprefixer(),
      ],
    },
  },
});
