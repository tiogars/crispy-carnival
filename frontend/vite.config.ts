import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks: (id) => {
          const normalizedId = id.replace(/\\/g, '/');

          if (!normalizedId.includes('node_modules')) {
            return undefined;
          }

          if (normalizedId.includes('@mui/')) {
            return 'vendor-mui';
          }

          if (normalizedId.includes('react-dom') || normalizedId.includes('/react/')) {
            return 'vendor-react';
          }

          if (normalizedId.includes('react-hook-form')) {
            return 'vendor-forms';
          }

          return 'vendor-misc';
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Allow reverse-proxy host headers in Docker dev mode.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/docs': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      }
    },
  },
  optimizeDeps: {
    // Don't hold HTTP responses while the dep crawler runs —
    // avoids long first-request timeouts behind a reverse proxy.
    holdUntilCrawlEnd: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    css: true,
    include: ['src/**/*.tests.ts', 'src/**/*.tests.tsx'],
  },
});
