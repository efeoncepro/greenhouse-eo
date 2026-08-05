import 'server-only'

/**
 * TASK-1305 — `readSeoAeoGap`: el derived read cross-módulo del "Search Visibility 360".
 *
 * Cruza la lente SEO (posición orgánica MEDIDA, `seo_gsc_daily` — verdad de primera
 * parte de GSC) contra la lente AEO (citabilidad IA, `grader_scores` del último run
 * reportable) **por `organization_id`**, y clasifica cada keyword en la matriz quadrant
 * 360. Responde lo que ningún motor contesta solo: ¿rankeas pero no te citan? ¿te citan
 * pero no rankeas?
 *
 * ═══ BOUNDARY §1.1 — load-bearing (NO "optimizar") ═══
 * - El cruce son DOS QUERIES SEPARADAS (una por motor) unidas EN MEMORIA por el
 *   `organization_id` resuelto server-side desde el target. CERO JOIN SQL / VIEW / FK
 *   entre `seo_*` y `grader_*`: son motores aislados (providers, cadencia y breakers
 *   distintos). Unirlos por SQL los acopla y es la violación más cara posible acá.
 * - CERO promedio entre ejes: rankeo y citabilidad se mantienen ortogonales.
 * - Degradación honesta: sin datos GSC → `no_seo_data`; sin run reportable → `no_aeo_data`.
 *   NUNCA ceros fantasma ni quadrant fabricado.
 *
 * V1: eje AEO con granularidad `domain` (`grader_scores` es por-run/dominio); TASK-1311
 * (citation attribution URL-level) lo refina a por-URL sin romper el contrato.
 * Cuando TASK-1303 aterrice, `seo_rank_snapshots` se suma como lente de mercado
 * (estimada) — GSC medido y DataForSEO estimado son lentes complementarias, nunca
 * promediadas (§3).
 *
 * Gates: el plano de capability (`growth.seo.observation.read`) lo valida el CONSUMER
 * (route/tool), patrón TASK-1287/1302. Este primitive garantiza el tenant binding: el
 * lado AEO se lee con EL MISMO org del target, nunca con uno del request.
 */

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  type SeoAeoGapResult,
  type SeoAeoKeywordStanding,
  type SeoAeoQuadrantEntry
} from '../contracts'
import { isSeoModuleEnabled } from '../flags'
import { classifyQuadrant, DEFAULT_QUADRANT_THRESHOLDS, type QuadrantThresholds } from './quadrant'

const DEFAULT_WINDOW_DAYS = 28
const DEFAULT_KEYWORD_LIMIT = 50
/** Piso de impresiones en ventana: bajo esto la posición ponderada no es interpretable. */
const MIN_IMPRESSIONS_FLOOR = 10

/** Estados de `grader_runs` con score reportable (espejo del patrón operador AEO). */
const REPORTABLE_RUN_STATUSES = ['succeeded', 'partial']

export interface ReadSeoAeoGapOptions {
  windowDays?: number
  limit?: number
  thresholds?: Partial<QuadrantThresholds>
}

interface SeoLensRow extends Record<string, unknown> {
  keyword: string
  page: string
  weighted_position: string
  impressions: string
  clicks: string
}

interface AeoLensRow extends Record<string, unknown> {
  run_id: string
  finished_at: string | null
  overall_score: string | null
}

