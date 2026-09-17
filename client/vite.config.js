import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The HEIC converter chunk is ~3MB, but it is lazy-loaded only for iPhone photos
    chunkSizeWarningLimit: 3500,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
