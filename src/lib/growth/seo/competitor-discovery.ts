/**
 * TASK-1699 — `seo_competitors` gana su primer proponedor: descubrimiento por recurrencia
 * medida en el top-N del SERP ya pagado.
 *
 * ═══ Propone; NO declara ═══
 *
 * Un dominio en el top-N es una OBSERVACIÓN. "X es competidor de este cliente" es una
 * CLASIFICACIÓN CON AUTOR (TASK-1662): `readSerpCompetitorCandidates` es el *propose* del
 * loop propose → confirm → execute — devuelve candidatos con su evidencia y un
 * `proposalRef` sugerido; el *execute* es el command existente `declareCompetitors`
 * (`competitors.ts`), que sólo se invoca tras confirmación humana. El LLM nunca declara.
 *
 * ═══ Los umbrales son constantes versionadas, no números en la query ═══
 *
 * Un dominio que aparece una vez en una keyword es tráfico de paso; uno que aparece en
 * varias keywords durante varios días COMPITE POR TU INTENCIÓN. Que los umbrales sean
 * constantes exportadas es lo que permite decir después "con estos umbrales, éstos son tus
 * competidores" y defenderlo. Cambiar un umbral cambia quién aparece como candidato.
 *
 * Open Question 3 (resuelta con la propuesta de la spec): V1 NO filtra dominios de
 * plataforma (marketplaces, Wikipedia, YouTube) — se exponen con su evidencia para que el
 * operador vea qué está pasando antes de que un filtro se lo esconda.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { listActiveCompetitors } from './competitors'
import { resolveSeoEntitlement } from './entitlement'
import { isSeoModuleEnabled, isSeoSerpTopResultsEnabled } from './flags'

/** Ventana de recurrencia (días). */
export const SERP_COMPETITOR_DISCOVERY_WINDOW_DAYS = 30

/** Mínimo de keywords DISTINTAS en las que el dominio debe aparecer. */
export const SERP_COMPETITOR_DISCOVERY_MIN_KEYWORDS = 3

/** Mínimo de días DISTINTOS en los que el dominio debe aparecer. */
export const SERP_COMPETITOR_DISCOVERY_MIN_DAYS = 5

/** Versión del formato del `proposalRef` sugerido — la cola de auditoría lo lee opaco. */
export const SERP_COMPETITOR_PROPOSAL_REF_VERSION = 'serp_top:v1'

const DEFAULT_TOP_RESULTS_LIMIT = 200
const MAX_TOP_RESULTS_LIMIT = 1000

export interface SerpCompetitorCandidate {
  domain: string
  /** En cuántas keywords distintas apareció en la ventana. */
  keywordsCount: number
  /** En cuántos días distintos apareció. */
  daysCount: number
  /** Mediana de la posición orgánica (rank_group; fallback rank_absolute). */
  medianPosition: number
  bestPosition: number
  lastSeen: string
  /** Ya declarado como competidor VIGENTE del target (TASK-1662). */
  alreadyDeclared: boolean
  /**
   * Referencia OPACA sugerida para el confirm humano: pásala tal cual a
   * `declareCompetitors(..., { proposalRef })` para que la fila registre que la
   * declaración vino de una propuesta medida y con qué evidencia.
   */
  proposalRef: string
}

export type SerpCompetitorCandidatesResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      windowDays: number
      minKeywords: number
      minDays: number
      candidates: SerpCompetitorCandidate[]
    }
  | { ok: false; errorCode: 'disabled' | 'target_not_found' | 'no_entitlement' | 'query_failed'; status: null }

type TargetRow = {
  organization_id: string
}

const loadTargetOrganization = async (seoTargetId: string): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<TargetRow>(
    `SELECT organization_id
       FROM greenhouse_growth.seo_targets
      WHERE seo_target_id = $1`,
    [seoTargetId]
  )

  return rows[0]?.organization_id ?? null
}

