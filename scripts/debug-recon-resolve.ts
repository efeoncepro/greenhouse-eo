import { createRequire } from 'node:module'
import process from 'node:process'

const require = createRequire(import.meta.url)

const moduleWithCache = require('module') as {
  _cache: Record<string, { id: string; exports: Record<string, never>; loaded?: boolean }>
}

moduleWithCache._cache[require.resolve('server-only')] = { id: 'server-only', exports: {}, loaded: true }

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

async function run() {
  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('@/lib/postgres/client')

  const action = process.argv[2] // 'dismiss' | 'approve' | 'reject'
  const nameFilter = process.argv[3] // partial name match

  if (!action || !nameFilter) {
    console.log('Usage: npx tsx scripts/debug-recon-resolve.ts <dismiss|reject> <name-substring>')
    process.exit(1)
  }

  const statusMap: Record<string, string> = {
    dismiss: 'dismissed',
    reject: 'admin_rejected',
    approve: 'admin_approved'
  }

  const newStatus = statusMap[action]

  if (!newStatus) {
    console.log('Invalid action. Use: dismiss, reject, approve')
    process.exit(1)
  }

  try {
    const rows = await runGreenhousePostgresQuery<{ proposal_id: string; source_display_name: string }>(`
      UPDATE greenhouse_sync.identity_reconciliation_proposals
      SET status = $1, resolved_by = 'cli', resolved_at = NOW(), resolution_note = $2
      WHERE status = 'pending' AND LOWER(source_display_name) LIKE $3
      RETURNING proposal_id, source_display_name
    `, [newStatus, `CLI ${action} via script`, `%${nameFilter.toLowerCase()}%`])

    if (rows.length === 0) {
      console.log(`No pending proposals matched "${nameFilter}"`)
    } else {
      for (const r of rows) {
        console.log(`  ${action}: ${r.source_display_name} (${r.proposal_id})`)
      }
    }
  } finally {
    await closeGreenhousePostgres()
  }
}

run().catch(err => { console.error(err); process.exitCode = 1 })
