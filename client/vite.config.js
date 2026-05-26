import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/models': 'http://localhost:3001',
    },
  },
  optimizeDeps: {
    include: ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/materials'],
  },
});
