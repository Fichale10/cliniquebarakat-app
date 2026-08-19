import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo.png', 'togo-regions.png'],
      manifest: {
        name: 'La Barakat — Pharmacie & Clinique Vétérinaire',
        short_name: 'La Barakat',
        description: 'Gestion de la pharmacie et clinique vétérinaire La Barakat — Lomé, Togo',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a1423',
        theme_color: '#166534',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2}'],
        // Les routes /api/* (fonctions serveur) ne doivent jamais être servies par le cache SPA
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Fonds de carte OpenStreetMap : cache 30 jours (carte utilisable hors ligne)
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
          {
            // Google Fonts éventuelles
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 3600 },
            },
          },
          // NOTE : les appels Supabase ne sont volontairement PAS mis en cache
          // (données temps réel + auth) — l'app a déjà son cache localStorage.
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        }
      }
    }
  }
})
