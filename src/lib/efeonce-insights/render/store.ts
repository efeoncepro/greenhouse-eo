import 'server-only'

/**
 * TASK-1846 Slice 1 — store del render durable de Insights.
 *
 * Espeja la forma probada de `proposals/render-jobs.ts` (state machine + transiciones en el store,
 * claim atómico, eventos append-only) SIN copiar su negocio: acá la unidad reclamable es el output.
 *
 * Lease/fencing: Slice 2. Hoy el claim es atómico contra claims concurrentes (`FOR UPDATE SKIP
 * LOCKED`) pero NADA re-reclama un output que quedó en `running`; esa es exactamente la brecha que
 * el Slice 2 cierra, y por eso el fencing entra con el lease y no después.
 */

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import type { InsightAudience, InsightOutput } from '../contracts/request'
import { runInsightsQuery, type InsightsDbClient } from '../stores/db'

import {
  INSIGHT_NON_RETRYABLE_FAILURES,
  InsightRenderFenceLostError,
  isInsightOutputTransitionAllowed,
  type InsightOutputRecord,
  type InsightOutputState,
  type InsightRenderFailureCode,
  type InsightRenderRunRecord
} from './contracts'

/**
 * Flag propio: NO reutiliza `ARTIFACT_RENDER_JOBS_ENABLED`. Encender Insights jamás debe encender
 * Proposal ni al revés.
 *
 * ⚠️ Multi-runtime. El SoT en Cloud Run es `services/artifact-worker/deploy.sh`, cuyo
 * `--set-env-vars` es DESTRUCTIVO: declararlo sólo con `--update-env-vars` en vivo lo borra en el
 * próximo deploy, en silencio (le pasó a GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED, revisión 00473).
 * `deploy-contract.test.ts` custodia esa declaración.
 */
export const isInsightsRenderEnabled = (): boolean => process.env.INSIGHTS_RENDER_ENABLED === 'true'

const RUN_COLUMNS = `
  render_run_id, organization_id, edition_id, audience, requested_outputs, state,
  requested_by_kind, requested_by_user_id, requested_by_member_id,
  started_at, finished_at, cancelled_at, created_at, updated_at`

const OUTPUT_COLUMNS = `
  insight_output_id, render_run_id, organization_id, edition_id, output, audience, catalog_name,
  manifest_hash, constraints, deadline, state, failure_code, failure_detail, attempts, max_attempts,
  started_at, finished_at, execution_name, output_asset_id, output_report,
  lease_expires_at, fence_token, created_at, updated_at`

/**
 * Patrón canónico del dominio (`stores/db.ts`): si el caller ya tiene una transacción, se compone
 * dentro; si no, se abre una propia. Es lo que permite ejercitar esto contra PostgreSQL REAL en un
 * test que revierte al final — las tablas son append-only y no se pueden limpiar con DELETE.
 */
const withClient = async <T>(
  client: InsightsDbClient | undefined,
  fn: (c: InsightsDbClient) => Promise<T>
): Promise<T> => (client ? fn(client) : withGreenhousePostgresTransaction(c => fn(c)))

const asDate = (value: unknown): Date | null => (value ? new Date(value as string) : null)

const mapRunRow = (row: Record<string, unknown>): InsightRenderRunRecord => ({
  renderRunId: row.render_run_id as string,
  organizationId: row.organization_id as string,
  editionId: row.edition_id as string,
  audience: row.audience as InsightAudience,
  requestedOutputs: (row.requested_outputs ?? []) as InsightOutput[],
  state: row.state as InsightRenderRunRecord['state'],
  requestedByKind: row.requested_by_kind as InsightRenderRunRecord['requestedByKind'],
  requestedByUserId: (row.requested_by_user_id as string | null) ?? null,
  requestedByMemberId: (row.requested_by_member_id as string | null) ?? null,
  startedAt: asDate(row.started_at),
  finishedAt: asDate(row.finished_at),
  cancelledAt: asDate(row.cancelled_at),
  createdAt: new Date(row.created_at as string),
  updatedAt: new Date(row.updated_at as string)
})

