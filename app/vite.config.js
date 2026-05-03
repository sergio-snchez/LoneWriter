import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
// Force Vite restart to pick up version 1.9.0

export default defineConfig({
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    nodePolyfills({ include: ['buffer', 'stream', 'zlib', 'crypto', 'path', 'http', 'https', 'fs', 'os', 'util', 'assert', 'events', 'process', 'url'] }),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000 // Aumentar límite a 30MB para el bundle de WASM
      },
      devOptions: {
        enabled: false
      },
      manifest: {
        name: 'LoneWriter',
        short_name: 'LoneWriter',
        description: 'Your intelligent companion for writing novels',
        theme_color: '#1a1a1f',
        background_color: '#1a1a1f',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
