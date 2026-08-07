import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

// Vite is used for the Tailwind v4 asset pipeline only — the Express BFF is a
// separate process (`npm run dev:server`). The `server` block below satisfies
// R3/E5 (bind 0.0.0.0:3001 so the dev server is reachable from Docker/WSL).
//
// NOTE: Express also listens on 3001 (R6/AC1). The two dev servers are not
// intended to run simultaneously; see the plan amendments for the proposed
// reconciliation (Vite on 5173 for asset HMR).
export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3001,
  },
  build: {
    outDir: 'dist/static',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'apps/web-bff/public/styles/main.css'),
    },
  },
});