export interface ReadSerpCompetitorCandidatesOptions {
  windowDays?: number
  minKeywords?: number
  minDays?: number
  env?: NodeJS.ProcessEnv
}

/**
 * Candidatos a competidor por recurrencia medida en el top-N.
 *
 * Excluye `is_own_domain` y todo `item_type` no orgánico (un dominio citado en PAA no es
 * competidor orgánico). El orden ES por fuerza de evidencia (keywords, luego días) — esto
 * es un ranking de EVIDENCIA de una propuesta, no la prioridad de trabajo que TASK-1700
 * gobierna.
 *
 * ⚠️ Ventana temporal con `capture_date >= CURRENT_DATE - $n::int` — DATE ± int es DATE;
 * jamás `EXTRACT(EPOCH FROM (date - date))` (gate TASK-893).
 */
export const readSerpCompetitorCandidates = async (
  seoTargetId: string,
  options: ReadSerpCompetitorCandidatesOptions = {}
): Promise<SerpCompetitorCandidatesResult> => {
  const env = options.env ?? process.env

  if (!isSeoModuleEnabled(env) || !isSeoSerpTopResultsEnabled(env)) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const windowDays = Math.max(1, options.windowDays ?? SERP_COMPETITOR_DISCOVERY_WINDOW_DAYS)
  const minKeywords = Math.max(1, options.minKeywords ?? SERP_COMPETITOR_DISCOVERY_MIN_KEYWORDS)
  const minDays = Math.max(1, options.minDays ?? SERP_COMPETITOR_DISCOVERY_MIN_DAYS)

  try {
    const organizationId = await loadTargetOrganization(seoTargetId)

    if (!organizationId) {
      return { ok: false, errorCode: 'target_not_found', status: null }
    }

    const entitlement = await resolveSeoEntitlement(organizationId, env)

    if (!entitlement.hasModule) {
      return { ok: false, errorCode: 'no_entitlement', status: null }
    }

    const rows = await runGreenhousePostgresQuery<{
      result_domain: string
      keywords_count: number
      days_count: number
      median_position: number
      best_position: number
      last_seen: string
    }>(
      `SELECT result_domain,
              COUNT(DISTINCT keyword)::int AS keywords_count,
              COUNT(DISTINCT capture_date)::int AS days_count,
              (percentile_cont(0.5) WITHIN GROUP (ORDER BY COALESCE(rank_group, rank_absolute)))::float8 AS median_position,
              MIN(COALESCE(rank_group, rank_absolute))::int AS best_position,
              MAX(capture_date)::text AS last_seen
         FROM greenhouse_growth.seo_serp_top_results
        WHERE seo_target_id = $1
          AND capture_date >= CURRENT_DATE - $2::int
          AND is_own_domain = FALSE
          AND item_type = 'organic'
          AND result_domain IS NOT NULL
        GROUP BY result_domain
       HAVING COUNT(DISTINCT keyword) >= $3
          AND COUNT(DISTINCT capture_date) >= $4
        ORDER BY COUNT(DISTINCT keyword) DESC, COUNT(DISTINCT capture_date) DESC, result_domain ASC`,
      [seoTargetId, windowDays, minKeywords, minDays]
    )

    const declared = new Set((await listActiveCompetitors(seoTargetId)).map(competitor => competitor.competitorDomain))

    const candidates: SerpCompetitorCandidate[] = rows.map(row => {
      const median = Math.round(row.median_position * 10) / 10

      return {
        domain: row.result_domain,
        keywordsCount: row.keywords_count,
        daysCount: row.days_count,
        medianPosition: median,
        bestPosition: row.best_position,
        lastSeen: row.last_seen,
        alreadyDeclared: declared.has(row.result_domain),
        proposalRef: `${SERP_COMPETITOR_PROPOSAL_REF_VERSION}:${row.result_domain}:kw=${row.keywords_count}:days=${row.days_count}:med=${median}:win=${windowDays}d`
      }
    })

    return { ok: true, seoTargetId, organizationId, windowDays, minKeywords, minDays, candidates }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_serp_competitor_candidates' },
      extra: { seoTargetId }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}

export interface SerpTopResultReadRow {
  keyword: string
  engine: string
  device: string
  captureDate: string
  rankAbsolute: number
  rankGroup: number | null
  itemType: string
  resultDomain: string | null
  resultUrl: string | null
  resultTitle: string | null
  isOwnDomain: boolean
}

export type ReadSerpTopResultsResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      rows: SerpTopResultReadRow[]
      /** Quedaron filas fuera del límite — cap DECLARADO, nunca silencioso. */
      hasMore: boolean
    }
  | { ok: false; errorCode: 'disabled' | 'target_not_found' | 'no_entitlement' | 'query_failed'; status: null }

