/**
 * TASK-1664 — Enqueue de corridas de keyword discovery + action log append-only.
 *
 * `queueKeywordDiscovery` es la ÚNICA puerta de entrada de una corrida: resuelve seeds
 * server-side, calcula el costo conservador, consulta el chokepoint de entitlement y deja
 * run `pending` + evento outbox en UNA transacción. NO llama al proveedor — eso es del
 * runner en el ops-worker (el disparo real es Cloud Scheduler → drain, no el outbox).
 *
 * `recordKeywordDiscoveryAction` registra decisiones humanas posteriores sobre un candidato.
 * Es un log, no un ejecutor: jamás llama `trackKeywords` ni escribe `seo_keyword_set_members`.
 */

import 'server-only'

import { createHash } from 'node:crypto'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  MAX_DISCOVERY_EXPANSION_METHODS,
  MAX_DISCOVERY_RESULTS_PER_CALL,
  DEFAULT_DISCOVERY_RESULTS_PER_CALL,
  MAX_DISCOVERY_SEEDS,
  MAX_GSC_SEED_WINDOW_DAYS,
  SEO_DISCOVERY_DEFAULT_VOLUME_POLICY,
  SEO_DISCOVERY_METHODS,
  SEO_KEYWORD_DISCOVERY_AGGREGATE_TYPE,
  SEO_KEYWORD_DISCOVERY_REQUESTED_EVENT,
  estimateDiscoveryCost,
  validateSeedKeyword,
  type SeoDiscoveryCostEstimate,
  type SeoDiscoveryActionKind,
  type SeoDiscoveryErrorCode,
  type SeoDiscoveryMethod,
  type SeoDiscoveryMethodSpec,
  type SeoDiscoverySourceKind
} from './contracts'
import { enforceSeoRunEntitlement } from '../entitlement'
import { isSeoKeywordDiscoveryEnabled, isSeoModuleEnabled } from '../flags'
import { normalizeMarketKeyword } from '../keyword-market-data'
import { resolveSeoTargetForMarket } from '../resolve-target'

// ─── Tipos del command ──────────────────────────────────────────────────────────────

/** Seed resuelta server-side. `origin` conserva la procedencia por seed (fuente `mixed`). */
export interface ResolvedDiscoverySeed {
  keyword: string
  normalizedKeyword: string
  origin: 'manual' | 'gsc_queries' | 'tracked_keywords'
  /** Sólo seeds derivadas de GSC: demanda medida que justificó la seed. */
  impressions?: number
}

export interface QueueKeywordDiscoveryInput {
  organizationId: string
  /** Target explícito (se valida contra la org) o resolución por mercado (ISSUE-153). */
  seoTargetId?: string
  market?: string | null
  seedSource: SeoDiscoverySourceKind
  /** Requerido para `manual` y `mixed`; ignorado para el resto. */
  manualSeeds?: readonly string[]
  /** Fuente medida que acompaña a `manual` cuando `seedSource === 'mixed'`. */
  mixedMeasuredSource?: 'gsc_queries' | 'tracked_keywords'
  methods: ReadonlyArray<{ method: SeoDiscoveryMethod; resultsPerCall?: number }>
  actor: string
  /** Si no viene, se deriva del intent completo (org+target+seeds+mercado+methods+actor). */
  idempotencyKey?: string
  env?: NodeJS.ProcessEnv
}

export interface DiscoveryRunLimits {
  maxSeeds: number
  maxExpansionMethods: number
  maxResultsPerCall: number
  maxCandidates: number
  maxEnrichmentKeywords: number
  maxProviderCalls: number
}

export type QueueKeywordDiscoveryResult =
  | {
      ok: true
      runId: string
      /** `true` = el mismo intent ya existía; no se insertó ni se gastará de nuevo. */
      deduped: boolean
      estimatedCostUsd: number
      providerCalls: number
      formula: string
      seedCount: number
      budgetRemainingUsd: number | null
    }
  | { ok: false; errorCode: SeoDiscoveryErrorCode; blockedReason?: string | null; reason?: string }

