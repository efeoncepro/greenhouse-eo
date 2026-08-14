/**
 * TASK-1664 — Runner async del keyword discovery (ops-worker).
 *
 * Ejecuta corridas `pending` reclamadas atómicamente (`pending → running`, un UPDATE
 * condicional: el segundo worker matchea cero filas y devuelve `busy` sin gastar). Las
 * llamadas al proveedor corren FUERA de transacción (hasta 24 llamadas Live no pueden
 * sostener una tx); el cierre — candidatos + estado del run + outbox — es UNA transacción.
 *
 * Contrato de gasto (patrón TASK-1303/1661):
 * - gate `enforceSeoRunEntitlement` con el estimado completo ANTES de la primera llamada;
 * - spend fence: re-consulta cada 10 llamadas cobradas; si se agota, se conserva lo
 *   materializado y el run cierra `budget_blocked`/`partial` con costo real;
 * - el ledger lo escribe el TRANSPORTE (el entrypoint del worker importa
 *   `register-provider-spend`);
 * - el `keyword_info` inline YA PAGADO se persiste en el store de TASK-1661
 *   (`persistKeywordMarketData`); `keyword_overview` es top-up SOLO del faltante/vencido.
 *
 * Degradación honesta: proveedor caído NUNCA se disfraza de lista vacía; `no_results` es un
 * hecho (task 20000 con cero items), no un error.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  MAX_DISCOVERY_CANDIDATES_PER_RUN,
  MAX_DISCOVERY_ENRICHMENT_KEYWORDS,
  MAX_DISCOVERY_OVERVIEW_KEYWORDS_PER_CALL,
  MAX_DISCOVERY_PROVIDER_CALLS,
  SEO_KEYWORD_DISCOVERY_AGGREGATE_TYPE,
  SEO_KEYWORD_DISCOVERY_COMPLETED_EVENT,
  estimateDiscoveryCost,
  type SeoDiscoveryErrorCode,
  type SeoDiscoveryMethod,
  type SeoDiscoveryMethodSpec,
  type SeoDiscoveryRunStatus
} from './contracts'
import { callDiscoveryMethod, callKeywordOverview, type DiscoveryCallOutcome } from './provider'
import type { ResolvedDiscoverySeed } from './queue'
import { enforceSeoRunEntitlement } from '../entitlement'
import { isSeoKeywordDiscoveryEnabled, isSeoModuleEnabled } from '../flags'
import {
  loadFreshMarketKeywords,
  normalizeMarketKeyword,
  persistKeywordMarketData,
  type SeoKeywordMarketDatum
} from '../keyword-market-data'

/** Espejo del patrón TASK-1303/1661: re-consulta del gate cada K llamadas cobradas. */
const SPEND_FENCE_RECHECK_EVERY = 10

const RUNNER_ACTOR = 'system:seo-keyword-discovery-runner'

// ─── Tipos ──────────────────────────────────────────────────────────────────────────

export type RunKeywordDiscoveryResult =
  | {
      ok: true
      runId: string
      status: SeoDiscoveryRunStatus
      candidateCount: number
      providerCalls: number
      actualCostUsd: number
      marketRowsWritten: number
      errorCode: string | null
    }
  | { ok: false; errorCode: SeoDiscoveryErrorCode }

export interface DrainKeywordDiscoverySummary {
  pending: number
  processed: number
  succeeded: number
  partial: number
  noResults: number
  failed: number
  budgetBlocked: number
  busy: number
  outcomes: Array<{ runId: string; status: string }>
}

// `type` y no `interface`: el genérico de `runGreenhousePostgresQuery` exige
// `Record<string, unknown>`, y una interface no lo satisface (sin index signature implícito).
type ClaimedRun = {
  run_id: string
  organization_id: string
  seo_target_id: string
  location_code: string
  language_code: string
  seed_inputs_json: unknown
  methods_json: unknown
  estimated_cost_usd: string
  root_domain: string
}

interface CandidateAccumulator {
  keyword: string
  normalizedKeyword: string
  sourceEndpoint: SeoDiscoveryMethod
  sourceRank: number
  seeds: Set<string>
  rawPayloadHash: string
}

// ─── Runner de UNA corrida ──────────────────────────────────────────────────────────

