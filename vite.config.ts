import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        name: 'Reelrole',
        short_name: 'Reelrole',
        description: 'Roll for tonight.',
        theme_color: '#07060A',
        background_color: '#07060A',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*latin-wdth*.woff2', '**/*latin-wght*.woff2'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Catalogue: instant from cache, refreshed in the background.
            urlPattern: ({ url }) => url.pathname.startsWith('/catalogue/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'catalogue' },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'image.tmdb.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'tmdb-images',
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA ?? ''),
  },
  server: { host: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
