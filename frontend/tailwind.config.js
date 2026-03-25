/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        st: {
          bgPrimary: 'rgb(var(--st-bg-primary))',
          bgSecondary: 'rgb(var(--st-bg-secondary))',
          sidebar: 'rgb(var(--st-sidebar))',
          card: 'rgb(var(--st-card))',
          cardLight: '#E8DFE2', 
          textPrimary: '#FFFFFF',
          textSecondary: 'rgb(var(--st-text-secondary))',
          accent: 'rgb(var(--st-accent))',
          buttonDark: 'rgb(var(--st-button-dark))',
          buttonFocus: 'rgb(var(--st-button-focus))'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
