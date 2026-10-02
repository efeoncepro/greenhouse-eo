/** TASK-1863. Read-only by default. --apply explicitly opts into one atomic primary backfill. */
import { loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { query, withTransaction, closeGreenhousePostgres } from '../../src/lib/db'
import { resolveGrowthMarket } from '../../src/lib/growth/markets'
import { getGraderProfile } from '../../src/lib/growth/ai-visibility/store'
import { ensurePrimaryMarket } from '../../src/lib/growth/ai-visibility/markets/store'

async function main() {
  loadGreenhouseToolEnv()

  const profiles = await query<{ profile_id: string; organization_id: string | null; market: string; locale: string }>(
    `SELECT profile_id,organization_id,market,locale FROM greenhouse_growth.grader_profiles WHERE status='active' ORDER BY profile_id`
  )

  const unresolved: string[] = []
  const seen = new Set<string>()
  const duplicateOrganizations = new Set<string>()

  for (const profile of profiles) {
    try {
      resolveGrowthMarket(profile.market, profile.locale)
    } catch {
      unresolved.push(profile.profile_id)
    }

    if (profile.organization_id && seen.has(profile.organization_id))
      duplicateOrganizations.add(profile.organization_id)
    if (profile.organization_id) seen.add(profile.organization_id)
  }

  console.log(
    JSON.stringify(
      {
        mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
        profiles: profiles.length,
        unresolved,
        organizationsWithMultipleLegacyProfiles: [...duplicateOrganizations],
        historicalRuns: 'preserved_without_inferred_geography'
      },
      null,
      2
    )
  )

  if (unresolved.length) {
    process.exitCode = 1

    return
  }

  if (!process.argv.includes('--apply')) return

  const result = await withTransaction(async client => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('growth.ai_visibility.market-backfill'))`)
    let created = 0

    for (const row of profiles) {
      const profile = await getGraderProfile(row.profile_id, client)

      if (!profile) throw new Error('backfill_profile_disappeared')

      const before = await client.query('SELECT 1 FROM greenhouse_growth.grader_profile_markets WHERE profile_id=$1', [
        row.profile_id
      ])

      await ensurePrimaryMarket(profile, client)
      if (!before.rows.length) created++
    }

    const missing =
      await client.query(`SELECT p.profile_id FROM greenhouse_growth.grader_profiles p WHERE p.status='active' AND NOT EXISTS
      (SELECT 1 FROM greenhouse_growth.grader_profile_markets m WHERE m.profile_id=p.profile_id AND m.is_primary AND m.status='active')`)

    if (missing.rows.length) throw new Error('backfill_primary_missing')

    return { verifiedProfiles: profiles.length, created }
  })

  console.log(JSON.stringify({ applied: true, ...result }))
}

main()
  .catch(error => {
    console.error(JSON.stringify({ error: 'grader_market_backfill_failed', code: typeof error?.code === 'string' ? error.code : null, constraint: typeof error?.constraint === 'string' ? error.constraint : null }))
    process.exitCode = 1
  })
  .finally(() => closeGreenhousePostgres())
