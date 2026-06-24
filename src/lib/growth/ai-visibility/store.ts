import 'server-only'

/**
 * TASK-1226 — Growth AI Visibility Grader · Store (Slice 4, server-only).
 *
 * Writer/reader canónico del evidence ledger en greenhouse_growth. Es la capa de
 * persistencia del primitive de Full API parity: el run-engine escribe, y todos
 * los consumers (admin, Nexa/MCP, report builder, HubSpot handoff) LEEN por acá —
 * ninguno reimplementa SQL. provider_observations es append-only (trigger en DB).
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  type GrowthAiVisibilityExecutionMode,
  type GrowthAiVisibilityProviderId,
  type GrowthAiVisibilityProviderObservation,
  type GrowthAiVisibilityRunKind,
  type GrowthAiVisibilityRunStatus
} from './contracts'

export interface GraderProfileRow {
  profileId: string
  publicId: string
  brandName: string
  websiteUrl: string | null
  market: string
  locale: string
  category: string | null
  competitorsDeclared: string[]
  status: string
}

/** Prompt resuelto persistido en el run (resumibilidad del worker async, TASK-1234). */
export interface GraderExecutionPrompt {
  promptId: string
  promptText: string
}

export interface GraderRunRow {
  runId: string
  publicId: string
  profileId: string
  runKind: GrowthAiVisibilityRunKind
  mode: GrowthAiVisibilityExecutionMode
  status: GrowthAiVisibilityRunStatus
  providerPolicyVersion: string
  promptPackVersion: string
  requestedProviders: GrowthAiVisibilityProviderId[]
  idempotencyKey: string | null
  estimatedCostUsd: number
  costCeilingUsd: number | null
  /** Prompts resueltos a ejecutar (TASK-1234): el worker async los corre sin re-derivar. */
  executionPrompts: GraderExecutionPrompt[]
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
}

type RawProfile = Record<string, unknown>
type RawRun = Record<string, unknown>
type RawObservation = Record<string, unknown>

const projectProfile = (row: RawProfile): GraderProfileRow => ({
  profileId: String(row.profile_id),
  publicId: String(row.public_id),
  brandName: String(row.brand_name),
  websiteUrl: (row.website_url as string | null) ?? null,
  market: String(row.market),
  locale: String(row.locale),
  category: (row.category as string | null) ?? null,
  competitorsDeclared: (row.competitors_declared as string[] | null) ?? [],
  status: String(row.status)
})

const projectRun = (row: RawRun): GraderRunRow => ({
  runId: String(row.run_id),
  publicId: String(row.public_id),
  profileId: String(row.profile_id),
  runKind: row.run_kind as GrowthAiVisibilityRunKind,
  mode: row.mode as GrowthAiVisibilityExecutionMode,
  status: row.status as GrowthAiVisibilityRunStatus,
  providerPolicyVersion: String(row.provider_policy_version),
  promptPackVersion: String(row.prompt_pack_version),
  requestedProviders: (row.requested_providers as GrowthAiVisibilityProviderId[] | null) ?? [],
  idempotencyKey: (row.idempotency_key as string | null) ?? null,
  estimatedCostUsd: Number(row.estimated_cost_usd ?? 0),
  costCeilingUsd: row.cost_ceiling_usd != null ? Number(row.cost_ceiling_usd) : null,
  executionPrompts: Array.isArray(row.execution_prompts)
    ? (row.execution_prompts as GraderExecutionPrompt[])
    : [],
  startedAt: (row.started_at as string | null) ?? null,
  finishedAt: (row.finished_at as string | null) ?? null,
  createdAt: String(row.created_at)
})

const projectObservation = (row: RawObservation): GrowthAiVisibilityProviderObservation => ({
  observationId: String(row.observation_id),
  runId: String(row.run_id),
  promptId: String(row.prompt_id),
  provider: row.provider as GrowthAiVisibilityProviderId,
  model: String(row.model),
  status: row.status as GrowthAiVisibilityProviderObservation['status'],
  answerTextHash: (row.answer_text_hash as string | null) ?? null,
  answerExcerpt: (row.answer_excerpt as string | null) ?? null,
  citations: (row.citations as GrowthAiVisibilityProviderObservation['citations'] | null) ?? [],
  usage: (row.usage as Record<string, unknown> | null) ?? {},
  latencyMs: Number(row.latency_ms ?? 0),
  providerRequestHash: String(row.provider_request_hash),
  rawEvidencePointer: (row.raw_evidence_pointer as string | null) ?? null,
  errorCode: (row.error_code as GrowthAiVisibilityProviderObservation['errorCode']) ?? null,
  providerPolicyVersion: String(row.provider_policy_version),
  promptPackVersion: String(row.prompt_pack_version),
  createdAt: String(row.created_at)
})

