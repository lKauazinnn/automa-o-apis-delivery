/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Sem escala de cor de marca aqui: a cor de destaque é da empresa cliente (white-label) e
      // chega em tempo de execução — use C.marca no JSX ou var(--marca) no CSS.
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      // Cantos do design system PausaFast: mais retos que o padrão do Tailwind, cara de
      // ferramenta de operação. Redefinir a escala muda o app inteiro sem tocar nas telas.
      borderRadius: {
        md: '5px',
        lg: '7px',
        xl: '9px',
        '2xl': '12px',
      },
    },
  },
  plugins: [],
}
