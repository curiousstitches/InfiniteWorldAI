import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves from /<repo-name>/ — set BASE_PATH at build time:
//   VITE_BASE=/Infiniteworlds/ npm run build
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    proxy: {
      '/api':    'http://localhost:3001',
      '/models': 'http://localhost:3001',
    },
  },
  optimizeDeps: {
    include: ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/materials'],
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split the heavy 3D engine into its own chunk so the rest of the app loads fast.
        manualChunks: {
          babylon: ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/materials'],
        },
      },
    },
  },
  define: {
    // Inject build-time flag so the app knows it's running as a static demo.
    'import.meta.env.DEMO_MODE': JSON.stringify(process.env.DEMO_MODE === 'true'),
  },
});