export type PreviewKeywordDiscoveryResult =
  | {
      ok: true
      organizationId: string
      seoTargetId: string
      locationCode: string
      languageCode: string
      seeds: ResolvedDiscoverySeed[]
      estimate: SeoDiscoveryCostEstimate
      budgetRemainingUsd: number | null
      wouldBeAllowed: boolean
      blockedReason: string | null
    }
  | { ok: false; errorCode: SeoDiscoveryErrorCode; blockedReason?: string | null; reason?: string }

// ─── Resolución de target (tenant-safe, mercado explícito) ──────────────────────────

interface ResolvedDiscoveryTarget {
  seoTargetId: string
  organizationId: string
  rootDomain: string
  locationCode: string
  languageCode: string
}

type TargetResolution =
  | { ok: true; target: ResolvedDiscoveryTarget }
  | { ok: false; errorCode: SeoDiscoveryErrorCode; reason?: string }

const resolveDiscoveryTarget = async (input: {
  organizationId: string
  seoTargetId?: string
  market?: string | null
}): Promise<TargetResolution> => {
  if (input.seoTargetId) {
    // Target explícito: se valida que pertenece a la org y está activo. Un ID de otra org
    // responde `target_not_found` (anti-oracle), jamás una diferencia explicativa.
    const rows = await runGreenhousePostgresQuery<{
      seo_target_id: string
      organization_id: string
      root_domain: string
      location_code: string
      language_code: string
    }>(
      `SELECT seo_target_id, organization_id, root_domain, location_code, language_code
         FROM greenhouse_growth.seo_targets
        WHERE seo_target_id = $1
          AND organization_id = $2
          AND status = 'active'`,
      [input.seoTargetId, input.organizationId]
    )

    const row = rows[0]

    if (!row) return { ok: false, errorCode: 'target_not_found' }

    return {
      ok: true,
      target: {
        seoTargetId: row.seo_target_id,
        organizationId: row.organization_id,
        rootDomain: row.root_domain,
        locationCode: row.location_code,
        languageCode: row.language_code
      }
    }
  }

  const resolution = await resolveSeoTargetForMarket(input.organizationId, { market: input.market ?? null })

  if (resolution.status === 'resolved') {
    return {
      ok: true,
      target: {
        seoTargetId: resolution.target.seoTargetId,
        organizationId: input.organizationId,
        rootDomain: resolution.target.rootDomain,
        locationCode: resolution.target.locationCode,
        languageCode: resolution.target.languageCode
      }
    }
  }

  if (resolution.status === 'none') return { ok: false, errorCode: 'target_not_found' }

  // multiple_markets / market_not_found: el caller debe declarar el mercado (ISSUE-153).
  return { ok: false, errorCode: 'invalid_seed', reason: resolution.status }
}

// ─── Resolución de seeds server-side ────────────────────────────────────────────────

type SeedResolution =
  | { ok: true; seeds: ResolvedDiscoverySeed[] }
  | { ok: false; errorCode: SeoDiscoveryErrorCode; reason?: string }

const resolveManualSeeds = (raw: readonly string[]): SeedResolution => {
  const seeds: ResolvedDiscoverySeed[] = []
  const seen = new Set<string>()

  for (const entry of raw) {
    const verdict = validateSeedKeyword(entry)

    if (!verdict.ok) {
      return { ok: false, errorCode: 'invalid_seed', reason: verdict.reason }
    }

    const keyword = entry.trim()
    const normalized = normalizeMarketKeyword(keyword)

    if (seen.has(normalized)) continue

    seen.add(normalized)
    seeds.push({ keyword, normalizedKeyword: normalized, origin: 'manual' })
  }

  if (seeds.length === 0) return { ok: false, errorCode: 'invalid_seed', reason: 'empty' }

  if (seeds.length > MAX_DISCOVERY_SEEDS) return { ok: false, errorCode: 'limit_exceeded', reason: 'too_many_seeds' }

  return { ok: true, seeds }
}

