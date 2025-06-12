import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: API_BASE_URL,
        changeOrigin: true,
        secure: false,
      },
    },
    cors: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
}); 