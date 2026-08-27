import 'server-only'

import { query } from '@/lib/db'
import { SEO_MODULE_KEYS_READ } from '@/lib/growth/seo/entitlement'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1776 — Sujetos de visibilidad por página sin snapshot dentro de dos ciclos.
 *
 * El batch mensual captura `kind=domain` del target + competidores vigentes; este signal mide
 * esa cobertura contra `seo_url_visibility_snapshots` (source `ranked_keywords`,
 * `(CURRENT_DATE - MAX(capture_date))::int` — patrón TASK-893). Mismo diseño honesto que
 * `seo.domain_overview.stale_subjects`: pre-rollout (nadie capturado jamás) reporta `ok` con
 * summary explícito — el estado "aún no corre" se dice con palabras, no con amarillo; y TODOS
 * stale con data histórica = la captura murió (p. ej. `--set-env-vars` borró el flag).
 */
export const SEO_URL_VISIBILITY_STALENESS_SIGNAL_ID = 'seo.url_visibility.stale_subjects'

/** Dos ciclos mensuales del proveedor. */
export const SEO_URL_VISIBILITY_STALE_DAYS = 60

const QUERY_SQL = `
  WITH subjects AS (
    SELECT DISTINCT
      regexp_replace(lower(t.root_domain), '^www\\.', '') AS normalized_subject,
      t.location_code,
      t.language_code
    FROM greenhouse_growth.seo_targets t
    WHERE t.status = 'active'
      AND EXISTS (
        SELECT 1
          FROM greenhouse_client_portal.module_assignments ma
         WHERE ma.organization_id = t.organization_id
           AND ma.module_key = ANY($1::text[])
           AND ma.effective_to IS NULL
           AND ma.status IN ('active', 'pilot')
      )
    UNION
    SELECT DISTINCT
      regexp_replace(lower(c.competitor_domain), '^www\\.', ''),
      t.location_code,
      t.language_code
    FROM greenhouse_growth.seo_competitors c
    JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = c.seo_target_id
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
  )
  SELECT
    s.normalized_subject,
    (CURRENT_DATE - MAX(v.capture_date))::int AS age_days
  FROM subjects s
  LEFT JOIN greenhouse_growth.seo_url_visibility_snapshots v
    ON v.subject_kind = 'domain'
   AND v.normalized_subject = s.normalized_subject
   AND v.location_code = s.location_code
   AND v.language_code = s.language_code
   AND v.source_endpoint = 'ranked_keywords'
  GROUP BY s.normalized_subject, s.location_code, s.language_code
`

type SubjectRow = {
  normalized_subject: string
  age_days: number | null
}

export const getSeoUrlVisibilityStalenessSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<SubjectRow>(QUERY_SQL, [[...SEO_MODULE_KEYS_READ]])

    const total = rows.length
    const everCaptured = rows.filter(row => row.age_days !== null).length
    const stale = rows.filter(row => row.age_days === null || row.age_days >= SEO_URL_VISIBILITY_STALE_DAYS).length

    let severity: 'ok' | 'warning' | 'error' = 'ok'
    let summary: string

    if (total === 0) {
      summary = 'Sin sujetos elegibles para visibilidad por página (ninguna org con assignment activo).'
    } else if (everCaptured === 0) {
      summary = `Visibilidad por página sin rollout todavía: ${total} sujeto(s) elegible(s) en espera del primer ciclo (flag OFF / scheduler pausado).`
    } else if (stale === 0) {
      summary = `Visibilidad por página al día en ${total} sujeto(s) (target + competidores).`
    } else if (stale === total) {
      severity = 'error'
      summary = `La captura de visibilidad por página murió: los ${total} sujeto(s) llevan >= ${SEO_URL_VISIBILITY_STALE_DAYS} días sin snapshot. Revisar GROWTH_SEO_URL_VISIBILITY_ENABLED en la revisión ACTIVA del ops-worker y el scheduler ops-seo-url-visibility.`
    } else {
      severity = 'warning'
      summary = `${stale} de ${total} sujeto(s) sin visibilidad por página dentro de dos ciclos (60 días). Revisar el batch mensual (sujetos nuevos sin captura inicial, o gate de costo bloqueando).`
    }

    return {
      signalId: SEO_URL_VISIBILITY_STALENESS_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoUrlVisibilityStalenessSignal',
      label: 'Frescura de visibilidad por página SEO',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            'targets + competidores vigentes con assignment seo_v2 — (CURRENT_DATE - MAX(capture_date))::int sobre ranked_keywords/domain'
        },
        { kind: 'metric', label: 'subjects', value: String(total) },
        { kind: 'metric', label: 'everCaptured', value: String(everCaptured) },
        { kind: 'metric', label: 'stale', value: String(stale) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_seo_url_visibility_staleness' }
    })

    return {
      signalId: SEO_URL_VISIBILITY_STALENESS_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoUrlVisibilityStalenessSignal',
      label: 'Frescura de visibilidad por página SEO',
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
