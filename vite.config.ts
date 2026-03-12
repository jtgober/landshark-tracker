import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['landsharks-logo.png', 'vite.svg'],
      manifest: {
        name: 'Shark Tracker',
        short_name: 'Shark Tracker',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#006d77',
        icons: [
          {
            src: '/landsharks-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[^/]+\/api\/(events|members|activity)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60,
              },
              networkTimeoutSeconds: 3,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/[a-c]\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
})
