import 'server-only'

import { query } from '@/lib/db'
import { SEO_MODULE_KEYS_READ } from '@/lib/growth/seo/entitlement'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1699 — Días con captura de rank pero SIN filas de top-N.
 *
 * El top-N viaja en el MISMO ciclo (y la misma respuesta pagada) que el snapshot de rank:
 * un día con snapshot y sin top-N significa flag apagado en el runtime que importa
 * (ops-worker), parser degradado o respuesta anómala — y ese día de contexto NO se
 * recupera (el SERP de ayer no se recompra). Ventana: últimos 3 días de capturas.
 *
 * Diseño honesto (patrón de sus hermanas): pre-rollout (cero filas de top-N en la historia)
 * reporta `ok` con summary explícito — "aún no corre" se dice con palabras, no con
 * amarillo; TODOS los días descubiertos CON historia previa = la escritura murió (`error`).
 */
export const SEO_SERP_TOP_RESULTS_COVERAGE_SIGNAL_ID = 'seo.serp_top_results.coverage'

/** Ventana de control: los últimos N días con captura de rank. */
export const SEO_SERP_TOP_RESULTS_COVERAGE_WINDOW_DAYS = 3

const QUERY_SQL = `
  SELECT r.seo_target_id,
         r.capture_date::text AS capture_date,
         EXISTS (
           SELECT 1
             FROM greenhouse_growth.seo_serp_top_results x
            WHERE x.seo_target_id = r.seo_target_id
              AND x.capture_date = r.capture_date
         ) AS covered
    FROM (
      SELECT s.seo_target_id, s.capture_date
        FROM greenhouse_growth.seo_rank_snapshots s
        JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = s.seo_target_id
       WHERE t.status = 'active'
         AND s.capture_date >= CURRENT_DATE - $2::int
         AND EXISTS (
           SELECT 1
             FROM greenhouse_client_portal.module_assignments ma
            WHERE ma.organization_id = t.organization_id
              AND ma.module_key = ANY($1::text[])
              AND ma.effective_to IS NULL
              AND ma.status IN ('active', 'pilot')
         )
       GROUP BY s.seo_target_id, s.capture_date
    ) r
`

const EVER_SQL = `SELECT EXISTS (SELECT 1 FROM greenhouse_growth.seo_serp_top_results) AS ever`

type CoverageRow = {
  seo_target_id: string
  capture_date: string
  covered: boolean
}

export const getSeoSerpTopResultsCoverageSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<CoverageRow>(QUERY_SQL, [
      [...SEO_MODULE_KEYS_READ],
      SEO_SERP_TOP_RESULTS_COVERAGE_WINDOW_DAYS
    ])

    const everRows = await query<{ ever: boolean }>(EVER_SQL)
    const everCaptured = everRows[0]?.ever === true

    const total = rows.length
    const uncovered = rows.filter(row => !row.covered).length

    let severity: 'ok' | 'warning' | 'error' = 'ok'
    let summary: string

    if (total === 0) {
      summary = 'Sin capturas de rank en la ventana (nada que cubrir).'
    } else if (!everCaptured) {
      summary = `Top-N del SERP sin rollout todavía: ${total} día(s)-target con captura de rank en espera del primer ciclo con el flag activo en el worker. Cada día en este estado se pierde para siempre.`
    } else if (uncovered === 0) {
      summary = `Top-N del SERP al día: ${total} día(s)-target con captura de rank y contexto persistido.`
    } else if (uncovered === total) {
      severity = 'error'
      summary = `La persistencia del top-N murió: los ${total} día(s)-target de la ventana tienen snapshot de rank y CERO filas de contexto. Revisar GROWTH_SEO_SERP_TOP_RESULTS_ENABLED en la revisión ACTIVA del ops-worker — cada día así se pierde para siempre.`
    } else {
      severity = 'warning'
      summary = `${uncovered} de ${total} día(s)-target con captura de rank y sin top-N (parser degradado, respuesta anómala o flag parcial). El contexto de esos días no se recupera.`
    }

    return {
      signalId: SEO_SERP_TOP_RESULTS_COVERAGE_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoSerpTopResultsCoverageSignal',
      label: 'Cobertura del top-N del SERP',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'días-target con seo_rank_snapshots (3d, targets activos seo_v2) sin fila en seo_serp_top_results'
        },
        { kind: 'metric', label: 'targetDays', value: String(total) },
        { kind: 'metric', label: 'uncovered', value: String(uncovered) },
        { kind: 'metric', label: 'everCaptured', value: String(everCaptured) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_seo_serp_top_results_coverage' }
    })

    return {
      signalId: SEO_SERP_TOP_RESULTS_COVERAGE_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoSerpTopResultsCoverageSignal',
      label: 'Cobertura del top-N del SERP',
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