/** Consultas GSC del target/org: demanda MEDIDA como seeds, sin costo de proveedor. */
const resolveGscSeeds = async (organizationId: string, limit: number): Promise<ResolvedDiscoverySeed[]> => {
  const rows = await runGreenhousePostgresQuery<{ query: string; impressions: string }>(
    `SELECT query, SUM(impressions)::text AS impressions
       FROM greenhouse_growth.seo_gsc_daily
      WHERE organization_id = $1
        AND capture_date >= (CURRENT_DATE - $2::int)
      GROUP BY query
     HAVING SUM(impressions) > 0
      ORDER BY SUM(impressions) DESC, query ASC
      LIMIT $3`,
    [organizationId, MAX_GSC_SEED_WINDOW_DAYS, limit * 2]
  )

  const seeds: ResolvedDiscoverySeed[] = []

  for (const row of rows) {
    // Una query GSC que no cabe en los límites Labs se omite (no es un error del operador).
    if (!validateSeedKeyword(row.query).ok) continue

    seeds.push({
      keyword: row.query.trim(),
      normalizedKeyword: normalizeMarketKeyword(row.query),
      origin: 'gsc_queries',
      impressions: Number(row.impressions)
    })

    if (seeds.length >= limit) break
  }

  return seeds
}

/** Keywords VIGENTES del set monitoreado (mismo predicado que el rank capture). */
const resolveTrackedSeeds = async (seoTargetId: string, limit: number): Promise<ResolvedDiscoverySeed[]> => {
  const rows = await runGreenhousePostgresQuery<{ keyword: string }>(
    `SELECT DISTINCT m.keyword
       FROM greenhouse_growth.seo_keyword_set_members m
       JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
      WHERE s.seo_target_id = $1
        AND m.effective_to IS NULL
      ORDER BY m.keyword
      LIMIT $2`,
    [seoTargetId, limit * 2]
  )

  const seeds: ResolvedDiscoverySeed[] = []

  for (const row of rows) {
    if (!validateSeedKeyword(row.keyword).ok) continue

    seeds.push({
      keyword: row.keyword.trim(),
      normalizedKeyword: normalizeMarketKeyword(row.keyword),
      origin: 'tracked_keywords'
    })

    if (seeds.length >= limit) break
  }

  return seeds
}

const resolveSeeds = async (
  input: QueueKeywordDiscoveryInput,
  target: ResolvedDiscoveryTarget
): Promise<SeedResolution> => {
  switch (input.seedSource) {
    case 'manual':
      return resolveManualSeeds(input.manualSeeds ?? [])

    case 'gsc_queries': {
      const seeds = await resolveGscSeeds(target.organizationId, MAX_DISCOVERY_SEEDS)

      if (seeds.length === 0) return { ok: false, errorCode: 'invalid_seed', reason: 'no_gsc_queries' }

      return { ok: true, seeds }
    }

    case 'tracked_keywords': {
      const seeds = await resolveTrackedSeeds(target.seoTargetId, MAX_DISCOVERY_SEEDS)

      if (seeds.length === 0) return { ok: false, errorCode: 'invalid_seed', reason: 'no_tracked_keywords' }

      return { ok: true, seeds }
    }

    case 'target_domain':
      // El "seed" es el dominio canónico del target (activa `keywords_for_site`); no hay
      // keywords seed y por eso los métodos por-seed no aplican en esta fuente.
      return { ok: true, seeds: [] }

    case 'mixed': {
      const manual = resolveManualSeeds(input.manualSeeds ?? [])

      if (!manual.ok) return manual

      const measured =
        input.mixedMeasuredSource === 'tracked_keywords'
          ? await resolveTrackedSeeds(target.seoTargetId, MAX_DISCOVERY_SEEDS)
          : await resolveGscSeeds(target.organizationId, MAX_DISCOVERY_SEEDS)

      const seen = new Set(manual.seeds.map(seed => seed.normalizedKeyword))
      const combined = [...manual.seeds]

      for (const seed of measured) {
        if (combined.length >= MAX_DISCOVERY_SEEDS) break

        if (seen.has(seed.normalizedKeyword)) continue

        seen.add(seed.normalizedKeyword)
        combined.push(seed)
      }

      return { ok: true, seeds: combined }
    }
  }
}

// ─── Validación de métodos ──────────────────────────────────────────────────────────

type MethodsValidation =
  | { ok: true; methods: SeoDiscoveryMethodSpec[] }
  | { ok: false; errorCode: SeoDiscoveryErrorCode; reason?: string }

