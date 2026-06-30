import 'server-only'

/**
 * TASK-1289 — Backfill business_model on existing grader_profiles.
 *
 * Two modes:
 *  - DETERMINISTIC (default): classifies from the already-resolved `category_node_id` via the
 *    conservative category heuristic (`classifyBusinessModel`). Cheap, no LLM. Ambiguous
 *    categories → `unknown` (honest).
 *  - GROUNDED (`--grounded`): reads the EXISTING active brand_intelligence snapshot (no LLM cost —
 *    the snapshot already carries `candidate_business_model` from the TASK-1288 grounded read) and
 *    derives the model from it; falls back to the category heuristic when there is no snapshot.
 *
 * The backfill writes the `business_model` columns AND appends an audit row to
 * `grader_business_model_history` (provenance preserved). DRY-RUN by default; `--apply` writes.
 * `--profile <public_id|profile_id>` filters one.
 *
 * Uso:
 *   set -a && source .env.local && set +a
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/backfill-business-model.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/backfill-business-model.ts --apply
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/backfill-business-model.ts --grounded --apply
 */

import { getActiveBrandIntelligence } from '@/lib/growth/ai-visibility/brand-intelligence'
import { classifyBusinessModel } from '@/lib/growth/ai-visibility/taxonomy'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

const APPLY = process.argv.includes('--apply')
const GROUNDED = process.argv.includes('--grounded')
const profileArgIdx = process.argv.indexOf('--profile')
const PROFILE_FILTER = profileArgIdx >= 0 ? process.argv[profileArgIdx + 1] : null

const BACKFILL_ACTOR = 'backfill:task-1289'

interface ProfileRow extends Record<string, unknown> {
  profile_id: string
  public_id: string | null
  brand_name: string
  organization_id: string | null
  category_node_id: string | null
  business_model: string | null
}

const main = async (): Promise<void> => {
  const profiles = await runGreenhousePostgresQuery<ProfileRow>(
    `SELECT profile_id, public_id, brand_name, organization_id, category_node_id, business_model
       FROM greenhouse_growth.grader_profiles
      WHERE status = 'active'
        AND ($1::text IS NULL OR public_id = $1 OR profile_id = $1)
      ORDER BY created_at ASC`,
    [PROFILE_FILTER]
  )

  console.log(
    `TASK-1289 backfill business_model — mode: ${GROUNDED ? 'GROUNDED' : 'DETERMINISTIC'} / ${APPLY ? 'APPLY' : 'DRY-RUN'}`
  )
  console.log(`Profiles: ${profiles.length}\n`)

  const byModel: Record<string, number> = {}
  let updated = 0

  for (const profile of profiles) {
    let grounded: { businessModel: 'consumer_b2c' | 'b2b_service_provider' | 'b2b_product_saas' | 'retail_ecommerce' | 'marketplace' | 'public_institution' | 'unknown'; confidence: number } | null = null

    if (GROUNDED) {
      const snapshot = await getActiveBrandIntelligence(profile.profile_id)

      grounded =
        snapshot?.candidateBusinessModel != null
          ? { businessModel: snapshot.candidateBusinessModel, confidence: snapshot.confidence ?? 0 }
          : null
    }

    const classified = classifyBusinessModel({
      categoryNodeId: profile.category_node_id,
      groundedCandidate: grounded
    })

    byModel[classified.businessModel] = (byModel[classified.businessModel] ?? 0) + 1

    const flag = classified.businessModel === 'unknown' ? '⚠️ ' : '   '

    console.log(
      `${flag}${profile.public_id ?? profile.profile_id}  "${profile.brand_name}"  ` +
        `cat=${profile.category_node_id ?? 'null'} → ${classified.businessModel} ` +
        `(${classified.source}, conf ${classified.confidence})`
    )

    if (APPLY) {
      await withGreenhousePostgresTransaction(async client => {
        await client.query(
          `UPDATE greenhouse_growth.grader_profiles
              SET business_model = $2,
                  business_model_confidence = $3,
                  business_model_source = $4,
                  updated_at = NOW()
            WHERE profile_id = $1`,
          [profile.profile_id, classified.businessModel, classified.confidence, classified.source]
        )

        // Append-only audit: provenance of the (re)derivation.
        await client.query(
          `INSERT INTO greenhouse_growth.grader_business_model_history
             (profile_id, organization_id, from_business_model, to_business_model, to_source, confidence, reason, changed_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            profile.profile_id,
            profile.organization_id,
            profile.business_model,
            classified.businessModel,
            classified.source,
            classified.confidence,
            `backfill ${GROUNDED ? 'grounded' : 'deterministic'}`,
            BACKFILL_ACTOR
          ]
        )
      })
      updated += 1
    }
  }

  const resolvedCount = profiles.length - (byModel.unknown ?? 0)
  const coverage = profiles.length > 0 ? Math.round((resolvedCount / profiles.length) * 100) : 0

  console.log('\n— Cobertura —')

  for (const [model, count] of Object.entries(byModel).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${model}: ${count}`)
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
