import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@wedding-planner/shared': path.resolve(__dirname, '../shared/src/index.ts'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Wedding subdomains in dev, no /etc/hosts needed: *.localtest.me resolves
    // publicly to 127.0.0.1 and is a real registrable domain, so it can carry
    // the cross-subdomain session cookie (see utils/tenant.ts). Plain
    // localhost stays path-scoped — that's the preview-deployment fallback.
    allowedHosts: ['.localtest.me'],
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