const mapOutputRow = (row: Record<string, unknown>): InsightOutputRecord => ({
  insightOutputId: row.insight_output_id as string,
  renderRunId: row.render_run_id as string,
  organizationId: row.organization_id as string,
  editionId: row.edition_id as string,
  output: row.output as InsightOutput,
  audience: row.audience as InsightAudience,
  catalogName: row.catalog_name as string,
  manifestHash: row.manifest_hash as string,
  constraints: (row.constraints ?? {}) as Record<string, unknown>,
  deadline: asDate(row.deadline),
  state: row.state as InsightOutputState,
  failureCode: (row.failure_code as InsightRenderFailureCode | null) ?? null,
  failureDetail: (row.failure_detail as string | null) ?? null,
  attempts: Number(row.attempts ?? 0),
  maxAttempts: Number(row.max_attempts ?? 3),
  startedAt: asDate(row.started_at),
  finishedAt: asDate(row.finished_at),
  executionName: (row.execution_name as string | null) ?? null,
  outputAssetId: (row.output_asset_id as string | null) ?? null,
  outputReport: (row.output_report as Record<string, unknown> | null) ?? null,
  leaseExpiresAt: asDate(row.lease_expires_at),
  fenceToken: Number(row.fence_token ?? 0),
  createdAt: new Date(row.created_at as string),
  updatedAt: new Date(row.updated_at as string)
})

// ─────────────────────────────────────────────────────────────────────────────
// Readers (SIEMPRE org-scoped: la organización nunca se toma del payload sin autorizar)
// ─────────────────────────────────────────────────────────────────────────────

export const getInsightRenderRun = async (input: {
  organizationId: string
  renderRunId: string
  client?: InsightsDbClient
}): Promise<InsightRenderRunRecord | null> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    input.client,
    `SELECT ${RUN_COLUMNS} FROM greenhouse_insights.insight_render_runs
      WHERE organization_id = $1 AND render_run_id = $2`,
    [input.organizationId, input.renderRunId]
  )

  return rows[0] ? mapRunRow(rows[0]) : null
}

export const listInsightOutputsForRun = async (input: {
  organizationId: string
  renderRunId: string
  client?: InsightsDbClient
}): Promise<InsightOutputRecord[]> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    input.client,
    `SELECT ${OUTPUT_COLUMNS} FROM greenhouse_insights.insight_outputs
      WHERE organization_id = $1 AND render_run_id = $2
      ORDER BY output`,
    [input.organizationId, input.renderRunId]
  )

  return rows.map(mapOutputRow)
}

