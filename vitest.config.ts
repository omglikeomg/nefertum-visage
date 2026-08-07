import { defineConfig } from 'vitest/config';

// R34 — kept separate from vite.config.ts so the Tailwind asset pipeline and
// the test runner configuration stay independently readable.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['apps/web-bff/src/**/*.spec.ts', 'apps/web-bff/tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['apps/web-bff/src/**'],
    },
  },
});
