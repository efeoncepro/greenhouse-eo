/**
 * Backfill: ensure all active client_team_assignments have corresponding
 * person_memberships via the spaces bridge.
 *
 * Usage: npx tsx scripts/backfill-assignment-memberships.ts
 */
import process from 'node:process'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)
_require('module').Module._cache[_require.resolve('server-only')] = { id: 'server-only', exports: {} }

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const { syncAssignmentToMembership } = await import('@/lib/sync/projections/assignment-membership-sync')

  console.log('=== Backfilling assignment → membership sync ===\n')

  const assignments = await runGreenhousePostgresQuery<{
    member_id: string
    client_id: string
    display_name: string
    client_name: string | null
  }>(
    `SELECT DISTINCT a.member_id, a.client_id, m.display_name,
            c.client_name
     FROM greenhouse_core.client_team_assignments a
     JOIN greenhouse_core.members m ON m.member_id = a.member_id
     LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
     WHERE a.active = TRUE
       AND m.active = TRUE
       AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
       AND COALESCE(NULLIF(LOWER(TRIM(a.client_id)), ''), '__missing__')
           NOT IN ('efeonce_internal', 'client_internal', 'space-efeonce')
     ORDER BY m.display_name, c.client_name`
  )

  console.log(`Found ${assignments.length} active external assignments\n`)

  let created = 0
  let skipped = 0
  let nobridge = 0

  for (const row of assignments) {
    try {
      const result = await syncAssignmentToMembership(row.member_id, row.client_id)

      if (result) {
        console.log(`  ✓ ${row.display_name} → ${row.client_name || row.client_id} (${result})`)
        created++
      } else {
        console.log(`  ⊘ ${row.display_name} → ${row.client_name || row.client_id} (no space bridge)`)
        nobridge++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`  ✗ ${row.display_name} → ${row.client_name || row.client_id}: ${msg.slice(0, 100)}`)
      skipped++
    }
  }

  console.log(`\n=== Done: ${created} synced, ${nobridge} no bridge, ${skipped} errors ===`)
}

main()
  .catch(error => {
    console.error('Fatal:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    const { closeGreenhousePostgres } = await import('@/lib/postgres/client')
    await closeGreenhousePostgres()
  })
