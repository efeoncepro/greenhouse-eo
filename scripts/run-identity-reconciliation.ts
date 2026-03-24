import { createRequire } from 'node:module'
import process from 'node:process'

// Bypass 'server-only' guard for CLI execution
const require = createRequire(import.meta.url)

const moduleWithCache = require('module') as {
  _cache: Record<string, { id: string; exports: Record<string, never>; loaded?: boolean }>
}

moduleWithCache._cache[require.resolve('server-only')] = { id: 'server-only', exports: {}, loaded: true }

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const main = async () => {
  const { runIdentityReconciliation } = await import('@/lib/identity/reconciliation/reconciliation-service')
  const { closeGreenhousePostgres } = await import('@/lib/postgres/client')

  try {
    const dryRun = process.argv.includes('--dry-run')

    console.log(`Running identity reconciliation (dryRun=${dryRun})...\n`)

    const result = await runIdentityReconciliation({ dryRun })

    console.log('\n=== Reconciliation Result ===')
    console.log(`  Sync Run ID:       ${result.syncRunId}`)
    console.log(`  Discovered:        ${result.discoveredCount}`)
    console.log(`  Already Linked:    ${result.alreadyLinkedCount}`)
    console.log(`  Auto-Linked:       ${result.autoLinkedCount}`)
    console.log(`  Pending Review:    ${result.pendingReviewCount}`)
    console.log(`  No Match:          ${result.noMatchCount}`)
    console.log(`  Errors:            ${result.errors.length}`)
    console.log(`  Duration:          ${result.durationMs}ms`)

    if (result.errors.length > 0) {
      console.log('\nErrors:')
      result.errors.forEach(e => console.log(`  - ${e}`))
    }
  } finally {
    await closeGreenhousePostgres()
  }
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
