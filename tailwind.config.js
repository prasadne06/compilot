/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      colors: {
        ink: {
          50: '#f7f7f5', 100: '#efeeea', 200: '#e2e0da', 300: '#c9c6bd', 400: '#9a968b',
          500: '#6f6b61', 600: '#545048', 700: '#3d3a34', 800: '#26241f', 900: '#171612',
        },
        pine: {
          50: '#eef6f3', 100: '#d5eae2', 200: '#abd4c5', 300: '#78b7a2', 400: '#4b977f',
          500: '#2f7b64', 600: '#226350', 700: '#1c4f41', 800: '#183f35', 900: '#12302a',
        },
        good: { bg: '#e9f5ee', fg: '#1d6b40', bd: '#b9dfc8' },
        caution: { bg: '#fbf4dc', fg: '#7a5a00', bd: '#ecd894' },
        serious: { bg: '#fdeedf', fg: '#9a4a0b', bd: '#f3c79c' },
        critical: { bg: '#fcebea', fg: '#a1281f', bd: '#f1bdb8' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,22,18,0.04), 0 1px 1px rgba(23,22,18,0.03)',
        lift: '0 8px 24px -8px rgba(23,22,18,0.12), 0 2px 4px rgba(23,22,18,0.04)',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'none' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
      },
      animation: { fadeUp: 'fadeUp .35s ease-out both', shimmer: 'shimmer 1.4s linear infinite' },
    },
  },
  plugins: [],
}