const normalizeMethods = (
  input: QueueKeywordDiscoveryInput,
  seedCount: number
): MethodsValidation => {
  const seen = new Set<SeoDiscoveryMethod>()
  const methods: SeoDiscoveryMethodSpec[] = []

  for (const entry of input.methods) {
    if (!SEO_DISCOVERY_METHODS.includes(entry.method)) {
      return { ok: false, errorCode: 'invalid_seed', reason: 'unknown_method' }
    }

    if (seen.has(entry.method)) continue

    seen.add(entry.method)

    const requested = entry.resultsPerCall ?? DEFAULT_DISCOVERY_RESULTS_PER_CALL

    if (!Number.isFinite(requested) || requested < 1) {
      return { ok: false, errorCode: 'invalid_seed', reason: 'invalid_results_per_call' }
    }

    if (requested > MAX_DISCOVERY_RESULTS_PER_CALL) {
      return { ok: false, errorCode: 'limit_exceeded', reason: 'results_per_call' }
    }

    methods.push({ method: entry.method, resultsPerCall: Math.floor(requested) })
  }

  const expansionCount = methods.filter(spec => spec.method !== 'keywords_for_site').length

  if (expansionCount > MAX_DISCOVERY_EXPANSION_METHODS) {
    return { ok: false, errorCode: 'limit_exceeded', reason: 'too_many_methods' }
  }

  if (input.seedSource === 'target_domain') {
    // Sin keywords seed, los métodos por-seed no tienen insumo: sólo `keywords_for_site`.
    if (methods.some(spec => spec.method !== 'keywords_for_site') || methods.length === 0) {
      return { ok: false, errorCode: 'invalid_seed', reason: 'target_domain_requires_keywords_for_site' }
    }
  } else if (seedCount === 0 && methods.some(spec => spec.method !== 'keywords_for_site')) {
    return { ok: false, errorCode: 'invalid_seed', reason: 'no_seeds_for_expansion' }
  }

  return { ok: true, methods }
}

// ─── Idempotencia ───────────────────────────────────────────────────────────────────

/**
 * Intent canónico: org + target + seeds normalizadas + mercado + methods + actor + ciclo
 * mensual. El mismo intent DENTRO del ciclo devuelve la corrida existente sin otra llamada al
 * proveedor.
 *
 * Auditoría SEO 2026-08-14: el componente `cycle` (YYYY-MM) alinea la dedupe con el ciclo de
 * refresh del proveedor (las métricas Labs son mensuales, ciclo Google Ads). Sin él, repetir
 * el mismo intent en un mes NUEVO devolvía para siempre la corrida vieja — congelaba el
 * descubrimiento en el primer snapshot y jamás traía keywords emergentes.
 */
const deriveIdempotencyKey = (input: {
  organizationId: string
  seoTargetId: string
  locationCode: string
  languageCode: string
  sourceKind: SeoDiscoverySourceKind
  seeds: readonly ResolvedDiscoverySeed[]
  methods: readonly SeoDiscoveryMethodSpec[]
  actor: string
}): string => {
  const canonical = JSON.stringify({
    org: input.organizationId,
    target: input.seoTargetId,
    market: `${input.locationCode}/${input.languageCode}`,
    source: input.sourceKind,
    seeds: [...input.seeds.map(seed => seed.normalizedKeyword)].sort(),
    methods: [...input.methods].sort((a, b) => a.method.localeCompare(b.method)),
    actor: input.actor,
    cycle: new Date().toISOString().slice(0, 7)
  })

  return `auto-${createHash('sha256').update(canonical).digest('hex').slice(0, 40)}`
}

// ─── Preview (dry-run, cero inserts, cero provider) ─────────────────────────────────

