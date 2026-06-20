import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
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
        name: 'Boat & RV Guardian',
        short_name: 'Guardian',
        description: 'A smart dashboard for using LinkTap as a burst pipe auto-shutoff system.',
        theme_color: '#0d1527',
        background_color: '#0a0f1d',
        display: 'standalone',
        start_url: './',
        icons: [
          {
            src: 'app_icon.jpg',
            sizes: '1024x1024',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app/index.html')
      }
    }
  }
})
