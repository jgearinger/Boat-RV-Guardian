import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // A service worker is harmful in the native (Tauri/Capacitor) app: assets are already served
    // locally, and the SW's precache served STALE chunks across app updates (new dynamic imports
    // like shellyBle 404'd against an old cached index.html). selfDestroying ships a worker that
    // unregisters any previously-installed SW and clears its caches, then removes itself.
    VitePWA({
      selfDestroying: true,
    })
  ],
  base: './',
  build: {
    outDir: 'dist'
  }
})
