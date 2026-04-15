import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Allow reverse-proxy host headers in Docker dev mode.
    allowedHosts: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    css: true,
    include: ['src/**/*.tests.ts', 'src/**/*.tests.tsx'],
  },
});