export const readSeoAeoGap = async (
  seoTargetId: string,
  options: ReadSeoAeoGapOptions = {},
  env: NodeJS.ProcessEnv = process.env
): Promise<SeoAeoGapResult> => {
  if (!isSeoModuleEnabled(env)) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const windowDays = Math.max(1, options.windowDays ?? DEFAULT_WINDOW_DAYS)
  const limit = Math.max(1, options.limit ?? DEFAULT_KEYWORD_LIMIT)

  const thresholds: QuadrantThresholds = {
    ...DEFAULT_QUADRANT_THRESHOLDS,
    ...options.thresholds
  }

  try {
    // Tenant binding server-side: el target define la org; TODO lo demás usa ESTE org.
    const targets = await runGreenhousePostgresQuery<{ organization_id: string }>(
      `SELECT organization_id FROM greenhouse_growth.seo_targets WHERE seo_target_id = $1`,
      [seoTargetId]
    )

    const organizationId = targets[0]?.organization_id

    if (!organizationId) {
      return { ok: false, errorCode: 'target_not_found', status: null }
    }

    // ── Lente SEO (query 1: SOLO tablas seo_*) ─────────────────────────────
    // Posición ponderada por impresiones (método canónico TASK-1302: promediar días
    // planos daría el mismo peso a un día de 2 impresiones que a uno de 500).
    // Nota date-math (gate TASK-893): `capture_date` es DATE; comparación segura
    // contra CURRENT_DATE - $n::int, sin EXTRACT(EPOCH ...).
    const seoRows = await runGreenhousePostgresQuery<SeoLensRow>(
      `WITH per_query AS (
         SELECT query                                                        AS keyword,
                SUM(impressions)                                             AS impressions,
                SUM(clicks)                                                  AS clicks,
                SUM(position * impressions) / NULLIF(SUM(impressions), 0)    AS weighted_position
           FROM greenhouse_growth.seo_gsc_daily
          WHERE organization_id = $1
            AND capture_date >= (CURRENT_DATE - $2::int)
          GROUP BY query
         HAVING SUM(impressions) >= $3
       ),
       best_page AS (
         SELECT DISTINCT ON (keyword) keyword, page
           FROM (
             SELECT query                                                     AS keyword,
                    page,
                    SUM(position * impressions) / NULLIF(SUM(impressions), 0) AS page_position
               FROM greenhouse_growth.seo_gsc_daily
              WHERE organization_id = $1
                AND capture_date >= (CURRENT_DATE - $2::int)
              GROUP BY query, page
           ) per_page
          ORDER BY keyword, page_position ASC NULLS LAST
       )
       SELECT q.keyword,
              COALESCE(b.page, '')     AS page,
              q.weighted_position::text AS weighted_position,
              q.impressions::text       AS impressions,
              q.clicks::text            AS clicks
         FROM per_query q
         LEFT JOIN best_page b ON b.keyword = q.keyword
        ORDER BY q.impressions DESC
        LIMIT $4`,
      [organizationId, windowDays, MIN_IMPRESSIONS_FLOOR, limit]
    )

    if (seoRows.length === 0) {
      return { ok: false, errorCode: 'no_seo_data', status: null }
    }

    // ── Lente AEO (query 2: SOLO tablas grader_*) ──────────────────────────
    // Último run reportable de ESTE org (patrón LATERAL de listOperatorCrossOrgAeoScores,
    // keyed por organization_id — sin exigir el módulo AEO asignado). Nota (hallazgo
    // TASK-1300, 2026-08-05): `grader_profiles.organization_id` es NULLABLE por diseño —
    // un perfil puede ser público/prospecto (org NULL) o estar ligado a un cliente. El
    // filtro `p.organization_id = $1` excluye a los prospectos correctamente: el 360 es
    // por-org, y un perfil sin org no pertenece a ninguna.
    const aeoRows = await runGreenhousePostgresQuery<AeoLensRow>(
      `SELECT lr.run_id, lr.finished_at, ls.overall_score::text AS overall_score
         FROM (
           SELECT r.run_id, r.finished_at
             FROM greenhouse_growth.grader_runs r
             JOIN greenhouse_growth.grader_profiles p ON p.profile_id = r.profile_id
            WHERE p.organization_id = $1
              AND r.status = ANY($2::text[])
            ORDER BY r.finished_at DESC NULLS LAST, r.created_at DESC
            LIMIT 1
         ) lr
         JOIN LATERAL (
           SELECT s.overall_score
             FROM greenhouse_growth.grader_scores s
            WHERE s.run_id = lr.run_id
              AND s.overall_score IS NOT NULL
            ORDER BY s.created_at DESC
            LIMIT 1
         ) ls ON TRUE`,
      [organizationId, REPORTABLE_RUN_STATUSES]
    )

    const aeoRow = aeoRows[0]

    if (!aeoRow || aeoRow.overall_score === null) {
      return { ok: false, errorCode: 'no_aeo_data', status: null }
    }

    const overallScore = Number(aeoRow.overall_score)

    if (!Number.isFinite(overallScore)) {
      return { ok: false, errorCode: 'no_aeo_data', status: null }
    }

    // ── Cruce EN MEMORIA (cero SQL cross-motor) ────────────────────────────
    const keywords: SeoAeoKeywordStanding[] = seoRows.map(row => ({
      keyword: row.keyword,
      page: row.page,
      position: Number(row.weighted_position),
      impressions: Number(row.impressions),
      clicks: Number(row.clicks)
    }))

    const quadrants: SeoAeoQuadrantEntry[] = keywords.map(standing => ({
      keyword: standing.keyword,
      rankPosition: standing.position,
      aeoScore: overallScore,
      quadrant: classifyQuadrant(standing.position, overallScore, thresholds)
    }))

    const bestPosition = Math.min(...keywords.map(k => k.position))

    return {
      ok: true,
      organizationId,
      seoTargetId,
      aeoAxisGranularity: 'domain',
      seoLens: { windowDays, keywords },
      aeoLens: {
        latestRunId: aeoRow.run_id,
        latestRunAt: aeoRow.finished_at ? new Date(aeoRow.finished_at).toISOString() : null,
        overallScore,
        cited: overallScore >= thresholds.aeoCitedMinScore
      },
      quadrants,
      domainQuadrant: classifyQuadrant(bestPosition, overallScore, thresholds)
    }
  } catch (error) {
    captureWithDomain(error, 'growth', { extra: { context: 'read-seo-aeo-gap', seoTargetId } })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}
