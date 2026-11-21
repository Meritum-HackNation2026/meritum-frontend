import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `pnpm dev` proxies /api to the backend: uvicorn on :8000, or a deployed API with
// API_PROXY=https://meritum-dev.gburek.app pnpm dev
export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    proxy: {
      '/api': { target: process.env.API_PROXY ?? 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})
