import 'server-only'

/**
 * TASK-1288 — Growth AI Visibility · Canonical category resolution reliability signal.
 *
 * `growth.ai_visibility.profile_category_unresolved` (data_quality): count of ORG-LINKED
 * active grader profiles whose category did NOT resolve to a canonical taxonomy node
 * (`category_node_id` NULL or 'unknown'). These are real client/prospect brands that the
 * run guard (TASK-1288 Slice 3) blocks until resolved/confirmed — they need the grounded
 * brand_intelligence read (Slice 4) or human confirmation (TASK-1291).
 *
 * Org-linked only: test/public/internal profiles (organization_id NULL) are excluded so the
 * signal reflects brands that actually gate a portal/operator run. Steady target: 0.
 * Honest degradation: read error → severity 'unknown' + captureWithDomain('growth').
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_AI_VISIBILITY_PROFILE_CATEGORY_UNRESOLVED_SIGNAL_ID =
  'growth.ai_visibility.profile_category_unresolved'

const MODULE_KEY = 'growth' as const
const SOURCE = 'getGrowthAiVisibilityCategorySignals'

type CategoryAgg = {
  org_linked: number
  unresolved: number
}

const buildCategorySignals = async (observedAt: string): Promise<ReliabilitySignal[]> => {
  const rows = await runGreenhousePostgresQuery<CategoryAgg>(
    `SELECT
       COUNT(*) FILTER (WHERE organization_id IS NOT NULL)::int AS org_linked,
       COUNT(*) FILTER (
         WHERE organization_id IS NOT NULL
           AND (category_node_id IS NULL OR category_node_id = 'unknown')
       )::int AS unresolved
     FROM greenhouse_growth.grader_profiles
     WHERE status = 'active'`
  )

  const orgLinked = Number(rows[0]?.org_linked ?? 0)
  const unresolved = Number(rows[0]?.unresolved ?? 0)

  return [
    {
      signalId: GROWTH_AI_VISIBILITY_PROFILE_CATEGORY_UNRESOLVED_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'data_quality',
      source: SOURCE,
      label: 'Categoría AEO sin resolver (perfiles de marca)',
      severity: unresolved === 0 ? 'ok' : unresolved <= 5 ? 'warning' : 'error',
      summary:
        unresolved === 0
          ? `Todos los perfiles de marca enlazados (${orgLinked}) tienen categoría canónica resuelta.`
          : `${unresolved}/${orgLinked} perfiles de marca enlazados sin categoría canónica (bloquean el run hasta resolver/confirmar).`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'unresolved', value: String(unresolved) },
        { kind: 'metric', label: 'org_linked', value: String(orgLinked) },
        { kind: 'doc', label: 'follow-up', value: 'TASK-1288 Slice 4 (grounded read) / TASK-1291 (confirmación humana)' }
      ]
    }
  ]
}

export const getGrowthAiVisibilityCategorySignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  return buildCategorySignals(observedAt).catch(error => {
    captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal_category' } })

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_PROFILE_CATEGORY_UNRESOLVED_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'data_quality' as const,
        source: SOURCE,
        label: 'Categoría AEO sin resolver (perfiles de marca)',
        severity: 'unknown' as const,
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt,
        evidence: [
          { kind: 'metric' as const, label: 'error', value: error instanceof Error ? error.message : String(error) }
        ]
      }
    ]
  })
}