export const runKeywordDiscovery = async (runId: string): Promise<RunKeywordDiscoveryResult> => {
  if (!isSeoModuleEnabled() || !isSeoKeywordDiscoveryEnabled()) {
    return { ok: false, errorCode: 'seo_keyword_discovery_disabled' }
  }

  // Claim atómico pending → running. Un UPDATE condicional es el lock: el segundo worker
  // matchea cero filas y responde `busy` sin tocar al proveedor.
  const claimed = await runGreenhousePostgresQuery<ClaimedRun>(
    `UPDATE greenhouse_growth.seo_keyword_discovery_runs r
        SET status = 'running', started_at = clock_timestamp()
       FROM greenhouse_growth.seo_targets t
      WHERE r.run_id = $1
        AND r.status = 'pending'
        AND t.seo_target_id = r.seo_target_id
      RETURNING r.run_id, r.organization_id, r.seo_target_id, r.location_code, r.language_code,
                r.seed_inputs_json, r.methods_json, r.estimated_cost_usd::text, t.root_domain`,
    [runId]
  )

  const run = claimed[0]

  if (!run) return { ok: false, errorCode: 'busy' }

  try {
    return await executeClaimedRun(run)
  } catch (error) {
    // Falla inesperada: el run cierra `failed` con lo que alcanzó a medirse — dejarlo
    // `running` para siempre convertiría un bug en una señal de stuck permanente.
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_keyword_discovery_runner' },
      extra: { runId }
    })

    await finalizeRun(run, {
      status: 'failed',
      errorCode: 'unexpected_error',
      candidates: [],
      providerCalls: 0,
      actualCostUsd: 0
    }).catch(() => undefined)

    return {
      ok: true,
      runId: run.run_id,
      status: 'failed',
      candidateCount: 0,
      providerCalls: 0,
      actualCostUsd: 0,
      marketRowsWritten: 0,
      errorCode: 'unexpected_error'
    }
  }
}