// ── Profiles ─────────────────────────────────────────────────────────────────

export const findOrCreateGraderProfile = async (input: {
  brandName: string
  websiteUrl: string | null
  market: string
  locale: string
  category: string | null
  competitorsDeclared: string[]
}): Promise<GraderProfileRow> => {
  const existing = await runGreenhousePostgresQuery<RawProfile>(
    `SELECT * FROM greenhouse_growth.grader_profiles
      WHERE brand_name = $1 AND market = $2 AND locale = $3 AND status = 'active'
      ORDER BY created_at ASC LIMIT 1`,
    [input.brandName, input.market, input.locale]
  )

  if (existing[0]) {
    return projectProfile(existing[0])
  }

  const inserted = await runGreenhousePostgresQuery<RawProfile>(
    `INSERT INTO greenhouse_growth.grader_profiles
       (brand_name, website_url, market, locale, category, competitors_declared)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.brandName,
      input.websiteUrl,
      input.market,
      input.locale,
      input.category,
      input.competitorsDeclared
    ]
  )

  return projectProfile(inserted[0])
}

export const getGraderProfile = async (profileId: string): Promise<GraderProfileRow | null> => {
  const rows = await runGreenhousePostgresQuery<RawProfile>(
    `SELECT * FROM greenhouse_growth.grader_profiles WHERE profile_id = $1 LIMIT 1`,
    [profileId]
  )

  return rows[0] ? projectProfile(rows[0]) : null
}

// ── Runs ─────────────────────────────────────────────────────────────────────

export const findRunByIdempotencyKey = async (key: string): Promise<GraderRunRow | null> => {
  const rows = await runGreenhousePostgresQuery<RawRun>(
    `SELECT * FROM greenhouse_growth.grader_runs WHERE idempotency_key = $1 LIMIT 1`,
    [key]
  )

  return rows[0] ? projectRun(rows[0]) : null
}

export const createGraderRun = async (input: {
  profileId: string
  runKind: GrowthAiVisibilityRunKind
  mode: GrowthAiVisibilityExecutionMode
  providerPolicyVersion: string
  promptPackVersion: string
  requestedProviders: GrowthAiVisibilityProviderId[]
  idempotencyKey: string | null
  costCeilingUsd: number | null
  /** Prompts resueltos a ejecutar (TASK-1234). Default [] (legacy/discovery sin prompts). */
  executionPrompts?: GraderExecutionPrompt[]
}): Promise<GraderRunRow> => {
  const rows = await runGreenhousePostgresQuery<RawRun>(
    `INSERT INTO greenhouse_growth.grader_runs
       (profile_id, run_kind, mode, status, provider_policy_version, prompt_pack_version,
        requested_providers, idempotency_key, cost_ceiling_usd, execution_prompts)
     VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9::jsonb)
     RETURNING *`,
    [
      input.profileId,
      input.runKind,
      input.mode,
      input.providerPolicyVersion,
      input.promptPackVersion,
      input.requestedProviders,
      input.idempotencyKey,
      input.costCeilingUsd,
      JSON.stringify(input.executionPrompts ?? [])
    ]
  )

  return projectRun(rows[0])
}

export const updateGraderRunStatus = async (input: {
  runId: string
  status: GrowthAiVisibilityRunStatus
  estimatedCostUsd?: number
  startedAt?: string | null
  finishedAt?: string | null
}): Promise<GraderRunRow> => {
  const rows = await runGreenhousePostgresQuery<RawRun>(
    `UPDATE greenhouse_growth.grader_runs
        SET status = $2,
            estimated_cost_usd = COALESCE($3, estimated_cost_usd),
            started_at = COALESCE($4, started_at),
            finished_at = COALESCE($5, finished_at)
      WHERE run_id = $1
      RETURNING *`,
    [input.runId, input.status, input.estimatedCostUsd ?? null, input.startedAt ?? null, input.finishedAt ?? null]
  )

  return projectRun(rows[0])
}

export const getGraderRun = async (runId: string): Promise<GraderRunRow | null> => {
  const rows = await runGreenhousePostgresQuery<RawRun>(
    `SELECT * FROM greenhouse_growth.grader_runs WHERE run_id = $1 LIMIT 1`,
    [runId]
  )

  return rows[0] ? projectRun(rows[0]) : null
}

export const listGraderRuns = async (input: { limit?: number; profileId?: string } = {}): Promise<GraderRunRow[]> => {
  const limit = Math.max(1, Math.min(200, input.limit ?? 50))

  const rows = input.profileId
    ? await runGreenhousePostgresQuery<RawRun>(
        `SELECT * FROM greenhouse_growth.grader_runs WHERE profile_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [input.profileId, limit]
      )
    : await runGreenhousePostgresQuery<RawRun>(
        `SELECT * FROM greenhouse_growth.grader_runs ORDER BY created_at DESC LIMIT $1`,
        [limit]
      )

  return rows.map(projectRun)
}

