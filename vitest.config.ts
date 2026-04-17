import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx',
      'scripts/**/*.test.ts',
      'scripts/**/*.test.tsx',
      'scripts/**/*.spec.ts',
      'scripts/**/*.spec.tsx',
      'services/**/*.test.ts',
      'services/**/*.spec.ts'
    ],
    setupFiles: ['src/test/setup.ts'],

    // Raised from Vitest default (5s) to give React component suites headroom
    // under v8 coverage instrumentation on GitHub runners. Multi-step dialog/form
    // tests in `pnpm test:coverage` were exceeding 5s in CI while passing locally
    // (ISSUE-052). 15s still catches genuinely hung tests.
    testTimeout: 15000,
    hookTimeout: 15000,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: path.resolve(__dirname, 'artifacts/coverage')
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/@core'),
      '@layouts': path.resolve(__dirname, 'src/@layouts'),
      '@menu': path.resolve(__dirname, 'src/@menu'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@configs': path.resolve(__dirname, 'src/configs'),
      '@views': path.resolve(__dirname, 'src/views')
    }
  }
})
