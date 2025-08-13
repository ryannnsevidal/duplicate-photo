import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    // ✅ do NOT run Playwright specs in Vitest
    exclude: [
      'node_modules/**',
      'e2e/**',
      'tests/**',       // your Playwright suites live here
      'dist/**',
    ],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['**/tests/**', '**/e2e/**'],
    },
  },
});