const executeClaimedRun = async (run: ClaimedRun): Promise<RunKeywordDiscoveryResult> => {
  const seeds = parseSeeds(run.seed_inputs_json)
  const methods = parseMethods(run.methods_json)

  const context = {
    organizationId: run.organization_id,
    locationCode: run.location_code,
    languageCode: run.language_code
  }

  // Gate ANTES de la primera llamada: entre el enqueue y el drain pudo pasar cualquier cosa
  // (otra corrida agotó el presupuesto, venció el assignment).
  const gate = await enforceSeoRunEntitlement(run.organization_id, {
    estimatedCostUsd: Number(run.estimated_cost_usd),
    consumesAuditAllowance: false
  })

  if (!gate.allowed) {
    await finalizeRun(run, {
      status: 'budget_blocked',
      errorCode: gate.blockedReason ?? 'budget_exhausted',
      candidates: [],
      providerCalls: 0,
      actualCostUsd: 0
    })

    return {
      ok: true,
      runId: run.run_id,
      status: 'budget_blocked',
      candidateCount: 0,
      providerCalls: 0,
      actualCostUsd: 0,
      marketRowsWritten: 0,
      errorCode: gate.blockedReason ?? 'budget_exhausted'
    }
  }

  const candidates = new Map<string, CandidateAccumulator>()
  let providerCalls = 0
  let chargedCalls = 0
  let actualCostUsd = 0
  let providerErrors = 0
  let successfulCalls = 0
  let marketRowsWritten = 0
  let fenceTripped = false
  let breakerOpen = false

  const checkFence = async (): Promise<boolean> => {
    if (fenceTripped) return false

    if (chargedCalls > 0 && chargedCalls % SPEND_FENCE_RECHECK_EVERY === 0) {
      const fence = await enforceSeoRunEntitlement(run.organization_id, {
        // Conservador: lo que falta se estima como el costo de una llamada máxima.
        estimatedCostUsd: estimateDiscoveryCost({
          seedCount: 1,
          methods: [{ method: 'keyword_ideas', resultsPerCall: 100 }],
          enrichmentKeywords: 0
        }).estimatedCostUsd,
        consumesAuditAllowance: false
      })

      if (!fence.allowed) fenceTripped = true
    }

    return !fenceTripped
  }

  const registerOutcome = async (outcome: DiscoveryCallOutcome, subcall: { method: SeoDiscoveryMethod; seeds: string[] }) => {
    providerCalls += 1

    if (outcome.costUsd > 0) chargedCalls += 1

    actualCostUsd += outcome.costUsd

    if (!outcome.ok) {
      providerErrors += 1

      if (outcome.errorCode === 'breaker_open') breakerOpen = true

      return
    }

    successfulCalls += 1

    // Los items con métrica inline YA PAGADA van al store de mercado (segundo productor
    // del hecho de TASK-1661) — tirarlos obligaría a re-comprarlos en el top-up.
    const datums: SeoKeywordMarketDatum[] = []

    for (const item of outcome.items) {
      if (item.datum) datums.push(item.datum)
    }

    if (datums.length > 0) {
      const persisted = await persistKeywordMarketData({
        data: datums,
        sourceEndpoint: subcall.method,
        capturedByOrganizationId: run.organization_id,
        providerCostUsd: outcome.costUsd
      })

      marketRowsWritten += persisted.rowsWritten
    }

    for (const item of outcome.items) {
      const normalized = normalizeMarketKeyword(item.keyword)

      if (!normalized) continue

      const key = `${subcall.method}:${normalized}`
      const existing = candidates.get(key)

      if (existing) {
        for (const seed of subcall.seeds) existing.seeds.add(seed)

        continue
      }

      // Techo duro de candidatos por corrida: lo que excede se descarta contado, nunca
      // en silencio (queda visible en la diferencia items-vs-candidatos del summary).
      if (candidates.size >= MAX_DISCOVERY_CANDIDATES_PER_RUN) continue

      candidates.set(key, {
        keyword: item.keyword,
        normalizedKeyword: normalized,
        sourceEndpoint: subcall.method,
        sourceRank: item.sourceRank,
        seeds: new Set(subcall.seeds),
        rawPayloadHash: outcome.rawPayloadHash
      })
    }
  }

  // ── Expansión: sugerencias/relacionadas = por seed; ideas/dominio = por corrida ──
  for (const spec of methods) {
    if (breakerOpen) break

    const subcalls: Array<{ seed?: string; seeds?: string[]; targetDomain?: string; seedsLabel: string[] }> =
      spec.method === 'keyword_suggestions' || spec.method === 'related_keywords'
        ? seeds.map(seed => ({ seed: seed.keyword, seedsLabel: [seed.keyword] }))
        : spec.method === 'keyword_ideas'
          ? [{ seeds: seeds.map(seed => seed.keyword), seedsLabel: seeds.map(seed => seed.keyword) }]
          : [{ targetDomain: run.root_domain, seedsLabel: [run.root_domain] }]

    for (const [index, subcall] of subcalls.entries()) {
      if (breakerOpen) break

      if (providerCalls >= MAX_DISCOVERY_PROVIDER_CALLS) break

      if (!(await checkFence())) break

      try {
        const outcome = await callDiscoveryMethod(
          spec.method,
          { seed: subcall.seed, seeds: subcall.seeds, targetDomain: subcall.targetDomain, limit: spec.resultsPerCall },
          { ...context, tag: `seokd:${run.run_id}:${spec.method}:${index}` }
        )

        await registerOutcome(outcome, { method: spec.method, seeds: subcall.seedsLabel })
      } catch (error) {
        // Excepción del transporte (red/timeout): subllamada fallida, la corrida sigue.
        providerCalls += 1
        providerErrors += 1
        captureWithDomain(error, 'growth', {
          tags: { source: 'seo_keyword_discovery_runner' },
          extra: { runId: run.run_id, method: spec.method, subcall: index }
        })
      }
    }
  }

  // ── Enriquecimiento top-up: SOLO keywords sin métrica vigente en el store ──
  if (!breakerOpen && !fenceTripped && candidates.size > 0) {
    const uniqueKeywords = [...new Set([...candidates.values()].map(candidate => candidate.normalizedKeyword))].slice(
      0,
      MAX_DISCOVERY_ENRICHMENT_KEYWORDS
    )

    const fresh = await loadFreshMarketKeywords(uniqueKeywords, run.location_code, run.language_code)
    const pendingEnrichment = uniqueKeywords.filter(keyword => !fresh.has(keyword))

    for (
      let offset = 0;
      offset < pendingEnrichment.length && providerCalls < MAX_DISCOVERY_PROVIDER_CALLS;
      offset += MAX_DISCOVERY_OVERVIEW_KEYWORDS_PER_CALL
    ) {
      if (!(await checkFence())) break

      const chunk = pendingEnrichment.slice(offset, offset + MAX_DISCOVERY_OVERVIEW_KEYWORDS_PER_CALL)

      try {
        const outcome = await callKeywordOverview(
          { keywords: chunk },
          { ...context, tag: `seokd:${run.run_id}:keyword_overview:${offset}` }
        )

        providerCalls += 1

        if (outcome.costUsd > 0) chargedCalls += 1

        actualCostUsd += outcome.costUsd

        if (!outcome.ok) {
          providerErrors += 1

          if (outcome.errorCode === 'breaker_open') breakerOpen = true

          continue
        }

        // Tres estados (contrato del store 1661): lo preguntado y ausente se escribe con
        // NULLs para no re-comprarlo dentro del mismo ciclo mensual.
        const byNormalized = new Map<string, SeoKeywordMarketDatum>()

        for (const item of outcome.items) {
          if (item.datum) byNormalized.set(item.datum.normalizedKeyword, item.datum)
        }

        const datums: SeoKeywordMarketDatum[] = chunk.map(
          keyword =>
            byNormalized.get(keyword) ?? {
              normalizedKeyword: keyword,
              keyword,
              locationCode: run.location_code,
              languageCode: run.language_code,
              searchVolume: null,
              keywordDifficulty: null,
              competition: null,
              competitionLevel: null,
              cpcUsd: null,
              searchIntent: null,
              searchIntentProbability: null,
              coreKeyword: null,
              providerLastUpdatedAt: null,
              avgPageRank: null,
              avgMainDomainRank: null,
              avgBacklinks: null,
              avgReferringDomains: null
            }
        )

        const persisted = await persistKeywordMarketData({
          data: datums,
          sourceEndpoint: 'keyword_overview',
          capturedByOrganizationId: run.organization_id,
          providerCostUsd: outcome.costUsd
        })

        marketRowsWritten += persisted.rowsWritten
      } catch (error) {
        providerCalls += 1
        providerErrors += 1
        captureWithDomain(error, 'growth', {
          tags: { source: 'seo_keyword_discovery_runner' },
          extra: { runId: run.run_id, method: 'keyword_overview', offset }
        })
      }
    }
  }

  // ── Estado honesto ──
  const candidateList = [...candidates.values()]

  let status: SeoDiscoveryRunStatus
  let errorCode: string | null = null

  if (fenceTripped) {
    status = candidateList.length > 0 ? 'partial' : 'budget_blocked'
    errorCode = 'budget_exhausted'
  } else if (providerErrors > 0 && successfulCalls === 0 && methods.length > 0) {
    status = 'failed'
    errorCode = breakerOpen ? 'breaker_open' : 'provider_error'
  } else if (providerErrors > 0 && candidateList.length > 0) {
    status = 'partial'
    errorCode = breakerOpen ? 'breaker_open' : 'provider_error'
  } else if (candidateList.length === 0) {
    // Incluye la corrida GSC-only (cero métodos): pipeline validado, cero gasto, cero filas.
    status = 'no_results'
    errorCode = providerErrors > 0 ? 'provider_error' : null
  } else {
    status = 'succeeded'
  }

  const inserted = await finalizeRun(run, {
    status,
    errorCode,
    candidates: candidateList,
    providerCalls,
    actualCostUsd
  })

  return {
    ok: true,
    runId: run.run_id,
    status,
    candidateCount: inserted,
    providerCalls,
    actualCostUsd: Number(actualCostUsd.toFixed(6)),
    marketRowsWritten,
    errorCode
  }
}

