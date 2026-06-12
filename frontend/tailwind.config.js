/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // support class-based dark mode
  theme: {
    extend: {
      colors: {
        slate: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
        },
        // status colors
        status: {
          green: '#22C55E',
          yellow: '#EAB308',
          red: '#EF4444',
          blue: '#3B82F6',
        }
      },
      animation: {
        pulseFast: 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
