import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        timeout: 10000,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Proxy error:', err.message);
          });
        },
      },
    },
  }
}) 