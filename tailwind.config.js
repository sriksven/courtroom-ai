/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
      colors: {
        court: {
          wood: '#8B4513',
          dark: '#1a1008',
          gold: '#C9A84C',
          red: '#8B1A1A',
          parchment: '#F5F0E8',
        },
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gavel': 'gavel 0.3s ease-in-out',
      },
    },
  },
  plugins: [],
}