export const previewKeywordDiscovery = async (
  input: QueueKeywordDiscoveryInput
): Promise<PreviewKeywordDiscoveryResult> => {
  const env = input.env ?? process.env

  if (!isSeoModuleEnabled(env) || !isSeoKeywordDiscoveryEnabled(env)) {
    return { ok: false, errorCode: 'seo_keyword_discovery_disabled' }
  }

  const resolution = await resolveDiscoveryTarget(input)

  if (!resolution.ok) return { ok: false, errorCode: resolution.errorCode, reason: resolution.reason }

  const seedResolution = await resolveSeeds(input, resolution.target)

  if (!seedResolution.ok) return seedResolution

  const methodsValidation = normalizeMethods(input, seedResolution.seeds.length)

  if (!methodsValidation.ok) return methodsValidation

  const estimate = estimateDiscoveryCost({
    seedCount: seedResolution.seeds.length,
    methods: methodsValidation.methods
  })

  // Se consulta el gate SIN ejecutar nada: el preview también responde "¿me dejarían?".
  const gate = await enforceSeoRunEntitlement(
    resolution.target.organizationId,
    { estimatedCostUsd: estimate.estimatedCostUsd, consumesAuditAllowance: false },
    env
  )

  return {
    ok: true,
    organizationId: resolution.target.organizationId,
    seoTargetId: resolution.target.seoTargetId,
    locationCode: resolution.target.locationCode,
    languageCode: resolution.target.languageCode,
    seeds: seedResolution.seeds,
    estimate,
    budgetRemainingUsd: gate.budgetRemainingUsd ?? null,
    wouldBeAllowed: gate.allowed,
    blockedReason: gate.blockedReason ?? null
  }
}

// ─── Enqueue ────────────────────────────────────────────────────────────────────────

