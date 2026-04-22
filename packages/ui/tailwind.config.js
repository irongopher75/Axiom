/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        axiom: {
          orange: '#FF6600',
          green: '#00FF41',
          red: '#FF2244',
          cyan: '#00CCFF',
          amber: '#FFCC00',
        }
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['IBM Plex Sans Condensed', 'sans-serif'],
      },
      animation: {
        'price-flash-up': 'price-flash-up 0.3s ease-out',
        'price-flash-down': 'price-flash-down 0.3s ease-out',
        'reveal-logo': 'reveal-logo 1.5s cubic-bezier(0.77, 0, 0.175, 1) forwards',
      },
      keyframes: {
        'price-flash-up': {
          '0%': { backgroundColor: 'rgba(0, 255, 65, 0.2)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'price-flash-down': {
          '0%': { backgroundColor: 'rgba(255, 34, 68, 0.2)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'reveal-logo': {
          '0%': { transform: 'scale(0.8)', opacity: '0', filter: 'blur(10px)' },
          '100%': { transform: 'scale(1)', opacity: '1', filter: 'blur(0)' },
        }
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}