// ─── Cierre transaccional ───────────────────────────────────────────────────────────

const finalizeRun = async (
  run: ClaimedRun,
  input: {
    status: SeoDiscoveryRunStatus
    errorCode: string | null
    candidates: CandidateAccumulator[]
    providerCalls: number
    actualCostUsd: number
  }
): Promise<number> =>
  withGreenhousePostgresTransaction(async client => {
    let insertedCount = 0

    for (const candidate of input.candidates) {
      const result = await client.query(
        `INSERT INTO greenhouse_growth.seo_keyword_discovery_candidates
           (run_id, organization_id, seo_target_id, keyword, normalized_keyword,
            seed_keywords_json, source_endpoint, source_rank, raw_payload_hash)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
         ON CONFLICT ON CONSTRAINT seo_keyword_discovery_candidates_provenance_unique DO NOTHING`,
        [
          run.run_id,
          run.organization_id,
          run.seo_target_id,
          candidate.keyword.slice(0, 255),
          candidate.normalizedKeyword.slice(0, 255),
          JSON.stringify([...candidate.seeds]),
          candidate.sourceEndpoint,
          candidate.sourceRank,
          candidate.rawPayloadHash
        ]
      )

      insertedCount += result.rowCount ?? 0
    }

    // Sólo transiciones desde `running`: un run ya cerrado por otro camino no se reescribe.
    await client.query(
      `UPDATE greenhouse_growth.seo_keyword_discovery_runs
          SET status = $2,
              error_code = $3,
              provider_calls = $4,
              actual_cost_usd = $5,
              candidate_count = candidate_count + $6,
              completed_at = clock_timestamp()
        WHERE run_id = $1
          AND status = 'running'`,
      [run.run_id, input.status, input.errorCode, input.providerCalls, Number(input.actualCostUsd.toFixed(6)), insertedCount]
    )

    await publishOutboxEvent(
      {
        aggregateType: SEO_KEYWORD_DISCOVERY_AGGREGATE_TYPE,
        aggregateId: run.seo_target_id,
        eventType: SEO_KEYWORD_DISCOVERY_COMPLETED_EVENT,
        payload: {
          runId: run.run_id,
          organizationId: run.organization_id,
          seoTargetId: run.seo_target_id,
          status: input.status,
          errorCode: input.errorCode,
          candidateCount: insertedCount,
          providerCalls: input.providerCalls,
          actualCostUsd: Number(input.actualCostUsd.toFixed(6)),
          actor: RUNNER_ACTOR
        }
      },
      client
    )

    return insertedCount
  })