/**
 * TASK-1234 — Claim atómico de runs `pending` para el worker async. La transición
 * `pending → running` ES el claim: `FOR UPDATE SKIP LOCKED` garantiza que dos
 * workers concurrentes NUNCA tomen el mismo run (idempotencia de ejecución). El
 * `started_at` marca el tiempo de claim. Devuelve los runs ya en estado `running`.
 */
export const claimPendingGraderRuns = async (limit: number): Promise<GraderRunRow[]> => {
  const bounded = Math.max(1, Math.min(50, Math.floor(limit)))

  const rows = await runGreenhousePostgresQuery<RawRun>(
    `UPDATE greenhouse_growth.grader_runs
        SET status = 'running', started_at = NOW()
      WHERE run_id IN (
        SELECT run_id FROM greenhouse_growth.grader_runs
         WHERE status = 'pending'
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $1
      )
      RETURNING *`,
    [bounded]
  )

  return rows.map(projectRun)
}

/**
 * TASK-1234 — Runs huérfanos: en `running` desde hace más de `thresholdMinutes`
 * (crash/timeout mid-run). El recovery (run-engine) los finaliza recomputando el
 * estado desde sus observaciones ya persistidas (degradación honesta).
 */
export const findStuckRunningRuns = async (thresholdMinutes: number): Promise<GraderRunRow[]> => {
  const bounded = Math.max(1, Math.floor(thresholdMinutes))

  const rows = await runGreenhousePostgresQuery<RawRun>(
    `SELECT * FROM greenhouse_growth.grader_runs
      WHERE status = 'running'
        AND started_at IS NOT NULL
        AND started_at < NOW() - make_interval(mins => $1)
      ORDER BY started_at ASC`,
    [bounded]
  )

  return rows.map(projectRun)
}

// ── Observations (append-only) ───────────────────────────────────────────────

export const insertProviderObservations = async (
  observations: GrowthAiVisibilityProviderObservation[]
): Promise<number> => {
  let inserted = 0

  for (const observation of observations) {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_growth.provider_observations
         (observation_id, run_id, prompt_id, provider, model, status, answer_text_hash,
          answer_excerpt, citations, usage, latency_ms, provider_request_hash,
          raw_evidence_pointer, error_code, provider_policy_version, prompt_pack_version, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (observation_id) DO NOTHING`,
      [
        observation.observationId,
        observation.runId,
        observation.promptId,
        observation.provider,
        observation.model,
        observation.status,
        observation.answerTextHash,
        observation.answerExcerpt,
        JSON.stringify(observation.citations),
        JSON.stringify(observation.usage),
        observation.latencyMs,
        observation.providerRequestHash,
        observation.rawEvidencePointer,
        observation.errorCode,
        observation.providerPolicyVersion,
        observation.promptPackVersion,
        observation.createdAt
      ]
    )
    inserted += 1
  }

  return inserted
}

export const getRunObservations = async (
  runId: string
): Promise<GrowthAiVisibilityProviderObservation[]> => {
  const rows = await runGreenhousePostgresQuery<RawObservation>(
    `SELECT * FROM greenhouse_growth.provider_observations WHERE run_id = $1 ORDER BY created_at ASC`,
    [runId]
  )

  return rows.map(projectObservation)
}