/** El manifest completo no viaja en el record de lista: el worker lo pide explícito. */
export const getInsightOutputManifest = async (
  insightOutputId: string,
  client?: InsightsDbClient
): Promise<Record<string, unknown> | null> => {
  const rows = await runInsightsQuery<{ manifest: Record<string, unknown> }>(
    client,
    `SELECT manifest FROM greenhouse_insights.insight_outputs WHERE insight_output_id = $1`,
    [insightOutputId]
  )

  return rows[0]?.manifest ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Claim y transiciones (las transiciones viven acá; ningún consumer hace UPDATE suelto)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Claim atómico del próximo output. Misma regla de prioridad que Proposal (deadline + aging):
 * `FOR UPDATE SKIP LOCKED` garantiza que dos ejecuciones concurrentes jamás tomen el mismo.
 */
export const DEFAULT_INSIGHT_RENDER_LEASE_MINUTES = 15

export const claimNextInsightOutputForExecution = async (input?: {
  agingMinutes?: number
  leaseMinutes?: number
  client?: InsightsDbClient
}): Promise<InsightOutputRecord | null> => {
  const agingMinutes = input?.agingMinutes ?? 30
  const leaseMinutes = input?.leaseMinutes ?? DEFAULT_INSIGHT_RENDER_LEASE_MINUTES

  return withClient(input?.client, async client => {
    const candidate = await client.query<{ insight_output_id: string; organization_id: string; render_run_id: string; state: string }>(
      `SELECT insight_output_id, organization_id, render_run_id, state
         FROM greenhouse_insights.insight_outputs
        WHERE (
            state = 'queued'
            -- Reclamo por lease VENCIDO. Sólo filas CON lease: una fila legada en estado running con
            -- lease NULL viene de un worker que no presenta fence al finalizar, así que
            -- reclamarla sí podría producir dos finalizaciones. Esas son huérfanas y las resuelve
            -- la reconciliación del Slice 3, no este claim.
            OR (state = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at < now())
          )
          AND (deadline IS NULL OR deadline > now())
        ORDER BY
          LEAST(
            COALESCE(deadline, 'infinity'::timestamptz),
            created_at + make_interval(mins => $1)
          ) ASC,
          created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED`,
      [agingMinutes]
    )

    const row = candidate.rows[0]

    if (!row) return null

    // El fence SUBE en cada claim: cualquier ejecución anterior queda con un token viejo y su
    // finalización no escribe nada. Sin esto, el reclamo de arriba produciría dos outputs finales.
    const updated = await client.query<Record<string, unknown>>(
      `UPDATE greenhouse_insights.insight_outputs
          SET state = 'running',
              started_at = now(),
              attempts = attempts + 1,
              lease_expires_at = now() + make_interval(mins => $2),
              fence_token = fence_token + 1,
              updated_at = now()
        WHERE insight_output_id = $1
        RETURNING ${OUTPUT_COLUMNS}`,
      [row.insight_output_id, leaseMinutes]
    )

    await client.query(
      `INSERT INTO greenhouse_insights.insight_render_events
         (insight_output_id, render_run_id, organization_id, from_state, to_state, detail, actor_kind)
       VALUES ($1, $2, $3, $4, 'running', $5, 'worker')`,
      [
        row.insight_output_id,
        row.render_run_id,
        row.organization_id,
        row.state,
        JSON.stringify({ claim: 'skip_locked', reclaimed: row.state === 'running' })
      ]
    )

    // El run entra en `running` con el primer output reclamado.
    await client.query(
      `UPDATE greenhouse_insights.insight_render_runs
          SET state = 'running', started_at = COALESCE(started_at, now()), updated_at = now()
        WHERE render_run_id = $1 AND state = 'pending'`,
      [row.render_run_id]
    )

    return mapOutputRow(updated.rows[0]!)
  })
}

const transitionOutput = async (input: {
  insightOutputId: string
  toState: InsightOutputState
  /**
   * Fence presentado por quien finaliza. Si no es el vigente, la fila ya fue reclamada por otra
   * ejecución y esta finalización se DESCARTA sin escribir. Omitirlo sólo es legítimo para
   * transiciones que no vienen de un worker (cancelación humana, reintento gobernado).
   */
  fenceToken?: number
  set?: string
  params?: unknown[]
  detail: Record<string, unknown>
  client?: InsightsDbClient
}): Promise<InsightOutputRecord> =>
  withClient(input.client, async client => {
    const current = await client.query<Record<string, unknown>>(
      `SELECT ${OUTPUT_COLUMNS} FROM greenhouse_insights.insight_outputs
        WHERE insight_output_id = $1 FOR UPDATE`,
      [input.insightOutputId]
    )

    const row = current.rows[0]

    if (!row) throw new Error(`Output ${input.insightOutputId} no existe.`)

    const from = row.state as InsightOutputState

    if (!isInsightOutputTransitionAllowed(from, input.toState)) {
      throw new Error(`Transición ilegal de output: ${from} → ${input.toState}.`)
    }

    // FENCING. Éste es el candado que impide que un worker con lease vencido —vivo pero lento—
    // finalice encima del que lo reemplazó. Sin él, el reclamo por lease produciría dos outputs
    // finales para una misma edición.
    if (input.fenceToken !== undefined && Number(row.fence_token ?? 0) !== input.fenceToken) {
      throw new InsightRenderFenceLostError(input.insightOutputId, input.fenceToken)
    }

    const extra = input.set ? `, ${input.set}` : ''

    const updated = await client.query<Record<string, unknown>>(
      `UPDATE greenhouse_insights.insight_outputs
          SET state = $2, updated_at = now()${extra}
        WHERE insight_output_id = $1
        RETURNING ${OUTPUT_COLUMNS}`,
      [input.insightOutputId, input.toState, ...(input.params ?? [])]
    )

    await client.query(
      `INSERT INTO greenhouse_insights.insight_render_events
         (insight_output_id, render_run_id, organization_id, from_state, to_state, detail, actor_kind)
       VALUES ($1, $2, $3, $4, $5, $6, 'worker')`,
      [
        input.insightOutputId,
        row.render_run_id,
        row.organization_id,
        from,
        input.toState,
        JSON.stringify(input.detail)
      ]
    )

    await rollupRunState(client, row.render_run_id as string)

    return mapOutputRow(updated.rows[0]!)
  })

/**
 * Estado del run derivado de sus outputs. `partial_failed` es el estado honesto cuando un target
 * cayó y otro no: decir `failed` mentiría sobre el deck que sí existe, y decir `completed` mentiría
 * sobre el informe que falta.
 */
const rollupRunState = async (
  client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
  renderRunId: string
): Promise<void> => {
  const counts = await client.query(
    `SELECT state, count(*)::int AS n FROM greenhouse_insights.insight_outputs
      WHERE render_run_id = $1 GROUP BY state`,
    [renderRunId]
  )

  const by = new Map(counts.rows.map(r => [r.state as string, Number(r.n)]))
  const total = [...by.values()].reduce((a, b) => a + b, 0)
  const completed = by.get('completed') ?? 0
  const cancelled = by.get('cancelled') ?? 0
  const terminalFailed = (by.get('failed') ?? 0) + (by.get('dead_letter') ?? 0)
  const pending = total - completed - cancelled - terminalFailed

  if (pending > 0) return

  const state =
    cancelled === total ? 'cancelled'
    : completed === total ? 'completed'
    : completed > 0 ? 'partial_failed'
    : 'failed'

  await client.query(
    `UPDATE greenhouse_insights.insight_render_runs
        SET state = $2, finished_at = now(), updated_at = now()
      WHERE render_run_id = $1`,
    [renderRunId, state]
  )
}

export const markInsightOutputCompleted = (input: {
  insightOutputId: string
  fenceToken: number
  outputAssetId: string
  outputReport: Record<string, unknown>
  client?: InsightsDbClient
}): Promise<InsightOutputRecord> =>
  transitionOutput({
    client: input.client,
    insightOutputId: input.insightOutputId,
    fenceToken: input.fenceToken,
    toState: 'completed',
    set: `finished_at = now(), output_asset_id = $3, output_report = $4`,
    params: [input.outputAssetId, JSON.stringify(input.outputReport)],
    detail: { outputAssetId: input.outputAssetId }
  })

export const markInsightOutputFailed = async (input: {
  insightOutputId: string
  /** Opcional: un fallo registrado por un worker desfasado no debe pisar al reclamante. */
  fenceToken?: number
  failureCode: InsightRenderFailureCode
  failureDetail: string
  client?: InsightsDbClient
}): Promise<InsightOutputRecord> => {
  const current = await runInsightsQuery<{ attempts: number; max_attempts: number }>(
    input.client,
    `SELECT attempts, max_attempts FROM greenhouse_insights.insight_outputs WHERE insight_output_id = $1`,
    [input.insightOutputId]
  )

  const exhausted = current[0] ? Number(current[0].attempts) >= Number(current[0].max_attempts) : false
  const terminal = exhausted || INSIGHT_NON_RETRYABLE_FAILURES.has(input.failureCode)

  return transitionOutput({
    client: input.client,
    insightOutputId: input.insightOutputId,
    fenceToken: input.fenceToken,
    toState: terminal ? 'dead_letter' : 'failed',
    set: `finished_at = now(), failure_code = $3, failure_detail = $4`,
    params: [input.failureCode, input.failureDetail.slice(0, 2000)],
    detail: { failureCode: input.failureCode, terminal }
  })
}
