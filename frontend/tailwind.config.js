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
          bgPrimary: '#4D3B43',
          bgSecondary: '#35252A',
          sidebar: '#58474D',
          card: '#604C53',
          cardLight: '#E8DFE2', // For the login/landing cards
          textPrimary: '#FFFFFF',
          textSecondary: '#C8B9BF',
          accent: '#A47F8B',
          buttonDark: '#4A3B40',
          buttonFocus: '#6D565D'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
