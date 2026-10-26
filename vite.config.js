import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/food_tracker/',
  server: {
    proxy: {
      '/food_tracker/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/food_tracker/admin': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/food_tracker/bills': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
