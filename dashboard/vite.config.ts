import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}']
      },
      manifest: {
        name: 'Boat & Rv Guardian',
        short_name: 'Guardian',
        description: 'A smart dashboard for using LinkTap as a burst pipe auto-shutoff system.',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'app_icon_192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'app_icon_512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: './',
  build: {
    outDir: 'dist'
  }
})
