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

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import type { InsightAudience, InsightOutput } from '../contracts/request'

import {
  INSIGHT_NON_RETRYABLE_FAILURES,
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
  started_at, finished_at, execution_name, output_asset_id, output_report, created_at, updated_at`

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
  createdAt: new Date(row.created_at as string),
  updatedAt: new Date(row.updated_at as string)
})

// ─────────────────────────────────────────────────────────────────────────────
// Readers (SIEMPRE org-scoped: la organización nunca se toma del payload sin autorizar)
// ─────────────────────────────────────────────────────────────────────────────

export const getInsightRenderRun = async (input: {
  organizationId: string
  renderRunId: string
}): Promise<InsightRenderRunRecord | null> => {
  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT ${RUN_COLUMNS} FROM greenhouse_insights.insight_render_runs
      WHERE organization_id = $1 AND render_run_id = $2`,
    [input.organizationId, input.renderRunId]
  )

  return rows[0] ? mapRunRow(rows[0]) : null
}

export const listInsightOutputsForRun = async (input: {
  organizationId: string
  renderRunId: string
}): Promise<InsightOutputRecord[]> => {
  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT ${OUTPUT_COLUMNS} FROM greenhouse_insights.insight_outputs
      WHERE organization_id = $1 AND render_run_id = $2
      ORDER BY output`,
    [input.organizationId, input.renderRunId]
  )

  return rows.map(mapOutputRow)
}

/** El manifest completo no viaja en el record de lista: el worker lo pide explícito. */
export const getInsightOutputManifest = async (
  insightOutputId: string
): Promise<Record<string, unknown> | null> => {
  const rows = await runGreenhousePostgresQuery<{ manifest: Record<string, unknown> }>(
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
export const claimNextInsightOutputForExecution = async (input?: {
  agingMinutes?: number
}): Promise<InsightOutputRecord | null> => {
  const agingMinutes = input?.agingMinutes ?? 30

  return withGreenhousePostgresTransaction(async client => {
    const candidate = await client.query<{ insight_output_id: string; organization_id: string; render_run_id: string }>(
      `SELECT insight_output_id, organization_id, render_run_id
         FROM greenhouse_insights.insight_outputs
        WHERE state = 'queued'
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

    const updated = await client.query<Record<string, unknown>>(
      `UPDATE greenhouse_insights.insight_outputs
          SET state = 'running', started_at = now(), attempts = attempts + 1, updated_at = now()
        WHERE insight_output_id = $1
        RETURNING ${OUTPUT_COLUMNS}`,
      [row.insight_output_id]
    )

    await client.query(
      `INSERT INTO greenhouse_insights.insight_render_events
         (insight_output_id, render_run_id, organization_id, from_state, to_state, detail, actor_kind)
       VALUES ($1, $2, $3, 'queued', 'running', $4, 'worker')`,
      [row.insight_output_id, row.render_run_id, row.organization_id, JSON.stringify({ claim: 'skip_locked' })]
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
  set?: string
  params?: unknown[]
  detail: Record<string, unknown>
}): Promise<InsightOutputRecord> =>
  withGreenhousePostgresTransaction(async client => {
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
  outputAssetId: string
  outputReport: Record<string, unknown>
}): Promise<InsightOutputRecord> =>
  transitionOutput({
    insightOutputId: input.insightOutputId,
    toState: 'completed',
    set: `finished_at = now(), output_asset_id = $3, output_report = $4`,
    params: [input.outputAssetId, JSON.stringify(input.outputReport)],
    detail: { outputAssetId: input.outputAssetId }
  })

export const markInsightOutputFailed = async (input: {
  insightOutputId: string
  failureCode: InsightRenderFailureCode
  failureDetail: string
}): Promise<InsightOutputRecord> => {
  const current = await runGreenhousePostgresQuery<{ attempts: number; max_attempts: number }>(
    `SELECT attempts, max_attempts FROM greenhouse_insights.insight_outputs WHERE insight_output_id = $1`,
    [input.insightOutputId]
  )

  const exhausted = current[0] ? Number(current[0].attempts) >= Number(current[0].max_attempts) : false
  const terminal = exhausted || INSIGHT_NON_RETRYABLE_FAILURES.has(input.failureCode)

  return transitionOutput({
    insightOutputId: input.insightOutputId,
    toState: terminal ? 'dead_letter' : 'failed',
    set: `finished_at = now(), failure_code = $3, failure_detail = $4`,
    params: [input.failureCode, input.failureDetail.slice(0, 2000)],
    detail: { failureCode: input.failureCode, terminal }
  })
}
