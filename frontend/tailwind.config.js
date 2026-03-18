/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        skwap: {
          bgPrimary: 'rgb(var(--skwap-bg-primary))',
          bgSecondary: 'rgb(var(--skwap-bg-secondary))',
          sidebar: 'rgb(var(--skwap-sidebar))',
          card: 'rgb(var(--skwap-card))',
          cardLight: '#E8DFE2', // Keep static for now as it's for light cards
          textPrimary: '#FFFFFF',
          textSecondary: 'rgb(var(--skwap-text-secondary))',
          accent: 'rgb(var(--skwap-accent))',
          buttonDark: 'rgb(var(--skwap-button-dark))',
          buttonFocus: 'rgb(var(--skwap-button-focus))'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
