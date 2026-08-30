import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  preview: {
    allowedHosts: [
      'upbeat-enthusiasm-production-7e93.up.railway.app',
      'disciplined-upliftment-production-1149.up.railway.app'
    ]
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})