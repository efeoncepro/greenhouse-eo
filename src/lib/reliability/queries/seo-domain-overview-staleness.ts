import 'server-only'

import { query } from '@/lib/db'
import { SEO_MODULE_KEYS_READ } from '@/lib/growth/seo/entitlement'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1775 — Sujetos de foto de dominio sin snapshot dentro de dos ciclos.
 *
 * Para cada sujeto elegible (dominio del target + competidores vigentes de orgs con
 * assignment SEO), computa la edad del último `domain_rank_overview`
 * (`(CURRENT_DATE - MAX(capture_date))::int` — patrón canónico TASK-893, NUNCA
 * `EXTRACT(EPOCH FROM ...)`: date - date es integer). El ciclo es MENSUAL, así que dos
 * ciclos (60 días) sin foto significa que el colector murió en silencio — el caso que la
 * risk matrix de la task describe: el `--set-env-vars` destructivo de un deploy borra el
 * flag del worker y el cron queda mudo sin error visible.
 *
 * Subsystem rollup: `Growth` (module=growth). Steady = 0 sujetos stale.
 *
 * **Severity matrix canonical:**
 *   - sin sujetos elegibles → `ok`
 *   - NINGÚN sujeto capturado jamás → `ok` con summary de rollout pendiente (la capacidad
 *     nace con flag OFF + scheduler pausado; un dashboard en warning permanente pre-rollout
 *     sería ruido, y el estado "aún no corre" se dice con palabras, no con amarillo)
 *   - >= 1 sujeto stale (sin foto en 60 días, o nunca, habiendo otros capturados) → `warning`
 *   - TODOS los sujetos stale habiendo data histórica → `error` (la captura murió completa)
 */
export const SEO_DOMAIN_OVERVIEW_STALENESS_SIGNAL_ID = 'seo.domain_overview.stale_subjects'

/** Dos ciclos mensuales del proveedor. */
export const SEO_DOMAIN_OVERVIEW_STALE_DAYS = 60

const QUERY_SQL = `
  WITH subjects AS (
    SELECT DISTINCT
      regexp_replace(lower(t.root_domain), '^www\\.', '') AS normalized_domain,
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
    s.normalized_domain,
    (CURRENT_DATE - MAX(o.capture_date))::int AS age_days
  FROM subjects s
  LEFT JOIN greenhouse_growth.seo_domain_overview_snapshots o
    ON o.normalized_domain = s.normalized_domain
   AND o.location_code = s.location_code
   AND o.language_code = s.language_code
   AND o.source_endpoint = 'domain_rank_overview'
  GROUP BY s.normalized_domain, s.location_code, s.language_code
`

type SubjectRow = {
  normalized_domain: string
  age_days: number | null
}

export const getSeoDomainOverviewStalenessSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    // Consume la constante, no una clave hardcodeada (lección TASK-1310/1677).
    const rows = await query<SubjectRow>(QUERY_SQL, [[...SEO_MODULE_KEYS_READ]])

    const total = rows.length
    const everCaptured = rows.filter(row => row.age_days !== null).length
    const stale = rows.filter(row => row.age_days === null || row.age_days >= SEO_DOMAIN_OVERVIEW_STALE_DAYS).length

    let severity: 'ok' | 'warning' | 'error' = 'ok'
    let summary: string

    if (total === 0) {
      summary = 'Sin sujetos elegibles para la foto de dominio (ninguna org con assignment activo).'
    } else if (everCaptured === 0) {
      // Rollout pendiente: la capacidad existe con flag OFF + scheduler pausado.
      summary = `Foto de dominio sin rollout todavía: ${total} sujeto(s) elegible(s) en espera del primer ciclo (flag OFF / scheduler pausado).`
    } else if (stale === 0) {
      summary = `Foto de dominio al día en ${total} sujeto(s) (target + competidores).`
    } else if (stale === total) {
      severity = 'error'
      summary = `La captura de foto de dominio murió: los ${total} sujeto(s) llevan >= ${SEO_DOMAIN_OVERVIEW_STALE_DAYS} días sin snapshot. Revisar flag GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED en la revisión ACTIVA del ops-worker (el --set-env-vars destructivo de un deploy pudo borrarlo) y el scheduler ops-seo-domain-overview.`
    } else {
      severity = 'warning'
      summary = `${stale} de ${total} sujeto(s) sin foto de dominio dentro de dos ciclos (60 días). Revisar el batch mensual (sujetos nuevos sin captura inicial, o gate de costo bloqueando).`
    }

    return {
      signalId: SEO_DOMAIN_OVERVIEW_STALENESS_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoDomainOverviewStalenessSignal',
      label: 'Frescura de la foto de dominio SEO',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            'targets + competidores vigentes con assignment seo_v2 — (CURRENT_DATE - MAX(capture_date))::int sobre domain_rank_overview'
        },
        { kind: 'metric', label: 'subjects', value: String(total) },
        { kind: 'metric', label: 'everCaptured', value: String(everCaptured) },
        { kind: 'metric', label: 'stale', value: String(stale) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_seo_domain_overview_staleness' }
    })

    return {
      signalId: SEO_DOMAIN_OVERVIEW_STALENESS_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoDomainOverviewStalenessSignal',
      label: 'Frescura de la foto de dominio SEO',
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
