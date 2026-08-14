/**
 * TASK-1664 — Reader único del keyword discovery (app, Nexa, lane ecosystem y MCP).
 *
 * Compone en memoria las TRES lentes de un candidato, sin mezclarlas jamás:
 * - **procedencia** (esta tabla): run, seed, endpoint, rank, `captured_at`;
 * - **mercado estimado ◑** (store de TASK-1661, por `(keyword, país, idioma)`): volumen,
 *   dificultad, intención, `core_keyword`, barrera de enlaces — vía `readKeywordMarketData`,
 *   nunca SQL directo a esa tabla;
 * - **demanda medida ●** (GSC del propio Space): impresiones + posición ponderada, como campo
 *   SEPARADO (`measuredGsc`). Nunca se rellena `searchVolume` desde GSC ni `position` desde Labs.
 *
 * La ausencia de mercado no elimina la fila ni la convierte en cero: viaja como `null` +
 * `marketAvailability`.
 */

import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  MAX_GSC_SEED_WINDOW_DAYS,
  type SeoDiscoveryActionKind,
  type SeoDiscoveryErrorCode,
  type SeoDiscoveryMethod,
  type SeoDiscoveryRunStatus,
  type SeoDiscoverySourceKind
} from './contracts'
import type { ResolvedDiscoverySeed } from './queue'
import type { SeoLinkBarrierLevel } from '../contracts'
import { normalizeMarketKeyword, readKeywordMarketData, type SeoSearchIntent } from '../keyword-market-data'

// ─── DTOs ───────────────────────────────────────────────────────────────────────────

