import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "@/..." means "src/...", so imports don't need long ../../ paths.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Forward every /api request to Spring Boot. The browser only ever talks to
    // localhost:5173, so the login cookie stays first-party (same site).
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
  },
  preview: {
    // Same forwarding for "pnpm preview" (the production build, used for offline testing).
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
  },
})
