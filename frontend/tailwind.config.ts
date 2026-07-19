import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary - Deep Maroon/Burgundy (traditional wedding)
        maroon: {
          50: '#faf0f0',
          100: '#f3dede',
          200: '#e5bfc2',
          300: '#ce8f96',
          400: '#b25e6a',
          500: '#97404e',
          600: '#7f2d3b',
          700: '#74232f',
          800: '#6b1f2a',
          900: '#4a121a',
        },
        // Secondary - Gold (auspicious)
        gold: {
          50: '#faf5e8',
          100: '#f3ead1',
          200: '#e7d6a8',
          300: '#d6bc78',
          400: '#c4a55a',
          500: '#b08d3e',
          600: '#8c6d2f',
          700: '#6f551f',
          800: '#5a4519',
          900: '#3d2e10',
        },
        // Accent - Saffron Orange (holy)
        saffron: {
          400: '#FF8F00',
          500: '#FF6F00',
          600: '#E65100',
        },
        // Tertiary - Deep Pink (festive)
        festive: {
          300: '#F48FB1',
          500: '#E91E63',
          700: '#C2185B',
        },
        // Neutral
        cream: '#FAF6EF',
        ivory: '#FFFFF0',
        brown: {
          500: '#5D4037',
          600: '#4E342E',
        },
        // Token-bound semantic colors (var()-backed — no opacity modifiers)
        bride: {
          DEFAULT: 'var(--bride)',
          deep: 'var(--bride-deep)',
          soft: 'var(--bride-soft)',
          line: 'var(--bride-line)',
        },
        groom: {
          DEFAULT: 'var(--groom)',
          deep: 'var(--groom-deep)',
          soft: 'var(--groom-soft)',
          line: 'var(--groom-line)',
        },
        ink: {
          high: 'var(--ink-high)',
          mid: 'var(--ink-mid)',
          low: 'var(--ink-low)',
          dim: 'var(--ink-dim)',
        },
        surface: {
          page: 'var(--bg-page)',
          panel: 'var(--bg-panel)',
          raised: 'var(--bg-raised)',
          highest: 'var(--bg-highest)',
        },
        line: {
          soft: 'var(--line-soft)',
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '14px',
        xl: '22px',
        '2xl': '22px',
        full: '9999px',
      },
      // Do not change — src/site/* templates depend on font-display/font-body.
      // Admin panel headings use the CSS `--font-display` var (.display, .page-title, etc.) instead.
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        'serif-display': ['Cormorant Garamond', 'serif'],
        body: ['Poppins', 'sans-serif'],
        script: ['Dancing Script', 'cursive'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'mandala-pattern': "url('/images/mandala-pattern.svg')",
        'paisley-border': "url('/images/paisley-border.svg')",
      },
    },
  },
  plugins: [],
} satisfies Config;
