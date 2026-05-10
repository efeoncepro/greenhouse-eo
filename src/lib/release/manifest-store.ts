import 'server-only'

import { randomUUID } from 'node:crypto'

import { withTransaction, query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { EVENT_TYPES, AGGREGATE_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  assertValidReleaseStateTransition,
  isActiveReleaseState,
  type ReleaseState
} from './state-machine'

/**
 * TASK-848 — Production Release Control Plane: typed helpers para
 * `greenhouse_sync.release_manifests` + `release_state_transitions`.
 *
 * Single source of truth para cualquier code path que necesite:
 *   - INSERT release manifest (recordReleaseStarted)
 *   - UPDATE state + audit row + outbox event en misma tx (transitionReleaseState)
 *   - Lookup ultimo release activo por branch (getActiveReleaseForBranch)
 *   - Lookup release por release_id (getReleaseById)
 *
 * **Atomicidad**: cada transicion escribe atomicamente:
 *   1. UPDATE release_manifests.state (con anti-immutable trigger)
 *   2. INSERT release_state_transitions (append-only)
 *   3. publishOutboxEvent platform.release.<state> v1
 *
 * Si CUALQUIER step falla, ROLLBACK completo via withTransaction. La state
 * machine garantiza que NUNCA queda fila sin audit ni outbox event.
 *
 * **Idempotency**: re-correr `recordReleaseStarted` con el mismo target_sha
 * crea row nueva con `attempt_n` incrementado (NO upsert, NO dedup).
 *
 * Patron canonico mirror de TASK-765 `markPaymentOrderPaidAtomic`.
 *
 * Spec: `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`.
 */

/**
 * Conversion del enum TS a outbox event type. Mapping declarativo,
 * no-dynamic — fail-loud si emerge state nuevo sin emitter.
 */
const EVENT_TYPE_FOR_STATE: Record<ReleaseState, (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]> = {
  preflight: EVENT_TYPES.platformReleaseStarted,
  ready: EVENT_TYPES.platformReleaseStarted, // ready = preflight passed; same event semantics
  deploying: EVENT_TYPES.platformReleaseDeploying,
  verifying: EVENT_TYPES.platformReleaseVerifying,
  released: EVENT_TYPES.platformReleaseReleased,
  degraded: EVENT_TYPES.platformReleaseDegraded,
  rolled_back: EVENT_TYPES.platformReleaseRolledBack,
  aborted: EVENT_TYPES.platformReleaseAborted
}

export interface ReleaseManifest {
  releaseId: string
  targetSha: string
  sourceBranch: string
  targetBranch: string
  state: ReleaseState
  attemptN: number
  triggeredBy: string
  operatorMemberId: string | null
  startedAt: string
  completedAt: string | null
  vercelDeploymentUrl: string | null
  previousVercelDeploymentUrl: string | null
  workerRevisions: Record<string, unknown>
  previousWorkerRevisions: Record<string, unknown>
  workflowRuns: unknown[]
  preflightResult: Record<string, unknown>
  postReleaseHealth: Record<string, unknown>
  rollbackPlan: Record<string, unknown>
}

interface RecordReleaseStartedInput {
  targetSha: string
  sourceBranch?: string
  targetBranch?: string
  triggeredBy: string
  operatorMemberId?: string | null
  preflightResult?: Record<string, unknown>
}

/**
 * Genera el releaseId canonico `<short_sha>-<uuidv4>`. Spec V1 §2.4.
 */
export const buildReleaseId = (targetSha: string): string => {
  if (targetSha.length < 12) {
    throw new Error(
      `buildReleaseId: target_sha debe tener >= 12 chars, recibido length=${targetSha.length}`
    )
  }

  if (!/^[0-9a-f]+$/.test(targetSha)) {
    throw new Error(`buildReleaseId: target_sha debe ser hex lowercase, recibido='${targetSha}'`)
  }

  return `${targetSha.slice(0, 12)}-${randomUUID()}`
}

/**
 * Resuelve el siguiente attempt_n para un (target_sha, target_branch).
 * SELECT con FOR UPDATE para race-safety dentro de tx.
 */
const resolveNextAttemptN = async (
  targetSha: string,
  targetBranch: string
): Promise<number> => {
  const rows = await query<{ max_attempt: number | null }>(
    `SELECT MAX(attempt_n) AS max_attempt
       FROM greenhouse_sync.release_manifests
       WHERE target_sha = $1 AND target_branch = $2`,
    [targetSha, targetBranch]
  )

  const max = rows[0]?.max_attempt ?? 0

  return max + 1
}

/**
 * INSERT row inicial en `release_manifests` con state='preflight'.
 *
 * - Resuelve attempt_n incrementando sobre runs previos del mismo
 *   (target_sha, target_branch).
 * - Genera releaseId canonico.
 * - Emite outbox event `platform.release.started v1` en misma tx.
 * - Inserta audit row en release_state_transitions con from_state='unknown_legacy'
 *   (signal del INSERT inicial — el state machine arranca aqui).
 */
export const recordReleaseStarted = async (
  input: RecordReleaseStartedInput
): Promise<ReleaseManifest> => {
  const sourceBranch = input.sourceBranch ?? 'develop'
  const targetBranch = input.targetBranch ?? 'main'
  const releaseId = buildReleaseId(input.targetSha)
  const attemptN = await resolveNextAttemptN(input.targetSha, targetBranch)
  const startedAt = new Date().toISOString()
  const preflightResult = input.preflightResult ?? {}

  return withTransaction(async (tx) => {
    // 1. INSERT manifest
    const insertResult = await tx.query(
      `INSERT INTO greenhouse_sync.release_manifests (
        release_id, target_sha, source_branch, target_branch,
        state, attempt_n, triggered_by, operator_member_id,
        started_at, preflight_result
      )
      VALUES ($1, $2, $3, $4, 'preflight', $5, $6, $7, $8, $9::jsonb)
      RETURNING release_id, target_sha, source_branch, target_branch,
        state, attempt_n, triggered_by, operator_member_id,
        started_at, completed_at, vercel_deployment_url,
        previous_vercel_deployment_url, worker_revisions,
        previous_worker_revisions, workflow_runs,
        preflight_result, post_release_health, rollback_plan`,
      [
        releaseId,
        input.targetSha,
        sourceBranch,
        targetBranch,
        attemptN,
        input.triggeredBy,
        input.operatorMemberId ?? null,
        startedAt,
        JSON.stringify(preflightResult)
      ]
    )

    const row = (insertResult.rows[0] ?? {}) as Record<string, unknown>

    // 2. INSERT audit row para el INSERT inicial (from='unknown_legacy' signaling birth)
    await tx.query(
      `INSERT INTO greenhouse_sync.release_state_transitions (
        release_id, from_state, to_state, actor_kind, actor_label,
        actor_member_id, reason, metadata_json, transitioned_at
      )
      VALUES ($1, 'unknown_legacy', 'preflight', $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        releaseId,
        deriveActorKindFromTriggeredBy(input.triggeredBy),
        input.triggeredBy,
        input.operatorMemberId ?? null,
        `Release iniciado: ${input.triggeredBy}`,
        JSON.stringify({ attempt_n: attemptN, target_sha: input.targetSha }),
        startedAt
      ]
    )

    // 3. Outbox event `platform.release.started v1` en misma tx
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.platformRelease,
        aggregateId: releaseId,
        eventType: EVENT_TYPES.platformReleaseStarted,
        payload: {
          version: 1,
          releaseId,
          targetSha: input.targetSha,
          sourceBranch,
          targetBranch,
          attemptN,
          triggeredBy: input.triggeredBy,
          operatorMemberId: input.operatorMemberId ?? null,
          startedAt,
          preflightResult
        }
      },
      tx as never
    )

    return rowToManifest(row)
  }).catch((error) => {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'production_release', stage: 'record_started' },
      extra: { targetSha: input.targetSha, attemptN }
    })
    throw error
  })
}

interface TransitionInput {
  releaseId: string
  fromState: ReleaseState
  toState: ReleaseState
  actorKind: 'member' | 'system' | 'cli'
  actorLabel: string
  actorMemberId?: string | null
  reason: string
  metadata?: Record<string, unknown>
  payloadExtras?: Record<string, unknown>
}

/**
 * Transiciona el state de un release atomicamente:
 *   1. assertValidReleaseStateTransition() — fail-loud si transition prohibida
 *   2. UPDATE release_manifests.state (anti-immutable trigger valida campos identity)
 *   3. INSERT release_state_transitions append-only
 *   4. publishOutboxEvent platform.release.<state> v1
 *
 * Si entra a un terminal state (released | rolled_back | aborted), tambien
 * SETS completed_at = NOW().
 *
 * Validates reason >= 5 chars (CHECK constraint del audit log).
 */
export const transitionReleaseState = async (
  input: TransitionInput
): Promise<void> => {
  if (input.reason.trim().length < 5) {
    throw new Error(
      `transitionReleaseState: reason debe tener >= 5 chars (CHECK enforced), recibido length=${input.reason.trim().length}`
    )
  }

  // Application guard fail-loud antes de tocar DB.
  assertValidReleaseStateTransition(input.fromState, input.toState, input.releaseId)

  const isTerminal = !isActiveReleaseState(input.toState) && input.toState !== 'released'
  const setsCompletedAt = ['released', 'rolled_back', 'aborted'].includes(input.toState)

  await withTransaction(async (tx) => {
    // 1. UPDATE manifest. Espera fromState como guardia optimista (rechazaria
    // si otro actor cambio state mientras tanto via partial UNIQUE INDEX +
    // anti-immutable trigger; aqui agregamos lock aplicativo).
    const updateResult = await tx.query(
      `UPDATE greenhouse_sync.release_manifests
         SET state = $1,
             completed_at = CASE WHEN $2::boolean THEN NOW() ELSE completed_at END
       WHERE release_id = $3
         AND state = $4
       RETURNING release_id`,
      [input.toState, setsCompletedAt, input.releaseId, input.fromState]
    )

    if (updateResult.rowCount === 0) {
      throw new Error(
        `transitionReleaseState: release ${input.releaseId} no esta en state '${input.fromState}'. Posible race con otro actor o release_id incorrecto.`
      )
    }

    // 2. INSERT audit row append-only.
    await tx.query(
      `INSERT INTO greenhouse_sync.release_state_transitions (
        release_id, from_state, to_state, actor_kind, actor_label,
        actor_member_id, reason, metadata_json, transitioned_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())`,
      [
        input.releaseId,
        input.fromState,
        input.toState,
        input.actorKind,
        input.actorLabel,
        input.actorMemberId ?? null,
        input.reason,
        JSON.stringify(input.metadata ?? {})
      ]
    )

    // 3. Outbox event versionado v1 en misma tx.
    const eventType = EVENT_TYPE_FOR_STATE[input.toState]

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.platformRelease,
        aggregateId: input.releaseId,
        eventType,
        payload: {
          version: 1,
          releaseId: input.releaseId,
          fromState: input.fromState,
          toState: input.toState,
          actorKind: input.actorKind,
          actorLabel: input.actorLabel,
          reason: input.reason,
          isTerminal,
          ...(input.payloadExtras ?? {})
        }
      },
      tx as never
    )
  }).catch((error) => {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'production_release', stage: 'transition_state' },
      extra: {
        releaseId: input.releaseId,
        fromState: input.fromState,
        toState: input.toState
      }
    })
    throw error
  })
}

/**
 * Lookup release activo por branch (state IN ('preflight','ready','deploying','verifying')).
 *
 * Garantizado a devolver max 1 row por el partial UNIQUE INDEX
 * `release_manifests_one_active_per_branch_idx`.
 */
export const getActiveReleaseForBranch = async (
  targetBranch: string
): Promise<ReleaseManifest | null> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT release_id, target_sha, source_branch, target_branch,
            state, attempt_n, triggered_by, operator_member_id,
            started_at, completed_at, vercel_deployment_url,
            previous_vercel_deployment_url, worker_revisions,
            previous_worker_revisions, workflow_runs,
            preflight_result, post_release_health, rollback_plan
       FROM greenhouse_sync.release_manifests
       WHERE target_branch = $1
         AND state IN ('preflight','ready','deploying','verifying')
       LIMIT 1`,
    [targetBranch]
  )

  return rows[0] ? rowToManifest(rows[0]) : null
}

/**
 * Lookup release por release_id. Para forensic / rollback CLI.
 */
export const getReleaseById = async (
  releaseId: string
): Promise<ReleaseManifest | null> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT release_id, target_sha, source_branch, target_branch,
            state, attempt_n, triggered_by, operator_member_id,
            started_at, completed_at, vercel_deployment_url,
            previous_vercel_deployment_url, worker_revisions,
            previous_worker_revisions, workflow_runs,
            preflight_result, post_release_health, rollback_plan
       FROM greenhouse_sync.release_manifests
       WHERE release_id = $1`,
    [releaseId]
  )

  return rows[0] ? rowToManifest(rows[0]) : null
}

/**
 * Lookup ultimo release per branch ordenado por started_at DESC.
 * Para dashboard `/admin/releases` (TASK-854 V1.1).
 */
export const listRecentReleases = async (params: {
  targetBranch?: string
  limit?: number
}): Promise<ReleaseManifest[]> => {
  const limit = Math.min(params.limit ?? 30, 100)
  const targetBranch = params.targetBranch ?? 'main'

  const rows = await query<Record<string, unknown>>(
    `SELECT release_id, target_sha, source_branch, target_branch,
            state, attempt_n, triggered_by, operator_member_id,
            started_at, completed_at, vercel_deployment_url,
            previous_vercel_deployment_url, worker_revisions,
            previous_worker_revisions, workflow_runs,
            preflight_result, post_release_health, rollback_plan
       FROM greenhouse_sync.release_manifests
       WHERE target_branch = $1
       ORDER BY started_at DESC
       LIMIT $2`,
    [targetBranch, limit]
  )

  return rows.map(rowToManifest)
}

/**
 * Helper: deriva actor_kind del prefijo de triggered_by.
 *
 * Convencion canonica:
 *   - 'member:<member_id>' → 'member'
 *   - 'system:<actor>' → 'system'
 *   - 'cli:<gh_login>' → 'cli'
 */
export const deriveActorKindFromTriggeredBy = (
  triggeredBy: string
): 'member' | 'system' | 'cli' => {
  if (triggeredBy.startsWith('system:')) return 'system'
  if (triggeredBy.startsWith('cli:')) return 'cli'

  return 'member'
}

const rowToManifest = (row: Record<string, unknown>): ReleaseManifest => ({
  releaseId: String(row.release_id),
  targetSha: String(row.target_sha),
  sourceBranch: String(row.source_branch),
  targetBranch: String(row.target_branch),
  state: row.state as ReleaseState,
  attemptN: Number(row.attempt_n),
  triggeredBy: String(row.triggered_by),
  operatorMemberId: row.operator_member_id != null ? String(row.operator_member_id) : null,
  startedAt: toIsoString(row.started_at),
  completedAt: row.completed_at != null ? toIsoString(row.completed_at) : null,
  vercelDeploymentUrl:
    row.vercel_deployment_url != null ? String(row.vercel_deployment_url) : null,
  previousVercelDeploymentUrl:
    row.previous_vercel_deployment_url != null
      ? String(row.previous_vercel_deployment_url)
      : null,
  workerRevisions: (row.worker_revisions as Record<string, unknown>) ?? {},
  previousWorkerRevisions:
    (row.previous_worker_revisions as Record<string, unknown>) ?? {},
  workflowRuns: (row.workflow_runs as unknown[]) ?? [],
  preflightResult: (row.preflight_result as Record<string, unknown>) ?? {},
  postReleaseHealth: (row.post_release_health as Record<string, unknown>) ?? {},
  rollbackPlan: (row.rollback_plan as Record<string, unknown>) ?? {}
})

const toIsoString = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return new Date(value).toISOString()

  return new Date(0).toISOString()
}