export interface ReadSerpTopResultsOptions {
  keyword?: string
  /** YYYY-MM-DD inclusive. Sin rango: la ventana de descubrimiento por defecto. */
  from?: string
  to?: string
  limit?: number
  env?: NodeJS.ProcessEnv
}

/** Lectura canónica del top-N persistido (serie fechada, orden por día y ranura). */
export const readSerpTopResults = async (
  seoTargetId: string,
  options: ReadSerpTopResultsOptions = {}
): Promise<ReadSerpTopResultsResult> => {
  const env = options.env ?? process.env

  if (!isSeoModuleEnabled(env) || !isSeoSerpTopResultsEnabled(env)) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_TOP_RESULTS_LIMIT), MAX_TOP_RESULTS_LIMIT)

  try {
    const organizationId = await loadTargetOrganization(seoTargetId)

    if (!organizationId) {
      return { ok: false, errorCode: 'target_not_found', status: null }
    }

    const entitlement = await resolveSeoEntitlement(organizationId, env)

    if (!entitlement.hasModule) {
      return { ok: false, errorCode: 'no_entitlement', status: null }
    }

    const conditions: string[] = ['seo_target_id = $1']
    const params: unknown[] = [seoTargetId]

    if (options.keyword) {
      params.push(options.keyword.trim().toLowerCase())
      conditions.push(`keyword = $${params.length}`)
    }

    if (options.from) {
      params.push(options.from)
      conditions.push(`capture_date >= $${params.length}::date`)
    }

    if (options.to) {
      params.push(options.to)
      conditions.push(`capture_date <= $${params.length}::date`)
    }

    if (!options.from && !options.to) {
      params.push(SERP_COMPETITOR_DISCOVERY_WINDOW_DAYS)
      conditions.push(`capture_date >= CURRENT_DATE - $${params.length}::int`)
    }

    params.push(limit + 1)

    const rows = await runGreenhousePostgresQuery<{
      keyword: string
      engine: string
      device: string
      capture_date: string
      rank_absolute: number
      rank_group: number | null
      item_type: string
      result_domain: string | null
      result_url: string | null
      result_title: string | null
      is_own_domain: boolean
    }>(
      `SELECT keyword, engine, device, capture_date::text AS capture_date,
              rank_absolute, rank_group, item_type, result_domain, result_url, result_title,
              is_own_domain
         FROM greenhouse_growth.seo_serp_top_results
        WHERE ${conditions.join(' AND ')}
        ORDER BY capture_date DESC, keyword ASC, rank_absolute ASC
        LIMIT $${params.length}`,
      params
    )

    const hasMore = rows.length > limit
    const page = rows.slice(0, limit)

    return {
      ok: true,
      seoTargetId,
      organizationId,
      rows: page.map(row => ({
        keyword: row.keyword,
        engine: row.engine,
        device: row.device,
        captureDate: row.capture_date,
        rankAbsolute: row.rank_absolute,
        rankGroup: row.rank_group,
        itemType: row.item_type,
        resultDomain: row.result_domain,
        resultUrl: row.result_url,
        resultTitle: row.result_title,
        isOwnDomain: row.is_own_domain
      })),
      hasMore
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_serp_top_results_reader' },
      extra: { seoTargetId }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}
