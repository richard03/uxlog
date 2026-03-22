import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const isTauri = !!process.env.TAURI_ENV_PLATFORM

export default defineConfig({
  plugins: [vue()],
  base: isTauri ? '/' : '/',

  server: {
    strictPort: true,
  },

  envPrefix: ['VITE_', 'TAURI_ENV_'],
})
