/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#0E0B14',
        cream: '#FFF8F1',
        glow: { 50: '#FFF1EA', 100: '#FFE0D1', 300: '#FF9F7A', 500: '#FF5C39', 600: '#F2410F' },
        pop: { 300: '#FF8AD8', 500: '#FF3CAC', 600: '#E01E8F' },
        grape: { 300: '#B8A4FF', 500: '#7B5CFF', 700: '#4B2FD6' },
        lime: { 300: '#DFFF7A', 400: '#C8F542' },
      },
      boxShadow: {
        brutal: '4px 4px 0 0 #0E0B14',
        'brutal-lg': '6px 6px 0 0 #0E0B14',
        glow: '0 20px 60px -15px rgba(255,92,57,.45)',
      },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        blob: { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '33%': { transform: 'translate(30px,-40px) scale(1.1)' }, '66%': { transform: 'translate(-20px,20px) scale(.95)' } },
      },
      animation: { marquee: 'marquee 30s linear infinite', blob: 'blob 14s ease-in-out infinite' },
    },
  },
  plugins: [],
}
