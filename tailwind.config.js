/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        paper: '#F7F6F2',
        sand: '#EFECE4',
        line: '#E4E1D8',
        ink: { DEFAULT: '#15171A', soft: '#3A3E44', muted: '#6B7077' },
        brand: { 50: '#EEF3EF', 100: '#DCE7DF', 200: '#B7CDBE', 500: '#2F6B52', 600: '#245A44', 700: '#1C4635', 900: '#10291F' },
        clay: { 50: '#FBF1EA', 500: '#C2703D', 600: '#A85C2F' },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(21,23,26,.04), 0 4px 16px -4px rgba(21,23,26,.06)',
        lift: '0 2px 4px rgba(21,23,26,.04), 0 16px 40px -12px rgba(21,23,26,.14)',
      },
      borderRadius: { '4xl': '2rem' },
      letterSpacing: { tightest: '-0.035em' },
    },
  },
  plugins: [],
}
