import 'server-only'
import type { PoolClient } from 'pg'

import { ensurePrimaryMarket, listProfileMarkets, lockGraderProfile } from '../markets/store'
import { projectProfile } from '../store'
import { GraderMarketConfigError, type GraderMarket } from '../markets/contracts'

/**
 * TASK-1290 Slice 2 — Growth AI Visibility · Prompt set store + lifecycle (server-only).
 *
 * Persistencia del artefacto versionado por marca (`grader_prompt_sets`): autoría → revisión →
 * aprobación → congelado. Patrón LLM-autora-luego-congela: el set se autora (LLM/baseline) como
 * `draft`, se revisa (TASK-1291) y se APRUEBA → `active` (los runs lo usan; reproducible). Un
 * perfil tiene a lo sumo UN set `active` (partial unique index); aprobar uno nuevo supersede el
 * anterior en una transacción (append-only, no edit-in-place). Reads/writes por el helper canónico.
 */

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import type { GrowthAiVisibilityPromptDefinition } from './prompt-pack-v1'

/** Query estructurada del set: el shape del pack + provenance opcional para el review (TASK-1291). */
export interface PromptSetPrompt extends GrowthAiVisibilityPromptDefinition {
  /** Por qué esta pregunta (review-ready). */
  rationale?: string
  /** Qué señal del snapshot la motivó (provenance). */
  groundingRef?: string
}

export type PromptSetStatus = 'draft' | 'approved' | 'active' | 'superseded'
export type PromptSetGenerationStrategy = 'llm' | 'template_baseline'

export interface GraderPromptSetRow {
  marketId?: string | null
  setId: string
  profileId: string
  version: number
  businessModel: string | null
  categoryNodeId: string | null
  prompts: PromptSetPrompt[]
  generationStrategy: PromptSetGenerationStrategy
  model: string | null
  systemPromptVersion: string | null
  groundingSources: string[]
  status: PromptSetStatus
  createdBy: string
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string
}

type RawRow = Record<string, unknown>

const projectPromptSet = (row: RawRow): GraderPromptSetRow => ({
  marketId: (row.market_id as string | null) ?? null,
  setId: String(row.set_id),
  profileId: String(row.profile_id),
  version: Number(row.version),
  businessModel: (row.business_model as string | null) ?? null,
  categoryNodeId: (row.category_node_id as string | null) ?? null,
  prompts: Array.isArray(row.prompts_json) ? (row.prompts_json as PromptSetPrompt[]) : [],
  generationStrategy: row.generation_strategy === 'llm' ? 'llm' : 'template_baseline',
  model: (row.model as string | null) ?? null,
  systemPromptVersion: (row.system_prompt_version as string | null) ?? null,
  groundingSources: Array.isArray(row.grounding_sources_json) ? (row.grounding_sources_json as string[]) : [],
  status: row.status as PromptSetStatus,
  createdBy: String(row.created_by),
  approvedBy: (row.approved_by as string | null) ?? null,
  approvedAt: (row.approved_at as string | null) ?? null,
  createdAt: String(row.created_at)
})

/** El set `active` de un perfil (el que usan los runs), o null si no hay. */
export const getActivePromptSet = async (
  profileId: string,
  marketId?: string,
  client?: PoolClient
): Promise<GraderPromptSetRow | null> => {
  const read = client
    ? async (sql: string, values: unknown[]) => (await client.query<RawRow>(sql, values)).rows
    : runGreenhousePostgresQuery<RawRow>

  const rows = await read(
    `SELECT * FROM greenhouse_growth.grader_prompt_sets
      WHERE profile_id = $1 AND status = 'active' AND (market_id = $2 OR ($2::text IS NULL AND (market_id IS NULL OR market_id IN (SELECT market_id FROM greenhouse_growth.grader_profile_markets WHERE profile_id=$1 AND is_primary))))
      LIMIT 1`,
    [profileId, marketId ?? null]
  )

  return rows[0] ? projectPromptSet(rows[0]) : null
}

export const getPromptSet = async (setId: string): Promise<GraderPromptSetRow | null> => {
  const rows = await runGreenhousePostgresQuery<RawRow>(
    `SELECT * FROM greenhouse_growth.grader_prompt_sets WHERE set_id = $1 LIMIT 1`,
    [setId]
  )

  return rows[0] ? projectPromptSet(rows[0]) : null
}

export const listPromptSets = async (profileId: string, marketId?: string): Promise<GraderPromptSetRow[]> => {
  const rows = await runGreenhousePostgresQuery<RawRow>(
    `SELECT * FROM greenhouse_growth.grader_prompt_sets
      WHERE profile_id = $1 AND ($2::text IS NULL OR market_id=$2)
      ORDER BY version DESC`,
    [profileId, marketId ?? null]
  )

  return rows.map(projectPromptSet)
}

