/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff4ed',
          100: '#ffe4d2',
          200: '#ffc49f',
          300: '#ffa06b',
          400: '#fb8142',
          500: '#f56c35',
          600: '#dd5220',
          700: '#af2d0a',
          800: '#7a2008',
          900: '#451205',
        },
      },
      fontFamily: {
        display: ['Roboto Slab', 'serif'],
        sans: ['Barlow', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