export interface SeoDiscoveryRunView {
  runId: string
  seoTargetId: string
  sourceKind: SeoDiscoverySourceKind
  status: SeoDiscoveryRunStatus
  locationCode: string
  languageCode: string
  seeds: ResolvedDiscoverySeed[]
  methods: Array<{ method: SeoDiscoveryMethod; resultsPerCall: number }>
  estimatedCostUsd: number
  actualCostUsd: number | null
  providerCalls: number
  candidateCount: number
  errorCode: string | null
  createdBy: string
  requestedAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface SeoDiscoveryCandidateView {
  candidateId: string
  runId: string
  keyword: string
  normalizedKeyword: string
  sourceEndpoint: SeoDiscoveryMethod
  sourceRank: number | null
  seedKeywords: string[]
  capturedAt: string
  /** Lente estimada de mercado (◑). Fijo por procedencia del candidato. */
  source: 'dataforseo_labs'
  measurementKind: 'estimated_market'
  displayMarker: '◑'
  providerLastUpdatedAt: string | null
  searchVolume: number | null
  difficulty: number | null
  /** ⚠️ Competencia PAGA (Google Ads) 0–1. NUNCA renombrarla a dificultad. */
  competition: number | null
  intent: SeoSearchIntent | null
  coreKeyword: string | null
  linkBarrier: SeoLinkBarrierLevel | null
  /** Demanda MEDIDA del propio Space (●), como lente separada. */
  measuredGsc: { impressions: number; position: number | null; displayMarker: '●' } | null
  alreadyTracked: boolean
  latestAction: { kind: SeoDiscoveryActionKind; actor: string; at: string } | null
  /** `true` si la keyword coincide exactamente con una seed de la corrida. */
  matchesSeed: boolean
}

export interface ReadKeywordDiscoveryInput {
  organizationId: string
  seoTargetId?: string
  runId?: string
  status?: SeoDiscoveryRunStatus
  sourceEndpoint?: SeoDiscoveryMethod
  /** Filtro de texto sobre la keyword del candidato (contains, case-insensitive). */
  query?: string
  intent?: SeoSearchIntent
  minSearchVolume?: number
  maxDifficulty?: number
  limit?: number
  cursor?: string | null
}

export type ReadKeywordDiscoveryResult =
  | {
      ok: true
      runs: SeoDiscoveryRunView[]
      /** Presente sólo cuando se pidió `runId`. */
      run: SeoDiscoveryRunView | null
      candidates: SeoDiscoveryCandidateView[]
      totalCandidates: number
      nextCursor: string | null
      marketAvailability: 'available' | 'unavailable'
      /** Fecha máxima de captura de mercado disponible para las keywords servidas. */
      marketFreshness: string | null
      /** Disclosure fijo: seguir una keyword compromete gasto recurrente (rank capture diario). */
      trackingCostDisclosure: string
    }
  | { ok: false; errorCode: SeoDiscoveryErrorCode }

/** Techo server-side de candidatos por página (la spec fija 200). */
export const MAX_DISCOVERY_READ_LIMIT = 200

const DEFAULT_DISCOVERY_READ_LIMIT = 50

const RUNS_LIST_LIMIT = 20

export const TRACKING_COST_DISCLOSURE =
  'Seguir una keyword compromete gasto recurrente: el rank capture diario le paga al proveedor por cada keyword vigente hasta dejar de seguirla.'

// ─── Row shapes ─────────────────────────────────────────────────────────────────────

type RunRow = {
  run_id: string
  seo_target_id: string
  source_kind: string
  status: string
  location_code: string
  language_code: string
  seed_inputs_json: unknown
  methods_json: unknown
  estimated_cost_usd: string
  actual_cost_usd: string | null
  provider_calls: number
  candidate_count: number
  error_code: string | null
  created_by: string
  requested_at: Date
  started_at: Date | null
  completed_at: Date | null
}

const toRunView = (row: RunRow): SeoDiscoveryRunView => {
  const seedInputs =
    typeof row.seed_inputs_json === 'object' && row.seed_inputs_json !== null
      ? (row.seed_inputs_json as { seeds?: ResolvedDiscoverySeed[] })
      : {}

  const methods = Array.isArray(row.methods_json)
    ? (row.methods_json as Array<{ method: SeoDiscoveryMethod; resultsPerCall: number }>)
    : []

  return {
    runId: row.run_id,
    seoTargetId: row.seo_target_id,
    sourceKind: row.source_kind as SeoDiscoverySourceKind,
    status: row.status as SeoDiscoveryRunStatus,
    locationCode: row.location_code,
    languageCode: row.language_code,
    seeds: Array.isArray(seedInputs.seeds) ? seedInputs.seeds : [],
    methods,
    estimatedCostUsd: Number(row.estimated_cost_usd),
    actualCostUsd: row.actual_cost_usd === null ? null : Number(row.actual_cost_usd),
    providerCalls: row.provider_calls,
    candidateCount: row.candidate_count,
    errorCode: row.error_code,
    createdBy: row.created_by,
    requestedAt: row.requested_at.toISOString(),
    startedAt: row.started_at ? row.started_at.toISOString() : null,
    completedAt: row.completed_at ? row.completed_at.toISOString() : null
  }
}

// ─── Reader ─────────────────────────────────────────────────────────────────────────

export const readKeywordDiscovery = async (
  input: ReadKeywordDiscoveryInput
): Promise<ReadKeywordDiscoveryResult> => {
  const limit = Math.min(MAX_DISCOVERY_READ_LIMIT, Math.max(1, Math.floor(input.limit ?? DEFAULT_DISCOVERY_READ_LIMIT)))
  const offset = input.cursor ? Math.max(0, Number.parseInt(input.cursor, 10) || 0) : 0

  // Historial de corridas (tenant-safe SIEMPRE por org; target opcional).
  const runRows = await runGreenhousePostgresQuery<RunRow>(
    `SELECT run_id, seo_target_id, source_kind, status, location_code, language_code,
            seed_inputs_json, methods_json, estimated_cost_usd::text, actual_cost_usd::text,
            provider_calls, candidate_count, error_code, created_by,
            requested_at, started_at, completed_at
       FROM greenhouse_growth.seo_keyword_discovery_runs
      WHERE organization_id = $1
        AND ($2::text IS NULL OR seo_target_id = $2)
        AND ($3::text IS NULL OR run_id = $3)
        AND ($4::text IS NULL OR status = $4)
      ORDER BY requested_at DESC
      LIMIT $5`,
    [input.organizationId, input.seoTargetId ?? null, input.runId ?? null, input.status ?? null, RUNS_LIST_LIMIT]
  )

  if (input.runId && runRows.length === 0) {
    // Anti-oracle: un run de otra org "no existe" para este caller.
    return { ok: false, errorCode: 'run_not_found' }
  }

  const runs = runRows.map(toRunView)
  const run = input.runId ? (runs[0] ?? null) : null

  if (!input.runId) {
    return {
      ok: true,
      runs,
      run: null,
      candidates: [],
      totalCandidates: 0,
      nextCursor: null,
      marketAvailability: 'unavailable',
      marketFreshness: null,
      trackingCostDisclosure: TRACKING_COST_DISCLOSURE
    }
  }

  // Candidatos de la corrida (≤500 por contrato): se leen completos, se componen en memoria
  // y la paginación es sobre el orden compuesto — con este techo es correcto y honesto.
  const candidateRows = await runGreenhousePostgresQuery<{
    candidate_id: string
    run_id: string
    keyword: string
    normalized_keyword: string
    seed_keywords_json: unknown
    source_endpoint: string
    source_rank: number | null
    captured_at: Date
  }>(
    `SELECT candidate_id, run_id, keyword, normalized_keyword, seed_keywords_json,
            source_endpoint, source_rank, captured_at
       FROM greenhouse_growth.seo_keyword_discovery_candidates
      WHERE run_id = $1
        AND organization_id = $2
        AND ($3::text IS NULL OR source_endpoint = $3)
        AND ($4::text IS NULL OR keyword ILIKE '%' || $4 || '%')
      ORDER BY captured_at DESC, candidate_id ASC`,
    [input.runId, input.organizationId, input.sourceEndpoint ?? null, input.query?.trim() || null]
  )

  const normalizedKeywords = [...new Set(candidateRows.map(row => row.normalized_keyword))]

  const runView = run as SeoDiscoveryRunView

  // Lente de mercado (◑) por el reader canónico del store 1661 — jamás SQL directo.
  const market = await readKeywordMarketData({
    keywords: normalizedKeywords,
    locationCode: runView.locationCode,
    languageCode: runView.languageCode
  })

  // Lente medida (●): demanda GSC del propio Space, ventana de 28 días.
  const gscRows =
    normalizedKeywords.length === 0
      ? []
      : await runGreenhousePostgresQuery<{ query: string; impressions: string; weighted_position: string | null }>(
          `SELECT query,
                  SUM(impressions)::text AS impressions,
                  (SUM(position * impressions) / NULLIF(SUM(impressions), 0))::text AS weighted_position
             FROM greenhouse_growth.seo_gsc_daily
            WHERE organization_id = $1
              AND capture_date >= (CURRENT_DATE - $2::int)
              AND lower(query) = ANY($3::text[])
            GROUP BY query`,
          [input.organizationId, MAX_GSC_SEED_WINDOW_DAYS, normalizedKeywords]
        )

  const gscByKeyword = new Map<string, { impressions: number; position: number | null }>()

  for (const row of gscRows) {
    gscByKeyword.set(normalizeMarketKeyword(row.query), {
      impressions: Number(row.impressions),
      position: row.weighted_position === null ? null : Number(row.weighted_position)
    })
  }

  // Estado de tracking vigente del target (para `alreadyTracked`; NUNCA muta nada).
  const trackedRows = await runGreenhousePostgresQuery<{ keyword: string }>(
    `SELECT DISTINCT m.keyword
       FROM greenhouse_growth.seo_keyword_set_members m
       JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
      WHERE s.seo_target_id = $1
        AND m.effective_to IS NULL`,
    [runView.seoTargetId]
  )

  const trackedSet = new Set(trackedRows.map(row => normalizeMarketKeyword(row.keyword)))

  // Última acción por candidato (la decisión pendiente ordena primero).
  const candidateIds = candidateRows.map(row => row.candidate_id)

  const actionRows =
    candidateIds.length === 0
      ? []
      : await runGreenhousePostgresQuery<{
          candidate_id: string
          action_kind: string
          actor: string
          created_at: Date
        }>(
          `SELECT DISTINCT ON (candidate_id) candidate_id, action_kind, actor, created_at
             FROM greenhouse_growth.seo_keyword_discovery_actions
            WHERE candidate_id = ANY($1::text[])
            ORDER BY candidate_id, created_at DESC`,
          [candidateIds]
        )

  const actionByCandidate = new Map(actionRows.map(row => [row.candidate_id, row]))

  const seedSet = new Set(runView.seeds.map(seed => seed.normalizedKeyword))

  let candidates: SeoDiscoveryCandidateView[] = candidateRows.map(row => {
    const datum = market.byKeyword.get(row.normalized_keyword) ?? null
    const action = actionByCandidate.get(row.candidate_id) ?? null
    const gsc = gscByKeyword.get(row.normalized_keyword) ?? null

    return {
      candidateId: row.candidate_id,
      runId: row.run_id,
      keyword: row.keyword,
      normalizedKeyword: row.normalized_keyword,
      sourceEndpoint: row.source_endpoint as SeoDiscoveryMethod,
      sourceRank: row.source_rank,
      seedKeywords: Array.isArray(row.seed_keywords_json) ? (row.seed_keywords_json as string[]) : [],
      capturedAt: row.captured_at.toISOString(),
      source: 'dataforseo_labs',
      measurementKind: 'estimated_market',
      displayMarker: '◑',
      providerLastUpdatedAt: datum?.providerLastUpdatedAt ?? null,
      searchVolume: datum?.searchVolume ?? null,
      difficulty: datum?.keywordDifficulty ?? null,
      competition: datum?.competition ?? null,
      intent: datum?.searchIntent ?? null,
      coreKeyword: datum?.coreKeyword ?? null,
      linkBarrier: market.linkBarrierByKeyword.get(row.normalized_keyword) ?? null,
      measuredGsc: gsc ? { impressions: gsc.impressions, position: gsc.position, displayMarker: '●' } : null,
      alreadyTracked: trackedSet.has(row.normalized_keyword),
      latestAction: action
        ? { kind: action.action_kind as SeoDiscoveryActionKind, actor: action.actor, at: action.created_at.toISOString() }
        : null,
      matchesSeed: seedSet.has(row.normalized_keyword)
    }
  })

  // Filtros sobre la lente de mercado: la AUSENCIA del dato no excluye la fila cuando el
  // filtro no aplica a esa dimensión, pero un filtro explícito sí exige el dato presente.
  if (input.intent) candidates = candidates.filter(candidate => candidate.intent === input.intent)

  if (typeof input.minSearchVolume === 'number') {
    candidates = candidates.filter(
      candidate => candidate.searchVolume !== null && candidate.searchVolume >= (input.minSearchVolume as number)
    )
  }

  if (typeof input.maxDifficulty === 'number') {
    candidates = candidates.filter(
      candidate => candidate.difficulty !== null && candidate.difficulty <= (input.maxDifficulty as number)
    )
  }

  // Orden por defecto de la spec (7 llaves, desempate estable). No inventa un score único.
  candidates.sort((a, b) => {
    const pendingA = a.latestAction === null ? 0 : 1
    const pendingB = b.latestAction === null ? 0 : 1

    if (pendingA !== pendingB) return pendingA - pendingB

    const seedA = a.matchesSeed ? 0 : 1
    const seedB = b.matchesSeed ? 0 : 1

    if (seedA !== seedB) return seedA - seedB

    const coreA = a.coreKeyword !== null ? 0 : 1
    const coreB = b.coreKeyword !== null ? 0 : 1

    if (coreA !== coreB) return coreA - coreB

    const volumeA = a.searchVolume ?? -1
    const volumeB = b.searchVolume ?? -1

    if (volumeA !== volumeB) return volumeB - volumeA

    const difficultyA = a.difficulty ?? Number.POSITIVE_INFINITY
    const difficultyB = b.difficulty ?? Number.POSITIVE_INFINITY

    if (difficultyA !== difficultyB) return difficultyA - difficultyB

    if (a.capturedAt !== b.capturedAt) return a.capturedAt < b.capturedAt ? 1 : -1

    return a.candidateId < b.candidateId ? -1 : 1
  })

  const totalCandidates = candidates.length
  const page = candidates.slice(offset, offset + limit)
  const nextCursor = offset + limit < totalCandidates ? String(offset + limit) : null

  return {
    ok: true,
    runs,
    run: runView,
    candidates: page,
    totalCandidates,
    nextCursor,
    marketAvailability: market.market,
    marketFreshness: market.freshness.latestCaptureDate,
    trackingCostDisclosure: TRACKING_COST_DISCLOSURE
  }
}
