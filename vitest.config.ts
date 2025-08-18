import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./packages/testing/src/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/.next/**',
        '**/generated/**',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/src/index.ts', // Barrel exports
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@repo/testing': path.resolve(__dirname, './packages/testing/src'),
      '@repo/core': path.resolve(__dirname, './packages/core/src'),
      '@repo/types': path.resolve(__dirname, './packages/types/src'),
      '@repo/ui': path.resolve(__dirname, './packages/ui/src'),
    },
  },
})