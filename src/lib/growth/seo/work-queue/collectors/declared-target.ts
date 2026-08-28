import 'server-only'

/**
 * TASK-1700 — Colector `declared_target`: los compromisos que un humano declaró.
 *
 * `seo_keyword_set_members` con `intent='target'` vigente (TASK-1659). Son keywords que
 * alguien asumió como objetivo, con autor y fecha — no hallazgos del sistema.
 *
 * 🔴 Un objetivo declarado en posición 60 es DISTANCIA POR RECORRER, no urgencia. Por eso
 * entra como su propio origen y no se promedia con nada: mezclarlo con un striking-distance
 * de posición 9 produciría un número que no significa nada. Si tiene demanda medida se
 * puntúa como cualquier otra evidencia; si no la tiene, cae a banda 3 con verbo `measure`,
 * que es la verdad — se declaró un objetivo y todavía nadie llega por él.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { normalizeMarketKeyword } from '../../keyword-market-data'
import { buildEvidenceRef, type SeoWorkQueueCollectorResult, type SeoWorkQueueItemInput } from '../contracts'
import { computePriorityScore } from '../priority-score'
import { WORK_QUEUE_RUNTIME_CONFIG } from '../score-versions'
import { healthy, isRetiredSubject, unhealthy, type SeoWorkQueueCollectorContext } from './context'

const ORIGIN = 'declared_target' as const

/**
 * Objetivos vigentes + su demanda medida en la ventana, en UNA query.
 *
 * El LEFT JOIN lateral contra `seo_gsc_daily` es intra-motor (`seo_*` con `seo_*`), así que
 * no viola el boundary §1.1 — lo prohibido es cruzar a `grader_*`.
 *
 * Parámetros: `$1` seoTargetId · `$2` organizationId · `$3` windowDays · `$4` limit.
 */
export const SEO_WORK_QUEUE_DECLARED_TARGETS_SQL = `SELECT m.keyword_set_member_id,
              m.keyword,
              m.intent_declared_at,
              COALESCE(g.impressions, 0)::text AS impressions,
              COALESCE(g.clicks, 0)::text      AS clicks,
              g.weighted_position::text        AS weighted_position,
              g.page                           AS page
         FROM greenhouse_growth.seo_keyword_set_members m
         JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
         LEFT JOIN LATERAL (
           SELECT SUM(d.impressions)                                            AS impressions,
                  SUM(d.clicks)                                                 AS clicks,
                  SUM(d.position * d.impressions) / NULLIF(SUM(d.impressions), 0) AS weighted_position,
                  (ARRAY_AGG(d.page ORDER BY d.impressions DESC))[1]            AS page
             FROM greenhouse_growth.seo_gsc_daily d
            WHERE d.organization_id = $2
              AND d.capture_date >= (CURRENT_DATE - $3::int)
              AND LOWER(d.query) = LOWER(m.keyword)
         ) g ON TRUE
        WHERE s.seo_target_id = $1
          AND m.effective_to IS NULL
          AND m.intent = 'target'
        ORDER BY m.keyword
        LIMIT $4::int`

interface DeclaredTargetRow extends Record<string, unknown> {
  keyword_set_member_id: string
  keyword: string
  intent_declared_at: Date | string | null
  impressions: string
  clicks: string
  weighted_position: string | null
  page: string | null
}

export const collectDeclaredTargets = async (
  ctx: SeoWorkQueueCollectorContext
): Promise<SeoWorkQueueCollectorResult> => {
  const { config } = ctx

  try {
    const rows = await runGreenhousePostgresQuery<DeclaredTargetRow>(SEO_WORK_QUEUE_DECLARED_TARGETS_SQL, [
      ctx.seoTargetId,
      ctx.organizationId,
      config.windowDays,
      WORK_QUEUE_RUNTIME_CONFIG.maxItemsPerOrigin
    ])

    const items: SeoWorkQueueItemInput[] = []

    for (const row of rows) {
      const normalizedKeyword = normalizeMarketKeyword(row.keyword ?? '')

      if (!normalizedKeyword) continue
      if (isRetiredSubject(ctx, ORIGIN, normalizedKeyword)) continue

      const impressions = Number(row.impressions)
      const clicks = Number(row.clicks)
      const weightedPosition = row.weighted_position === null ? null : Number(row.weighted_position)

      const scored = computePriorityScore(
        {
          impressions,
          clicks,
          weightedPosition: weightedPosition !== null && Number.isFinite(weightedPosition) ? weightedPosition : null,
          curve: ctx.curve
        },
        config.version as never
      )

      const declaredAt =
        row.intent_declared_at instanceof Date
          ? row.intent_declared_at.toISOString()
          : (row.intent_declared_at ?? null)

      items.push({
        origin: ORIGIN,
        normalizedKeyword,
        targetUrl: row.page,
        // Con demanda medida y una página que ya rankea, la acción es optimizarla; sin nada
        // medido, el objetivo declarado todavía no tiene contenido que empujar.
        recommendedVerb: scored.band === 3 ? (row.page ? 'optimize' : 'create') : 'optimize',
        scoreBasis: scored.basis,
        scoreBand: scored.band,
        priorityScore: scored.score,
        breakdown: {
          ...scored.breakdown,
          basisReason: declaredAt
            ? `Compromiso declarado el ${declaredAt.slice(0, 10)}. ${scored.breakdown.basisReason}`
            : scored.breakdown.basisReason
        },
        evidenceRef: buildEvidenceRef(ORIGIN, row.keyword_set_member_id),
        sourceScoreVersion: null,
        tieBreakImpressions: Number.isFinite(impressions) ? impressions : 0
      })
    }

    return { items, health: healthy(ORIGIN, items.length) }
  } catch (error) {
    return {
      items: [],
      health: unhealthy(
        ORIGIN,
        'down',
        `No se pudieron leer los objetivos declarados: ${error instanceof Error ? error.message : 'error desconocido'}`
      )
    }
  }
}
