import 'server-only'

import { query } from '@/lib/db'
import { SEO_MODULE_KEYS_READ } from '@/lib/growth/seo/entitlement'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1662 — Competidores declarados sin cobertura de keywords dentro de dos ciclos.
 *
 * El batch mensual captura la cobertura de cada competidor VIGENTE de targets activos con
 * assignment `seo_v2`; este signal mide esa cobertura contra el run ledger
 * (`seo_competitor_coverage_runs`, sólo `status='captured'` —un run fallido no es
 * cobertura—, `(CURRENT_DATE - MAX(capture_date))::int`, patrón TASK-893). Mismo diseño
 * honesto que sus hermanas: pre-rollout (nadie capturado jamás) reporta `ok` con summary
 * explícito — "aún no corre" se dice con palabras, no con amarillo; y TODOS stale con data
 * histórica = la captura murió (flag borrado por `--set-env-vars`, scheduler pausado).
 */
export const SEO_COMPETITOR_COVERAGE_STALENESS_SIGNAL_ID = 'seo.competitor_coverage.stale'

/** Dos ciclos mensuales del proveedor. */
export const SEO_COMPETITOR_COVERAGE_STALE_DAYS = 60

const QUERY_SQL = `
  SELECT
    c.seo_competitor_id,
    c.competitor_domain,
    (CURRENT_DATE - MAX(r.capture_date))::int AS age_days
  FROM greenhouse_growth.seo_competitors c
  JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = c.seo_target_id
  LEFT JOIN greenhouse_growth.seo_competitor_coverage_runs r
    ON r.seo_competitor_id = c.seo_competitor_id
   AND r.status = 'captured'
  WHERE c.effective_to IS NULL
    AND t.status = 'active'
    AND EXISTS (
      SELECT 1
        FROM greenhouse_client_portal.module_assignments ma
       WHERE ma.organization_id = t.organization_id
         AND ma.module_key = ANY($1::text[])
         AND ma.effective_to IS NULL
         AND ma.status IN ('active', 'pilot')
    )
  GROUP BY c.seo_competitor_id, c.competitor_domain
`

type CompetitorRow = {
  seo_competitor_id: string
  competitor_domain: string
  age_days: number | null
}

export const getSeoCompetitorCoverageStalenessSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<CompetitorRow>(QUERY_SQL, [[...SEO_MODULE_KEYS_READ]])

    const total = rows.length
    const everCaptured = rows.filter(row => row.age_days !== null).length
    const stale = rows.filter(row => row.age_days === null || row.age_days >= SEO_COMPETITOR_COVERAGE_STALE_DAYS).length

    let severity: 'ok' | 'warning' | 'error' = 'ok'
    let summary: string

    if (total === 0) {
      summary = 'Sin competidores declarados vigentes (el gap competitivo no tiene sujetos todavía).'
    } else if (everCaptured === 0) {
      summary = `Cobertura de competidores sin rollout todavía: ${total} competidor(es) declarado(s) en espera del primer ciclo (flag OFF / scheduler pausado).`
    } else if (stale === 0) {
      summary = `Cobertura de competidores al día en ${total} competidor(es).`
    } else if (stale === total) {
      severity = 'error'
      summary = `La captura de cobertura de competidores murió: los ${total} competidor(es) llevan >= ${SEO_COMPETITOR_COVERAGE_STALE_DAYS} días sin captura. Revisar GROWTH_SEO_COMPETITOR_GAP_ENABLED en la revisión ACTIVA del ops-worker y el scheduler ops-seo-competitor-coverage.`
    } else {
      severity = 'warning'
      summary = `${stale} de ${total} competidor(es) sin cobertura dentro de dos ciclos (60 días). Revisar el batch mensual (competidores nuevos sin captura inicial, o gate de costo bloqueando).`
    }

    return {
      signalId: SEO_COMPETITOR_COVERAGE_STALENESS_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoCompetitorCoverageStalenessSignal',
      label: 'Frescura de cobertura de competidores SEO',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            'competidores vigentes de targets activos con assignment seo_v2 — (CURRENT_DATE - MAX(capture_date))::int sobre runs captured'
        },
        { kind: 'metric', label: 'competitors', value: String(total) },
        { kind: 'metric', label: 'everCaptured', value: String(everCaptured) },
        { kind: 'metric', label: 'stale', value: String(stale) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_seo_competitor_coverage_staleness' }
    })

    return {
      signalId: SEO_COMPETITOR_COVERAGE_STALENESS_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoCompetitorCoverageStalenessSignal',
      label: 'Frescura de cobertura de competidores SEO',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