export const queueKeywordDiscovery = async (
  input: QueueKeywordDiscoveryInput
): Promise<QueueKeywordDiscoveryResult> => {
  const env = input.env ?? process.env

  if (!isSeoModuleEnabled(env) || !isSeoKeywordDiscoveryEnabled(env)) {
    return { ok: false, errorCode: 'seo_keyword_discovery_disabled' }
  }

  const actor = input.actor.trim()

  if (!actor) return { ok: false, errorCode: 'invalid_seed', reason: 'missing_actor' }

  const resolution = await resolveDiscoveryTarget(input)

  if (!resolution.ok) return { ok: false, errorCode: resolution.errorCode, reason: resolution.reason }

  const target = resolution.target
  const seedResolution = await resolveSeeds(input, target)

  if (!seedResolution.ok) return seedResolution

  const methodsValidation = normalizeMethods(input, seedResolution.seeds.length)

  if (!methodsValidation.ok) return methodsValidation

  const seeds = seedResolution.seeds
  const methods = methodsValidation.methods

  const estimate = estimateDiscoveryCost({ seedCount: seeds.length, methods })

  // Chokepoint ÚNICO de gasto: si el estimado no cabe, NO se encola (ninguna llamada
  // llega a ejecutarse). El runner vuelve a consultar el gate antes de gastar de verdad.
  const gate = await enforceSeoRunEntitlement(
    target.organizationId,
    { estimatedCostUsd: estimate.estimatedCostUsd, consumesAuditAllowance: false },
    env
  )

  if (!gate.allowed) {
    if (gate.blockedReason === 'no_entitlement') {
      return { ok: false, errorCode: 'forbidden', blockedReason: gate.blockedReason }
    }

    return { ok: false, errorCode: 'budget_blocked', blockedReason: gate.blockedReason ?? null }
  }

  const idempotencyKey =
    input.idempotencyKey?.trim() ||
    deriveIdempotencyKey({
      organizationId: target.organizationId,
      seoTargetId: target.seoTargetId,
      locationCode: target.locationCode,
      languageCode: target.languageCode,
      sourceKind: input.seedSource,
      seeds,
      methods,
      actor
    })

  const seedInputsJson = JSON.stringify({
    seeds,
    ...(methods.some(spec => spec.method === 'keywords_for_site') ? { targetDomain: target.rootDomain } : {})
  })

  // TASK-1694: la política de inclusión viaja en el snapshot de la corrida. Sin ella, una
  // corrida vieja deja de ser interpretable después de un cambio de política: nadie podría
  // saber si el long-tail sin volumen faltó porque no existía o porque no se compró.
  const methodsJson = JSON.stringify(
    methods.map(spec => ({
      method: spec.method,
      resultsPerCall: spec.resultsPerCall,
      volumePolicy: SEO_DISCOVERY_DEFAULT_VOLUME_POLICY
    }))
  )

  return withGreenhousePostgresTransaction(async client => {
    const inserted = await client.query<{ run_id: string }>(
      `INSERT INTO greenhouse_growth.seo_keyword_discovery_runs
         (organization_id, seo_target_id, source_kind, seed_inputs_json, methods_json,
          location_code, language_code, status, estimated_cost_usd, created_by, idempotency_key)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, 'pending', $8, $9, $10)
       ON CONFLICT ON CONSTRAINT seo_keyword_discovery_runs_idempotency_unique DO NOTHING
       RETURNING run_id`,
      [
        target.organizationId,
        target.seoTargetId,
        input.seedSource,
        seedInputsJson,
        methodsJson,
        target.locationCode,
        target.languageCode,
        estimate.estimatedCostUsd,
        actor,
        idempotencyKey
      ]
    )

    const insertedRunId = inserted.rows[0]?.run_id ?? null

    if (!insertedRunId) {
      // Mismo intent ya encolado/ejecutado: se devuelve la corrida existente SIN gastar.
      const existing = await client.query<{ run_id: string; estimated_cost_usd: string }>(
        `SELECT run_id, estimated_cost_usd::text
           FROM greenhouse_growth.seo_keyword_discovery_runs
          WHERE organization_id = $1
            AND idempotency_key = $2`,
        [target.organizationId, idempotencyKey]
      )

      const existingRow = existing.rows[0]

      if (!existingRow) {
        // Carrera imposible en la práctica (el conflicto implica la fila); degradar honesto.
        return { ok: false as const, errorCode: 'busy' as const }
      }

      return {
        ok: true as const,
        runId: existingRow.run_id,
        deduped: true,
        estimatedCostUsd: Number(existingRow.estimated_cost_usd),
        providerCalls: estimate.providerCalls,
        formula: estimate.formula,
        seedCount: seeds.length,
        budgetRemainingUsd: gate.budgetRemainingUsd ?? null
      }
    }

    // Trazabilidad en la MISMA transacción: si el evento no se puede escribir, el run no
    // queda durable a medias.
    await publishOutboxEvent(
      {
        aggregateType: SEO_KEYWORD_DISCOVERY_AGGREGATE_TYPE,
        aggregateId: target.seoTargetId,
        eventType: SEO_KEYWORD_DISCOVERY_REQUESTED_EVENT,
        payload: {
          runId: insertedRunId,
          organizationId: target.organizationId,
          seoTargetId: target.seoTargetId,
          sourceKind: input.seedSource,
          seedCount: seeds.length,
          methods: methods.map(spec => spec.method),
          estimatedCostUsd: estimate.estimatedCostUsd,
          actor
        }
      },
      client
    )

    return {
      ok: true as const,
      runId: insertedRunId,
      deduped: false,
      estimatedCostUsd: estimate.estimatedCostUsd,
      providerCalls: estimate.providerCalls,
      formula: estimate.formula,
      seedCount: seeds.length,
      budgetRemainingUsd: gate.budgetRemainingUsd ?? null
    }
  })
}

// ─── Action log (append-only, sin tracking implícito) ───────────────────────────────

export interface RecordKeywordDiscoveryActionInput {
  organizationId: string
  candidateId: string
  actionKind: SeoDiscoveryActionKind
  actor: string
  idempotencyKey?: string
  /** Metadata mínima (outcome real de un command posterior, referencia opaca). Sin PII. */
  metadata?: Record<string, unknown>
}

export type RecordKeywordDiscoveryActionResult =
  | { ok: true; actionId: string; deduped: boolean }
  | { ok: false; errorCode: SeoDiscoveryErrorCode; reason?: string }

/**
 * Cliente mínimo del append al ledger. Deliberadamente NO es `PoolClient`: así la misma
 * implementación sirve para la conexión del pool y para la transacción de otro command, sin
 * atar este módulo al tipo de `pg`.
 *
 * `withTransaction` (`@/lib/db`) y `withGreenhousePostgresTransaction` (`@/lib/postgres/client`)
 * son la MISMA función —la primera es un alias— así que hay un solo shape que satisfacer.
 */
