/**
 * Force re-materialize member_capacity_economics for all active members in the current period.
 * Usage: npx tsx scripts/refresh-member-capacity-economics.ts
 */
import process from 'node:process'
import { createRequire } from 'node:module'

// Stub server-only so we can import Next.js server modules from scripts
const _require = createRequire(import.meta.url)
_require('module').Module._cache[_require.resolve('server-only')] = { id: 'server-only', exports: {} }

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const main = async () => {
  const { ensureMemberCapacityEconomicsSchema } = await import('@/lib/member-capacity-economics/store')
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  // Dynamic import to avoid server-only check at parse time
  const projectionModule = await import('@/lib/sync/projections/member-capacity-economics')
  const { refreshMemberCapacityEconomicsForMember } = projectionModule

  await ensureMemberCapacityEconomicsSchema()

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)
  const year = match ? Number(match[1]) : new Date().getFullYear()
  const month = match ? Number(match[2]) : new Date().getMonth() + 1

  console.log(`=== Refreshing member_capacity_economics for ${year}-${String(month).padStart(2, '0')} ===\n`)

  const members = await runGreenhousePostgresQuery<{ member_id: string; display_name: string }>(
    `SELECT member_id, display_name FROM greenhouse_core.members WHERE active = TRUE ORDER BY display_name`
  )

  console.log(`Found ${members.length} active members\n`)

  let refreshed = 0
  let failed = 0

  for (const row of members) {
    try {
      const snapshot = await refreshMemberCapacityEconomicsForMember(row.member_id, { year, month })

      if (snapshot) {
        const oh = snapshot.directOverheadTarget + snapshot.sharedOverheadTarget
        console.log(`  ✓ ${row.display_name} — assigned=${snapshot.assignedHours}h, overhead=${oh}, loaded=${snapshot.loadedCostTarget ?? 'n/a'}`)
        refreshed++
      } else {
        console.log(`  ⊘ ${row.display_name} — no snapshot produced`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`  ✗ ${row.display_name} — ${msg.slice(0, 100)}`)
      failed++
    }
  }

  console.log(`\n=== Done: ${refreshed} refreshed, ${failed} failed, ${members.length - refreshed - failed} skipped ===`)
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
