import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      // Replace the real Tauri API with a safe no-op shim so the bundle
      // never references window.__TAURI_INTERNALS__ — which crashes Capacitor/Android.
      // The actual Tauri invocation happens via a guarded dynamic import at runtime.
      '@tauri-apps/api/core': path.resolve(__dirname, 'src/tauri-shim.ts'),
    },
  },
})