export interface DiscoveryActionClient {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ) => Promise<{ rows: T[] }>
}

/**
 * Adapta el helper canónico del pool al shape transaccional.
 *
 * ⚠️ `runGreenhousePostgresQuery` devuelve un ARRAY pelado, no `{ rows }`. Envolverlo acá es lo
 * que permite que el camino con pool y el transaccional compartan una sola implementación en vez
 * de dos copias que divergen el día que alguien toque una.
 */
const pooledDiscoveryActionClient: DiscoveryActionClient = {
  query: async <T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]) => ({
    rows: await runGreenhousePostgresQuery<T>(sql, params)
  })
}

/**
 * Append al ledger de decisiones, participando de la transacción del caller.
 *
 * 🔴 **Existe para que el hecho lo escriba el primitive que lo produce.** Un command que produce
 * un outcome (abrir una membresía, crear un draft) escribe su fila DENTRO de su propia
 * transacción: o pasan las dos cosas, o no pasa ninguna. La alternativa —que cada consumer
 * encadene un `record_action` después del éxito— deja el ledger a merced de que cada cliente se
 * acuerde, y parte la verdad en dos el día que la segunda llamada falle.
 *
 * Es idempotente por `(organization_id, idempotency_key)`. Para hechos REPETIBLES la clave debe
 * derivarse del outcome durable (id del draft, id del set), nunca de `candidateId:kind:actor`:
 * esa clave automática colapsaría dos decisiones distintas del mismo actor en una sola fila.
 */
export const appendDiscoveryActionTx = async (
  client: DiscoveryActionClient,
  input: RecordKeywordDiscoveryActionInput
): Promise<RecordKeywordDiscoveryActionResult> => {
  const actor = input.actor.trim()

  if (!actor) return { ok: false, errorCode: 'invalid_seed', reason: 'missing_actor' }

  // Tenant boundary: el candidato debe pertenecer a la org del caller. Un ID ajeno responde
  // `run_not_found` (anti-oracle), sin distinguir "no existe" de "no es tuyo".
  const candidates = await client.query<{ candidate_id: string }>(
    `SELECT candidate_id
       FROM greenhouse_growth.seo_keyword_discovery_candidates
      WHERE candidate_id = $1
        AND organization_id = $2`,
    [input.candidateId, input.organizationId]
  )

  if (!candidates.rows[0]) return { ok: false, errorCode: 'run_not_found' }

  const idempotencyKey =
    input.idempotencyKey?.trim() ||
    `auto-${createHash('sha256').update(`${input.candidateId}:${input.actionKind}:${actor}`).digest('hex').slice(0, 40)}`

  const inserted = await client.query<{ action_id: string }>(
    `INSERT INTO greenhouse_growth.seo_keyword_discovery_actions
       (candidate_id, organization_id, action_kind, actor, idempotency_key, metadata_json)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT ON CONSTRAINT seo_keyword_discovery_actions_idempotency_unique DO NOTHING
     RETURNING action_id`,
    [
      input.candidateId,
      input.organizationId,
      input.actionKind,
      actor,
      idempotencyKey,
      JSON.stringify(input.metadata ?? {})
    ]
  )

  const actionId = inserted.rows[0]?.action_id ?? null

  if (actionId) return { ok: true, actionId, deduped: false }

  const existing = await client.query<{ action_id: string }>(
    `SELECT action_id
       FROM greenhouse_growth.seo_keyword_discovery_actions
      WHERE organization_id = $1
        AND idempotency_key = $2`,
    [input.organizationId, idempotencyKey]
  )

  const existingId = existing.rows[0]?.action_id ?? null

  if (!existingId) return { ok: false, errorCode: 'busy' }

  return { ok: true, actionId: existingId, deduped: true }
}

/**
 * Wrapper no-transaccional: el `record_action` público que consumen la ruta app y el lane
 * ecosystem para registrar una decisión HUMANA pura. Mismo contrato de siempre.
 */
export const recordKeywordDiscoveryAction = async (
  input: RecordKeywordDiscoveryActionInput
): Promise<RecordKeywordDiscoveryActionResult> =>
  appendDiscoveryActionTx(pooledDiscoveryActionClient, input)
