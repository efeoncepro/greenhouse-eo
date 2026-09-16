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
import { publishInsightRenderOutputCompleted, publishInsightRenderOutputFailed } from '../events'
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

// El flag vive en `../flags` junto a los demás gates del dominio; se re-exporta para el worker.
export { isInsightsRenderEnabled } from '../flags'

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

/**
 * Cuota de concurrencia por organización. Sin esto, una org que encola veinte outputs monopoliza
 * el Job y deja a las demás —y a Proposal— esperando detrás. El límite se aplica EN EL CLAIM, no
 * en el enqueue: encolar es barato y legítimo; lo que se raciona es el worker.
 *
 * Fijado con el benchmark de Cloud Run staging (2026-09-16, ráfaga de 5): hoy el cuello de botella NO
 * es esta cuota sino el despacho — una ejecución del Job por tick de 2 min con `parallelism=1` —, así
 * que la concurrencia efectiva por org es 1 y 2 no limita nada todavía. Se mantiene en 2 como techo
 * para el día que el despacho lance más de una ejecución por tick: ese cambio debe re-medir acá.
 */
export const DEFAULT_INSIGHT_RENDER_ORG_CONCURRENCY = 2

export const claimNextInsightOutputForExecution = async (input?: {
  agingMinutes?: number
  leaseMinutes?: number
  orgConcurrency?: number
  client?: InsightsDbClient
}): Promise<InsightOutputRecord | null> => {
  const agingMinutes = input?.agingMinutes ?? 30
  const leaseMinutes = input?.leaseMinutes ?? DEFAULT_INSIGHT_RENDER_LEASE_MINUTES
  const orgConcurrency = input?.orgConcurrency ?? DEFAULT_INSIGHT_RENDER_ORG_CONCURRENCY

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
          -- Cuota por organización: se cuentan los outputs que ESA org tiene corriendo con lease
          -- vigente. Los de lease vencido no ocupan cupo (nadie los está trabajando) y los
          -- huérfanos sin lease tampoco, para que un colgado histórico no bloquee a su org para
          -- siempre.
          AND (
            SELECT count(*)
              FROM greenhouse_insights.insight_outputs AS activos
             WHERE activos.organization_id = greenhouse_insights.insight_outputs.organization_id
               AND activos.state = 'running'
               AND activos.lease_expires_at IS NOT NULL
               AND activos.lease_expires_at > now()
          ) < $2
        ORDER BY
          LEAST(
            COALESCE(deadline, 'infinity'::timestamptz),
            created_at + make_interval(mins => $1)
          ) ASC,
          created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED`,
      [agingMinutes, orgConcurrency]
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

    const record = mapOutputRow(updated.rows[0]!)

    // Evento en la MISMA transacción que el write (patrón canónico del dominio). Payload
    // redactado: ids, target, estado, intentos, asset id — nunca bytes, plan ni evidencia.
    if (input.toState === 'completed' || input.toState === 'failed' || input.toState === 'dead_letter') {
      const payload = {
        version: 1 as const,
        renderRunId: record.renderRunId,
        insightOutputId: record.insightOutputId,
        editionId: record.editionId,
        organizationId: record.organizationId,
        output: record.output,
        audience: record.audience,
        state: record.state,
        attempts: record.attempts,
        failureCode: record.failureCode,
        outputAssetId: record.outputAssetId
      }

      if (input.toState === 'completed') await publishInsightRenderOutputCompleted(client as never, payload)
      else await publishInsightRenderOutputFailed(client as never, payload)
    }

    return record
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

// ─────────────────────────────────────────────────────────────────────────────
// Slice 3 — recuperación gobernada (retry, cancelación, huérfanos)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reintenta los outputs de un run SIN tocar los que ya salieron bien.
 *
 * Es la forma del criterio "fallar report_pdf conserva deck_pdf exitoso; retry no duplica":
 * como la unidad es el output y su identidad es `(org, edición, target, audiencia)`, re-encolar
 * un `failed` reusa SU fila. Nunca se crea una segunda, y un `completed` ni se mira.
 *
 * `dead_letter` NO se reintenta acá: es terminal por diseño (intentos agotados o fallo no
 * reintentable). Resucitarlo es una decisión humana con su propio command, no un retry genérico.
 */
export const retryFailedInsightOutputs = async (input: {
  organizationId: string
  renderRunId: string
  /** Quién pidió el retry; queda en el historial. Default `system` para callers sin actor humano. */
  actorKind?: InsightRenderActorKind
  client?: InsightsDbClient
}): Promise<InsightOutputRecord[]> =>
  withClient(input.client, async client => {
    const failed = await client.query<Record<string, unknown>>(
      `SELECT ${OUTPUT_COLUMNS} FROM greenhouse_insights.insight_outputs
        WHERE organization_id = $1 AND render_run_id = $2 AND state = 'failed'
        FOR UPDATE`,
      [input.organizationId, input.renderRunId]
    )

    const requeued: InsightOutputRecord[] = []

    for (const row of failed.rows) {
      const outputId = row.insight_output_id as string

      const updated = await client.query<Record<string, unknown>>(
        `UPDATE greenhouse_insights.insight_outputs
            SET state = 'queued',
                lease_expires_at = NULL,
                failure_code = NULL,
                failure_detail = NULL,
                started_at = NULL,
                finished_at = NULL,
                updated_at = now()
          WHERE insight_output_id = $1
          RETURNING ${OUTPUT_COLUMNS}`,
        [outputId]
      )

      await client.query(
        `INSERT INTO greenhouse_insights.insight_render_events
           (insight_output_id, render_run_id, organization_id, from_state, to_state, detail, actor_kind)
         VALUES ($1, $2, $3, 'failed', 'queued', $4, $5)`,
        [outputId, input.renderRunId, input.organizationId, JSON.stringify({ retry: 'requeued' }), input.actorKind ?? 'system']
      )

      requeued.push(mapOutputRow(updated.rows[0]!))
    }

    if (requeued.length > 0) {
      await client.query(
        `UPDATE greenhouse_insights.insight_render_runs
            SET state = 'running', finished_at = NULL, updated_at = now()
          WHERE render_run_id = $1`,
        [input.renderRunId]
      )
    }

    return requeued
  })

/**
 * Cancela el trabajo RESTANTE de un run.
 *
 * Honesto por diseño: cancela lo que todavía no empezó (`queued`) y lo que falló, pero NO miente
 * sobre un output que ya está renderizando — no podemos matar el proceso del worker, y marcarlo
 * `cancelled` diría que no va a producir bytes cuando puede producirlos. Ése termina solo: su
 * finalización queda gobernada por el fence y el run refleja el resultado real.
 */
export const cancelInsightRenderRun = async (input: {
  organizationId: string
  renderRunId: string
  /** Quién pidió la cancelación; queda en el historial. Default `system`. */
  actorKind?: InsightRenderActorKind
  client?: InsightsDbClient
}): Promise<{ cancelled: number; stillRunning: number }> =>
  withClient(input.client, async client => {
    const targets = await client.query<{ insight_output_id: string; state: string }>(
      `SELECT insight_output_id, state FROM greenhouse_insights.insight_outputs
        WHERE organization_id = $1 AND render_run_id = $2 AND state IN ('queued', 'failed', 'running')
        FOR UPDATE`,
      [input.organizationId, input.renderRunId]
    )

    let cancelled = 0
    let stillRunning = 0

    for (const row of targets.rows) {
      if (row.state === 'running') {
        stillRunning += 1
        continue
      }

      await client.query(
        `UPDATE greenhouse_insights.insight_outputs
            SET state = 'cancelled', failure_code = 'cancelled',
                failure_detail = 'Cancelado por solicitud sobre el run.',
                finished_at = now(), updated_at = now()
          WHERE insight_output_id = $1`,
        [row.insight_output_id]
      )

      await client.query(
        `INSERT INTO greenhouse_insights.insight_render_events
           (insight_output_id, render_run_id, organization_id, from_state, to_state, detail, actor_kind)
         VALUES ($1, $2, $3, $4, 'cancelled', $5, $6)`,
        [
          row.insight_output_id,
          input.renderRunId,
          input.organizationId,
          row.state,
          JSON.stringify({ cancel: 'run_scope' }),
          input.actorKind ?? 'system'
        ]
      )

      cancelled += 1
    }

    if (stillRunning === 0) {
      await client.query(
        `UPDATE greenhouse_insights.insight_render_runs
            SET state = 'cancelled', cancelled_at = now(), finished_at = now(), updated_at = now()
          WHERE render_run_id = $1`,
        [input.renderRunId]
      )
    }

    return { cancelled, stillRunning }
  })

// ─────────────────────────────────────────────────────────────────────────────
// Altas y lecturas por edición (las usa el command de encolado y el puerto de outputs)
// ─────────────────────────────────────────────────────────────────────────────

/** Quién actuó sobre un render. `client_user` = usuario del portal cliente (no es un member). */
export type InsightRenderActorKind = 'member' | 'client_user' | 'system' | 'cli'

export interface InsertInsightRenderRunInput {
  organizationId: string
  editionId: string
  audience: InsightAudience
  requestedOutputs: InsightOutput[]
  requestedByKind: InsightRenderActorKind
  requestedByUserId: string | null
  requestedByMemberId: string | null
  outputs: Array<{
    output: InsightOutput
    catalogName: string
    manifest: Record<string, unknown>
    manifestHash: string
    constraints?: Record<string, unknown>
    deadline?: Date | null
  }>
  client: InsightsDbClient
}

/**
 * Inserta run + outputs en la transacción del caller. Un output por target; la UNIQUE
 * `(org, edición, output, audiencia)` hace que un segundo encargo del mismo target reviente en DB
 * en vez de duplicar bytes — el command lo resuelve ANTES leyendo lo existente.
 */
export const insertInsightRenderRun = async (
  input: InsertInsightRenderRunInput
): Promise<{ run: InsightRenderRunRecord; outputs: InsightOutputRecord[] }> => {
  const run = await input.client.query<Record<string, unknown>>(
    `INSERT INTO greenhouse_insights.insight_render_runs
       (organization_id, edition_id, audience, requested_outputs, requested_by_kind,
        requested_by_user_id, requested_by_member_id)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
     RETURNING ${RUN_COLUMNS}`,
    [
      input.organizationId,
      input.editionId,
      input.audience,
      JSON.stringify(input.requestedOutputs),
      input.requestedByKind,
      input.requestedByUserId,
      input.requestedByMemberId
    ]
  )

  const runRecord = mapRunRow(run.rows[0]!)
  const outputs: InsightOutputRecord[] = []

  for (const output of input.outputs) {
    const row = await input.client.query<Record<string, unknown>>(
      `INSERT INTO greenhouse_insights.insight_outputs
         (render_run_id, organization_id, edition_id, output, audience, catalog_name,
          manifest, manifest_hash, constraints, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10)
       RETURNING ${OUTPUT_COLUMNS}`,
      [
        runRecord.renderRunId,
        input.organizationId,
        input.editionId,
        output.output,
        input.audience,
        output.catalogName,
        JSON.stringify(output.manifest),
        output.manifestHash,
        JSON.stringify(output.constraints ?? {}),
        output.deadline ?? null
      ]
    )

    await input.client.query(
      `INSERT INTO greenhouse_insights.insight_render_events
         (insight_output_id, render_run_id, organization_id, from_state, to_state, detail, actor_kind)
       VALUES ($1, $2, $3, NULL, 'queued', $4, $5)`,
      [
        row.rows[0]!.insight_output_id,
        runRecord.renderRunId,
        input.organizationId,
        JSON.stringify({ manifestHash: output.manifestHash, catalogName: output.catalogName }),
        input.requestedByKind
      ]
    )

    outputs.push(mapOutputRow(row.rows[0]!))
  }

  return { run: runRecord, outputs }
}

/**
 * Outputs de una edición para UNA audiencia. Es la lectura del puerto de outputs y la base de la
 * idempotencia del encargo: la audiencia entra en la clave porque un job de cliente jamás reutiliza
 * los bytes de un draft interno aunque coincidan organización y período.
 */
export const findInsightOutputsForEdition = async (input: {
  organizationId: string
  editionId: string
  audience: InsightAudience
  client?: InsightsDbClient
}): Promise<InsightOutputRecord[]> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    input.client,
    `SELECT ${OUTPUT_COLUMNS} FROM greenhouse_insights.insight_outputs
      WHERE organization_id = $1 AND edition_id = $2 AND audience = $3
      ORDER BY created_at DESC`,
    [input.organizationId, input.editionId, input.audience]
  )

  return rows.map(mapOutputRow)
}

export const listInsightRenderRuns = async (input: {
  organizationId: string
  editionId?: string | null
  audience?: InsightAudience | null
  limit: number
  offset: number
  client?: InsightsDbClient
}): Promise<{ items: InsightRenderRunRecord[]; total: number }> => {
  const where: string[] = ['organization_id = $1']
  const params: unknown[] = [input.organizationId]

  if (input.editionId) {
    params.push(input.editionId)
    where.push(`edition_id = $${params.length}`)
  }

  if (input.audience) {
    params.push(input.audience)
    where.push(`audience = $${params.length}`)
  }

  const total = await runInsightsQuery<{ n: string }>(
    input.client,
    `SELECT count(*)::text AS n FROM greenhouse_insights.insight_render_runs WHERE ${where.join(' AND ')}`,
    params
  )

  params.push(input.limit, input.offset)

  const rows = await runInsightsQuery<Record<string, unknown>>(
    input.client,
    `SELECT ${RUN_COLUMNS} FROM greenhouse_insights.insight_render_runs
      WHERE ${where.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  return { items: rows.map(mapRunRow), total: Number(total[0]?.n ?? 0) }
}
