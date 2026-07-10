import 'server-only'

import { randomUUID } from 'node:crypto'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  HIRING_DECISIONS,
  HIRING_FULFILLMENT_MODES,
  type DecideHiringApplicationInput,
  type DecideHiringApplicationResult,
  type HiringApplicationStage,
  type HiringDecision,
  type HiringDecisionHistoryEntry,
  type HiringDecisionReason,
  type HiringFulfillmentMode,
} from '@/types/hiring'

import { HiringNotFoundError, HiringValidationError } from './errors'
import {
  HIRING_APPLICATION_COLUMNS,
  normalizeHiringApplication,
  type HiringApplicationRow,
} from './store'

const DECISION_STAGE: Record<HiringDecision, HiringApplicationStage> = {
  selected: 'selected',
  backup_selected: 'backup',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
  on_hold: 'decision_pending',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizeReason = (reason?: HiringDecisionReason): HiringDecisionReason => {
  const summary = reason?.summary?.trim()

  if (!summary || summary.length < 8) {
    throw new HiringValidationError(
      'Explica la razón de la decisión con al menos 8 caracteres.',
      'hiring_decision_reason_required',
    )
  }

  if (summary.length > 1600) {
    throw new HiringValidationError(
      'La razón de la decisión no puede superar 1600 caracteres.',
      'hiring_decision_reason_too_long',
    )
  }

  const evidence = (reason?.evidence ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((item) => item.slice(0, 500))

  return {
    summary,
    ...(evidence.length > 0 ? { evidence } : {}),
    ...(reason?.overridesAdvisory ? { overridesAdvisory: true } : {}),
  }
}

const normalizeHistory = (value: unknown): HiringDecisionHistoryEntry[] => {
  if (!Array.isArray(value)) return []

  return value.filter(isRecord) as unknown as HiringDecisionHistoryEntry[]
}

const assertDecision = (value: string): HiringDecision => {
  if (!HIRING_DECISIONS.includes(value as HiringDecision)) {
    throw new HiringValidationError('La decisión indicada no es válida.', 'hiring_decision_invalid')
  }

  return value as HiringDecision
}

const assertDestination = (
  value: HiringFulfillmentMode | null | undefined,
  decision: HiringDecision,
): HiringFulfillmentMode | null => {
  if (value != null && !HIRING_FULFILLMENT_MODES.includes(value)) {
    throw new HiringValidationError('El destino seleccionado no es válido.', 'hiring_destination_invalid')
  }

  if ((decision === 'selected' || decision === 'backup_selected') && !value) {
    throw new HiringValidationError(
      'Selecciona el destino de la persona antes de confirmar.',
      'hiring_destination_required',
    )
  }

  return value ?? null
}

const sameReplayPayload = (
  entry: HiringDecisionHistoryEntry,
  input: DecideHiringApplicationInput,
  reason: HiringDecisionReason,
  destination: HiringFulfillmentMode | null,
) =>
  entry.decision === input.decision &&
  entry.selectedDestination === destination &&
  entry.reason.summary === reason.summary

/**
 * Registra una decisión humana con historial append-only. El snapshot actual vive
 * en columnas de `hiring_application`; la explicación defendible se conserva en
 * `explainability_json.decisionHistory[]` sin agregar DDL de negocio.
 */
export const decideHiringApplication = async (
  applicationId: string,
  input: DecideHiringApplicationInput,
  actorUserId: string | null,
): Promise<DecideHiringApplicationResult> => {
  const safeApplicationId = applicationId.trim()
  const idempotencyKey = input.idempotencyKey?.trim()

  if (!safeApplicationId) {
    throw new HiringValidationError('La postulación es obligatoria.', 'hiring_application_id_required')
  }

  if (!idempotencyKey || idempotencyKey.length > 160) {
    throw new HiringValidationError(
      'La clave de idempotencia es obligatoria y debe tener hasta 160 caracteres.',
      'hiring_decision_idempotency_key_invalid',
    )
  }

  const decision = assertDecision(input.decision)
  const reason = normalizeReason(input.reason)
  const selectedDestination = assertDestination(input.selectedDestination, decision)

  return withGreenhousePostgresTransaction(async (client) => {
    const currentResult = await client.query<HiringApplicationRow>(
      `SELECT ${HIRING_APPLICATION_COLUMNS}
       FROM greenhouse_hiring.hiring_application
       WHERE application_id = $1
       FOR UPDATE`,
      [safeApplicationId],
    )

    const currentRow = currentResult.rows[0]

    if (!currentRow) {
      throw new HiringNotFoundError('La postulación no existe.', 'hiring_application_not_found')
    }

    const currentExplainability = isRecord(currentRow.explainability_json)
      ? currentRow.explainability_json
      : {}

    const history = normalizeHistory(currentExplainability.decisionHistory)
    const replay = history.find((entry) => entry.idempotencyKey === idempotencyKey)

    if (replay) {
      if (!sameReplayPayload(replay, input, reason, selectedDestination)) {
        throw new HiringValidationError(
          'La clave de idempotencia ya fue usada con otra decisión.',
          'hiring_decision_idempotency_conflict',
          409,
        )
      }

      return {
        application: normalizeHiringApplication(currentRow),
        decisionEntry: replay,
        idempotentReplay: true,
      }
    }

    const now = new Date().toISOString()
    const previous = history.at(-1) ?? null

    // TASK-1383: snapshot del assessment AL MOMENTO de decidir, derivado del server (nunca
    // del caller). `hiring_application.score` se sobreescribe con cada finalize posterior —
    // sin esto, el score que se vio al decidir no es reconstruible (validity loop TASK-1364).
    const scoredCountResult = await client.query<{ n: string }>(
      `SELECT COUNT(*)::int AS n FROM greenhouse_hiring.hiring_assessment
       WHERE application_id = $1 AND status = 'scored'`,
      [safeApplicationId],
    )

    const assessmentSnapshot = {
      score: currentRow.score == null ? null : Number(currentRow.score),
      matchScore: currentRow.match_score == null ? null : Number(currentRow.match_score),
      scoredInstances: Number(scoredCountResult.rows[0]?.n ?? 0),
      capturedAt: now,
    }

    const decisionEntry: HiringDecisionHistoryEntry = {
      decisionId: `hiring-decision-${randomUUID()}`,
      idempotencyKey,
      decision,
      decidedAt: now,
      decidedBy: actorUserId,
      reason,
      selectedDestination,
      tentativeStartDate: input.tentativeStartDate ?? null,
      expectedLegalEntity: input.expectedLegalEntity?.trim() || null,
      expectedContext: input.expectedContext?.trim() || null,
      prerequisitesSnapshot: { ...(input.prerequisitesSnapshot ?? {}), assessment: assessmentSnapshot },
      supersedesDecisionId: previous?.decisionId ?? null,
    }

    const nextHistory = [...history, decisionEntry]

    const updatedResult = await client.query<HiringApplicationRow>(
      `UPDATE greenhouse_hiring.hiring_application
       SET decision = $2,
           decision_at = $3,
           decision_by = $4,
           selected_destination = $5,
           tentative_start_date = $6,
           expected_legal_entity = $7,
           expected_context = $8,
           prerequisites_snapshot_json = $9::jsonb,
           stage = $10,
           explainability_json = jsonb_set(
             COALESCE(explainability_json, '{}'::jsonb),
             '{decisionHistory}',
             $11::jsonb,
             true
           )
       WHERE application_id = $1
       RETURNING ${HIRING_APPLICATION_COLUMNS}`,
      [
        safeApplicationId,
        decision,
        now,
        actorUserId,
        selectedDestination,
        input.tentativeStartDate ?? null,
        decisionEntry.expectedLegalEntity,
        decisionEntry.expectedContext,
        JSON.stringify(decisionEntry.prerequisitesSnapshot),
        DECISION_STAGE[decision],
        JSON.stringify(nextHistory),
      ],
    )

    const updatedRow = updatedResult.rows[0]

    if (!updatedRow) {
      throw new HiringNotFoundError('La postulación no existe.', 'hiring_application_not_found')
    }

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringApplication,
        aggregateId: safeApplicationId,
        eventType: EVENT_TYPES.hiringApplicationDecided,
        payload: {
          applicationId: safeApplicationId,
          decisionId: decisionEntry.decisionId,
          decision,
          selectedDestination,
          decidedBy: actorUserId,
          decidedAt: now,
          supersedesDecisionId: decisionEntry.supersedesDecisionId,
        },
      },
      client,
    )

    return {
      application: normalizeHiringApplication(updatedRow),
      decisionEntry,
      idempotentReplay: false,
    }
  })
}
