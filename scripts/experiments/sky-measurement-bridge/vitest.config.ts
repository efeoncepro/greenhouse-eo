import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const localSocket = process.env.SKY_BRIDGE_LOCAL_SOCKET ?? ''

if (!/^\/tmp\/sky-2094-[\w-]+\/socket$/.test(localSocket) ||
  process.env.SKY_BRIDGE_EMPTY_ENV !== localSocket.replace(/\/socket$/, '/empty-env')) {
  throw new Error('Private runner configuration required before loading any environment files')
}

const here = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  envDir: process.env.SKY_BRIDGE_EMPTY_ENV,
  resolve: { alias: {
    '@': fileURLToPath(new URL('../../../src', import.meta.url)),
    'server-only': `${here}empty.ts`
  } },
  test: {
    environment: 'node', fileParallelism: false, maxWorkers: 1,
    include: ['scripts/experiments/sky-measurement-bridge/*.local-spec.ts'],
    setupFiles: [`${here}setup.ts`], testTimeout: 15_000, hookTimeout: 30_000,
    reporters: ['default', 'json'], outputFile: { json: '.captures/sky-2094-results.json' }
  }
})
