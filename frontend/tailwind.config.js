/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Deep Maroon/Burgundy (traditional wedding)
        maroon: {
          50: '#fdf2f2',
          100: '#fce4e4',
          200: '#fbcdcd',
          300: '#f7a3a3',
          400: '#f06b6b',
          500: '#e53e3e',
          600: '#c53030',
          700: '#9b2c2c',
          800: '#8B0000',
          900: '#5C0000',
        },
        // Secondary - Gold (auspicious)
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#D4AF37',
          600: '#B8860B',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
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
        cream: '#FFF8E7',
        ivory: '#FFFFF0',
        brown: {
          500: '#5D4037',
          600: '#4E342E',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Poppins', 'sans-serif'],
        script: ['Great Vibes', 'cursive'],
      },
      backgroundImage: {
        'mandala-pattern': "url('/images/mandala-pattern.svg')",
        'paisley-border': "url('/images/paisley-border.svg')",
      },
    },
  },
  plugins: [],
}
