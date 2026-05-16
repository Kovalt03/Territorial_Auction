import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': process.env.API_TARGET ?? 'http://localhost:8080',
      '/ws': { target: process.env.WS_TARGET ?? 'ws://localhost:8080', ws: true },
    },
  },
})
