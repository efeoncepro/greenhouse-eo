import process from 'node:process'

require('module')._cache[require.resolve('server-only')] = { id: 'server-only', exports: {}, loaded: true }

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

async function run() {
  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('@/lib/postgres/client')

  try {
    const rows = await runGreenhousePostgresQuery<{
      proposal_id: string
      source_object_id: string
      source_display_name: string | null
      candidate_member_id: string | null
      candidate_display_name: string | null
      match_confidence: string
      match_signals: any
      status: string
      occurrence_count: number
    }>(`
      SELECT proposal_id, source_object_id, source_display_name,
             candidate_member_id, candidate_display_name,
             match_confidence::TEXT, match_signals, status, occurrence_count
      FROM greenhouse_sync.identity_reconciliation_proposals
      ORDER BY occurrence_count DESC
    `)

    console.log(`\n${rows.length} proposals in database:\n`)

    for (const r of rows) {
      const signals = Array.isArray(r.match_signals)
        ? r.match_signals.map((s: any) => s.signal).join(', ')
        : ''

      console.log(
        `  [${r.status}] ${r.source_display_name || r.source_object_id.slice(0, 8) + '...'}` +
        `  →  ${r.candidate_display_name || '(no match)'}` +
        `  (conf: ${r.match_confidence}, tasks: ${r.occurrence_count})` +
        (signals ? `  signals: ${signals}` : '')
      )
    }
  } finally {
    await closeGreenhousePostgres()
  }
}

run().catch(err => { console.error(err); process.exitCode = 1 })
