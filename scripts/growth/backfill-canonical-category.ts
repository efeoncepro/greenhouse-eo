import 'server-only'

/**
 * TASK-1288 Slice 2 — Backfill canonical category on existing grader_profiles.
 *
 * Resolves the RAW `category` (the untrusted `organizations.industry` string) to a
 * canonical taxonomy node + provenance via `resolveCanonicalCategory`, and reports
 * coverage (% resolved vs `unknown`, by source). DRY-RUN by default; `--apply` writes.
 *
 * Slice 2 is deterministic (HubSpot enum prior + taxonomy alias); the grounded
 * brand_intelligence read (Slice 4) re-runs this with higher-confidence candidates.
 *
 * Uso:
 *   set -a && source .env.local && set +a
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/backfill-canonical-category.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/backfill-canonical-category.ts --apply
 */

import { resolveCanonicalCategory } from '@/lib/growth/ai-visibility/taxonomy'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const APPLY = process.argv.includes('--apply')

interface ProfileRow extends Record<string, unknown> {
  profile_id: string
  public_id: string | null
  brand_name: string
  category: string | null
  category_node_id: string | null
}

const main = async (): Promise<void> => {
  const profiles = await runGreenhousePostgresQuery<ProfileRow>(
    `SELECT profile_id, public_id, brand_name, category, category_node_id
       FROM greenhouse_growth.grader_profiles
      WHERE status = 'active'
      ORDER BY created_at ASC`
  )

  console.log(`TASK-1288 backfill canonical category — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Active profiles: ${profiles.length}\n`)

  const bySource: Record<string, number> = {}
  let updated = 0

  for (const profile of profiles) {
    const resolved = resolveCanonicalCategory({ industry: profile.category })

    bySource[resolved.source] = (bySource[resolved.source] ?? 0) + 1

    const flag = resolved.source === 'unknown' ? '⚠️ ' : '   '

    console.log(
      `${flag}${profile.public_id ?? profile.profile_id}  "${profile.brand_name}"  ` +
        `raw=${JSON.stringify(profile.category)} → ${resolved.nodeId} ` +
        `(${resolved.source}, conf ${resolved.confidence})`
    )

    if (APPLY) {
      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_growth.grader_profiles
            SET category_node_id = $2,
                category_label = $3,
                category_confidence = $4,
                category_source = $5,
                updated_at = NOW()
          WHERE profile_id = $1`,
        [
          profile.profile_id,
          resolved.nodeId,
          resolved.label?.es ?? null,
          resolved.confidence,
          resolved.source
        ]
      )
      updated += 1
    }
  }

  const resolvedCount = profiles.length - (bySource.unknown ?? 0)
  const coverage = profiles.length > 0 ? Math.round((resolvedCount / profiles.length) * 100) : 0

  console.log('\n— Cobertura —')

  for (const [source, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${source}: ${count}`)
  }

  console.log(`  resueltos (≠ unknown): ${resolvedCount}/${profiles.length} (${coverage}%)`)

  if (APPLY) {
    console.log(`\nAPPLY completo: ${updated} perfiles actualizados.`)
  } else {
    console.log('\nDRY-RUN: sin cambios. Re-correr con --apply.')
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('FAIL:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
