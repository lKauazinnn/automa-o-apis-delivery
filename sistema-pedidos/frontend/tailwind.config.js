/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tema escuro + dourado, fiel à tela capturada do Delivery Integrator.
        ink: { 950: '#0a0a0c', 900: '#0f0f12', 850: '#141417', 800: '#191a1e', 750: '#1f2024' },
        line: '#27272c',
        gold: { DEFAULT: '#e0a44c', 600: '#cf9440', 400: '#ecbf76' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'] },
    },
  },
  plugins: [],
}
