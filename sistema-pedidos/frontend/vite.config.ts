import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Porta fixa própria (o viewer antigo usa 5173) pra não confundir.
  server: { port: 5180, strictPort: true },
})
