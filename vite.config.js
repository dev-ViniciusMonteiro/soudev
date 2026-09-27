import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://script.google.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/submit$/, '/macros/s/AKfycbxwZyl4owjKNj0yck249o0K71T2gKHHGB85rmcmA0lWo1Zed6-Y6zERNgykeRFgmq9cCg/exec'),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
})
