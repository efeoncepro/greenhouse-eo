import 'server-only'

/**
 * TASK-1289 — Growth AI Visibility · Business model classification reliability signal.
 *
 * `growth.ai_visibility.profile_business_model_unresolved` (data_quality): count of ORG-LINKED
 * active grader profiles whose business model did NOT resolve (`business_model` NULL or 'unknown').
 * These are real client/prospect brands whose buyer-intent framing (TASK-1290) is undefined — the
 * grader cannot pick the right prompt archetype until the grounded read resolves them or an
 * operator overrides (TASK-1289 Slice 3).
 *
 * Org-linked only: test/public/internal profiles (organization_id NULL) are excluded so the signal
 * reflects brands that actually gate a portal/operator run. Steady target: 0. Honest degradation:
 * read error → severity 'unknown' + captureWithDomain('growth'). Mirrors the category signal.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_AI_VISIBILITY_PROFILE_BUSINESS_MODEL_UNRESOLVED_SIGNAL_ID =
  'growth.ai_visibility.profile_business_model_unresolved'

const MODULE_KEY = 'growth' as const
const SOURCE = 'getGrowthAiVisibilityBusinessModelSignals'

type BusinessModelAgg = {
  org_linked: number
  unresolved: number
}

const buildBusinessModelSignals = async (observedAt: string): Promise<ReliabilitySignal[]> => {
  const rows = await runGreenhousePostgresQuery<BusinessModelAgg>(
    `SELECT
       COUNT(*) FILTER (WHERE organization_id IS NOT NULL)::int AS org_linked,
       COUNT(*) FILTER (
         WHERE organization_id IS NOT NULL
           AND (business_model IS NULL OR business_model = 'unknown')
       )::int AS unresolved
     FROM greenhouse_growth.grader_profiles
     WHERE status = 'active'`
  )

  const orgLinked = Number(rows[0]?.org_linked ?? 0)
  const unresolved = Number(rows[0]?.unresolved ?? 0)

  return [
    {
      signalId: GROWTH_AI_VISIBILITY_PROFILE_BUSINESS_MODEL_UNRESOLVED_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'data_quality',
      source: SOURCE,
      label: 'Modelo de negocio AEO sin resolver (perfiles de marca)',
      severity: unresolved === 0 ? 'ok' : unresolved <= 5 ? 'warning' : 'error',
      summary:
        unresolved === 0
          ? `Todos los perfiles de marca enlazados (${orgLinked}) tienen modelo de negocio resuelto.`
          : `${unresolved}/${orgLinked} perfiles de marca enlazados sin modelo de negocio (buyer-intent indefinido hasta resolver/confirmar).`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'unresolved', value: String(unresolved) },
        { kind: 'metric', label: 'org_linked', value: String(orgLinked) },
        { kind: 'doc', label: 'follow-up', value: 'TASK-1289 backfill --grounded / override operador' }
      ]
    }
  ]
}

export const getGrowthAiVisibilityBusinessModelSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  return buildBusinessModelSignals(observedAt).catch(error => {
    captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal_business_model' } })

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_PROFILE_BUSINESS_MODEL_UNRESOLVED_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'data_quality' as const,
        source: SOURCE,
        label: 'Modelo de negocio AEO sin resolver (perfiles de marca)',
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