export interface CreateDraftPromptSetInput {
  marketId?: string
  profileId: string
  businessModel: string | null
  categoryNodeId: string | null
  prompts: PromptSetPrompt[]
  generationStrategy: PromptSetGenerationStrategy
  model?: string | null
  systemPromptVersion?: string | null
  groundingSources?: string[]
  createdBy: string
}

/** Crea un `draft` (version = max+1 del perfil). NO lo activa; eso es `approvePromptSet`. */
export const createDraftPromptSet = async (input: CreateDraftPromptSetInput): Promise<GraderPromptSetRow> =>
  withGreenhousePostgresTransaction(async client => {
    const market = await resolvePromptSetMarket(input.profileId, input.marketId, client)

    const nextVersionResult = await client.query<{ next_version: number }>(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_version
         FROM greenhouse_growth.grader_prompt_sets
        WHERE profile_id = $1`,
      [input.profileId]
    )

    const nextVersion = nextVersionResult.rows[0]?.next_version ?? 1

    const inserted = await client.query<RawRow>(
      `INSERT INTO greenhouse_growth.grader_prompt_sets
         (profile_id, version, business_model, category_node_id, prompts_json,
          generation_strategy, model, system_prompt_version, grounding_sources_json, status, created_by,market_id)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9::jsonb, 'draft', $10, $11)
       RETURNING *`,
      [
        input.profileId,
        nextVersion,
        input.businessModel,
        input.categoryNodeId,
        JSON.stringify(input.prompts),
        input.generationStrategy,
        input.model ?? null,
        input.systemPromptVersion ?? null,
        JSON.stringify(input.groundingSources ?? []),
        input.createdBy,
        market.marketId
      ]
    )

    return projectPromptSet(inserted.rows[0])
  })

export class PromptSetLifecycleError extends Error {
  readonly code: 'not_found' | 'already_active' | 'invalid_status'

  constructor(code: 'not_found' | 'already_active' | 'invalid_status', message: string) {
    super(message)
    this.name = 'PromptSetLifecycleError'
    this.code = code
  }
}

/**
 * Aprueba un set (`draft`/`approved` → `active`), congelándolo. Atómico: supersede el `active`
 * previo del MISMO perfil y activa este (un solo `active` por perfil, garantizado por el partial
 * unique index). Idempotente: aprobar uno ya `active` es no-op.
 */
export const approvePromptSet = async (input: { setId: string; approvedBy: string }): Promise<GraderPromptSetRow> =>
  withGreenhousePostgresTransaction(async client => {
    await client.query(
      `SELECT 1 FROM greenhouse_growth.grader_profiles WHERE profile_id=(SELECT profile_id FROM greenhouse_growth.grader_prompt_sets WHERE set_id=$1) FOR UPDATE`,
      [input.setId]
    )

    const current = await client.query<RawRow>(
      `SELECT * FROM greenhouse_growth.grader_prompt_sets WHERE set_id = $1 FOR UPDATE`,
      [input.setId]
    )

    const row = current.rows[0]

    if (!row) {
      throw new PromptSetLifecycleError('not_found', 'El prompt set indicado no existe.')
    }

    if (row.status === 'active') {
      return projectPromptSet(row) // no-op idempotente.
    }

    if (row.status === 'superseded') {
      throw new PromptSetLifecycleError('invalid_status', 'No se puede aprobar un prompt set superseded.')
    }

    // Supersede el active previo del perfil (append-only) antes de activar este (un solo active).
    await client.query(
      `UPDATE greenhouse_growth.grader_prompt_sets
          SET status = 'superseded'
        WHERE profile_id = $1 AND status = 'active' AND set_id <> $2 AND market_id IS NOT DISTINCT FROM $3::text`,
      [row.profile_id, input.setId, row.market_id ?? null]
    )

    const activated = await client.query<RawRow>(
      `UPDATE greenhouse_growth.grader_prompt_sets
          SET status = 'active', approved_by = $2, approved_at = NOW()
        WHERE set_id = $1
        RETURNING *`,
      [input.setId, input.approvedBy]
    )

    return projectPromptSet(activated.rows[0])
  })

/** Resolves ownership and locale before authoring incurs provider cost. */
export const resolvePromptSetMarket = async (
  profileId: string,
  marketId?: string,
  client?: PoolClient
): Promise<GraderMarket> => {
  if (!client) return withGreenhousePostgresTransaction(tx => resolvePromptSetMarket(profileId, marketId, tx))
  const profile = projectProfile(await lockGraderProfile(profileId, client))
  const primary = await ensurePrimaryMarket(profile, client)

  const selected = marketId
    ? (await listProfileMarkets(profileId, client)).find(market => market.marketId === marketId)
    : primary

  if (!selected || selected.status !== 'active') throw new GraderMarketConfigError('aeo_market_not_configured')

  return selected
}
