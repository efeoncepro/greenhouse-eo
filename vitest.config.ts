import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts']
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
