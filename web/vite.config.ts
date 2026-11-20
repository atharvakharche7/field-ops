/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Makes the site a PWA: a manifest (name, icons, colours) so it can be installed to the
    // home screen, and a service worker that caches the app's own files so it opens offline.
    VitePWA({
      registerType: 'autoUpdate', // a new version is picked up on the next visit, no "update?" prompt
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'FieldOps',
        lang: 'en-IN',
        short_name: 'FieldOps',
        description: 'Field service tickets for network technicians and supervisors.',
        start_url: '/',
        scope: '/',
        display: 'standalone', // opens full-screen, without the browser's address bar
        orientation: 'portrait',
        theme_color: '#171717',
        background_color: '#ffffff',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          // "maskable": Android may crop icons to a circle or squircle; this one has room to spare.
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache only the app shell (HTML, JS, CSS, fonts, icons), never /api responses.
        // Offline data lives in one place only: IndexedDB, managed by our own code.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Any page URL (/tickets/12...) gets index.html from the cache, and React Router takes over.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//], // never let the service worker answer API calls
      },
      // The service worker is off in "pnpm dev". Test offline with "pnpm build && pnpm preview".
    }),
  ],
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
  test: {
    // Unit tests run in Node. fake-indexeddb (imported in the tests) stands in for the browser's IndexedDB.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