// ─── Drain (Cloud Scheduler → ops-worker) ───────────────────────────────────────────

/**
 * Drena corridas `pending` por orden de llegada, con resiliencia per-run: una corrida que
 * lanza se registra y el batch continúa. El scheduler `ops-seo-keyword-discovery-drain`
 * (nace PAUSADO) lo invoca cada 10 minutos; el outbox NO despacha nada en este dominio.
 */
export const drainKeywordDiscoveryRuns = async (
  options: { maxRuns?: number } = {}
): Promise<DrainKeywordDiscoverySummary> => {
  const empty: DrainKeywordDiscoverySummary = {
    pending: 0,
    processed: 0,
    succeeded: 0,
    partial: 0,
    noResults: 0,
    failed: 0,
    budgetBlocked: 0,
    busy: 0,
    outcomes: []
  }

  if (!isSeoModuleEnabled() || !isSeoKeywordDiscoveryEnabled()) return empty

  const maxRuns = Math.max(1, Math.floor(options.maxRuns ?? 5))

  const pendingRows = await runGreenhousePostgresQuery<{ run_id: string }>(
    `SELECT run_id
       FROM greenhouse_growth.seo_keyword_discovery_runs
      WHERE status = 'pending'
      ORDER BY requested_at
      LIMIT $1`,
    [maxRuns]
  )

  const summary: DrainKeywordDiscoverySummary = { ...empty, pending: pendingRows.length, outcomes: [] }

  for (const row of pendingRows) {
    try {
      const result = await runKeywordDiscovery(row.run_id)

      if (!result.ok) {
        summary.busy += result.errorCode === 'busy' ? 1 : 0
        summary.outcomes.push({ runId: row.run_id, status: result.errorCode })

        continue
      }

      summary.processed += 1

      if (result.status === 'succeeded') summary.succeeded += 1
      else if (result.status === 'partial') summary.partial += 1
      else if (result.status === 'no_results') summary.noResults += 1
      else if (result.status === 'budget_blocked') summary.budgetBlocked += 1
      else summary.failed += 1

      summary.outcomes.push({ runId: row.run_id, status: result.status })
    } catch (error) {
      summary.failed += 1
      summary.outcomes.push({ runId: row.run_id, status: 'failed' })
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_keyword_discovery_drain' },
        extra: { runId: row.run_id }
      })
    }
  }

  return summary
}

// ─── Helpers de parsing del snapshot del run ────────────────────────────────────────

const parseSeeds = (raw: unknown): ResolvedDiscoverySeed[] => {
  if (typeof raw !== 'object' || raw === null) return []

  const seeds = (raw as { seeds?: unknown }).seeds

  return Array.isArray(seeds) ? (seeds as ResolvedDiscoverySeed[]) : []
}

const parseMethods = (raw: unknown): SeoDiscoveryMethodSpec[] =>
  Array.isArray(raw) ? (raw as SeoDiscoveryMethodSpec[]) : []
