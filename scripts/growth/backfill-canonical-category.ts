import 'server-only'

/**
 * TASK-1288 — Backfill canonical category on existing grader_profiles.
 *
 * Two modes:
 *  - DETERMINISTIC (default): resolves the RAW `category` (the untrusted
 *    `organizations.industry` string) to a canonical node via `resolveCanonicalCategory`
 *    (HubSpot enum prior + taxonomy alias). Cheap, no LLM.
 *  - GROUNDED (`--grounded`): runs the brand_intelligence read (LLM over the site + entity)
 *    per profile → grounded candidate → cascade resolve. Resolves the free-text/null cases
 *    (Berel, Banco de Chile, Efeonce). Requires GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_ENABLED
 *    + GRADER_ENABLED + an LLM provider configured; degrades to deterministic otherwise.
 *
 * DRY-RUN by default; `--apply` writes. `--profile <public_id|profile_id>` filters one.
 *
 * Uso:
 *   set -a && source .env.local && set +a
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/backfill-canonical-category.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/backfill-canonical-category.ts --apply
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/backfill-canonical-category.ts --grounded --profile EO-GAVP-0014
 */

import {
  brandIntelligenceToGroundedCandidate,
  readBrandIntelligenceForProfile
} from '@/lib/growth/ai-visibility/brand-intelligence'
import { resolveCanonicalCategory } from '@/lib/growth/ai-visibility/taxonomy'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const APPLY = process.argv.includes('--apply')
const GROUNDED = process.argv.includes('--grounded')
const profileArgIdx = process.argv.indexOf('--profile')
const PROFILE_FILTER = profileArgIdx >= 0 ? process.argv[profileArgIdx + 1] : null

interface ProfileRow extends Record<string, unknown> {
  profile_id: string
  public_id: string | null
  brand_name: string
  website_url: string | null
  category: string | null
  category_node_id: string | null
}

const main = async (): Promise<void> => {
  const profiles = await runGreenhousePostgresQuery<ProfileRow>(
    `SELECT profile_id, public_id, brand_name, website_url, category, category_node_id
       FROM greenhouse_growth.grader_profiles
      WHERE status = 'active'
        AND ($1::text IS NULL OR public_id = $1 OR profile_id = $1)
      ORDER BY created_at ASC`,
    [PROFILE_FILTER]
  )

  console.log(
    `TASK-1288 backfill canonical category — mode: ${GROUNDED ? 'GROUNDED' : 'DETERMINISTIC'} / ${APPLY ? 'APPLY' : 'DRY-RUN'}`
  )
  console.log(`Profiles: ${profiles.length}\n`)

  const bySource: Record<string, number> = {}
  let updated = 0

  for (const profile of profiles) {
    let grounded: { nodeId: string | null; confidence: number } | null = null
    let fineCategory: string | null = null

    if (GROUNDED) {
      const read = await readBrandIntelligenceForProfile({
        profileId: profile.profile_id,
        brandName: profile.brand_name,
        websiteUrl: profile.website_url,
        hubspotIndustry: profile.category
      })

      grounded = brandIntelligenceToGroundedCandidate(read.snapshot)
      fineCategory = read.snapshot?.fineCategory ?? null

      if (read.status !== 'ok') {
        console.log(`   ${profile.public_id ?? profile.profile_id}  "${profile.brand_name}"  grounded=${read.status}`)
      }
    }

    const resolved = resolveCanonicalCategory({ industry: profile.category, groundedCandidate: grounded })

    bySource[resolved.source] = (bySource[resolved.source] ?? 0) + 1

    const flag = resolved.source === 'unknown' ? '⚠️ ' : '   '

    console.log(
      `${flag}${profile.public_id ?? profile.profile_id}  "${profile.brand_name}"  ` +
        `raw=${JSON.stringify(profile.category)} → ${resolved.nodeId} ` +
        `(${resolved.source}, conf ${resolved.confidence})${fineCategory ? ` · fine="${fineCategory}"` : ''}`
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
        [profile.profile_id, resolved.nodeId, resolved.label?.es ?? null, resolved.confidence, resolved.source]
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
