import 'server-only'

import { randomUUID } from 'node:crypto'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  HIRING_DECISIONS,
  HIRING_DECISION_CAUSES,
  HIRING_FULFILLMENT_MODES,
  type DecideHiringApplicationInput,
  type DecideHiringApplicationResult,
  type HiringApplicationStage,
  type HiringDecision,
  type HiringDecisionCause,
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

/**
 * TASK-1765 — un desenlace terminal escribe SIEMPRE `stage='closed'`, y ninguna etapa espejo se
 * vuelve a escribir (ADR §3/§4). Antes esto era un espejo redundante — `decide` escribía el mismo
 * valor en los dos ejes y la etapa no aportaba un bit — y era además el origen del doble sentido de
 * la columna «Decisión», donde `on_hold` decía «terminó» y «sigue vivo» a la vez.
 *
 * `on_hold` conserva `decision_pending` mientras exista, y desaparece con él en el Slice 4.
 *
 * Esta es una `Record` TOTAL a propósito: agregar un desenlace al enum sin decidir su etapa deja de
 * compilar. Es el mismo default por inclusión que gobierna `HIRING_PIPELINE_STAGES`.
 */
const DECISION_STAGE: Record<HiringDecision, HiringApplicationStage> = {
  selected: 'closed',
  backup_selected: 'closed',
  not_selected: 'closed',
  rejected: 'closed',
  withdrawn: 'closed',
  unresponsive: 'closed',
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

/**
 * TASK-1765 — la causa es una BICONDICIONAL, no un campo opcional: obligatoria en `not_selected` y
 * prohibida en los otros cinco desenlaces. La base lo garantiza con
 * `hiring_application_decision_cause_pairing_check`; esto lo convierte en un 422 con prose es-CL en
 * vez de dejar que la violación llegue a PG y salga como 500.
 *
 * Por qué es enum y no prosa: el embudo de equidad ramifica por la causa (`capacity_filled` cuenta
 * como proceso concluido, `opening_closed` y `process_cancelled` NO) y el cuerpo del correo también.
 * Un texto libre acá haría irreproducible el análisis de impacto adverso.
 */
const assertCause = (
  value: HiringDecisionCause | null | undefined,
  decision: HiringDecision,
): HiringDecisionCause | null => {
  if (value != null && !HIRING_DECISION_CAUSES.includes(value)) {
    throw new HiringValidationError('La causa indicada no es válida.', 'hiring_decision_cause_invalid')
  }

  if (decision === 'not_selected' && !value) {
    throw new HiringValidationError(
      'Indica por qué esta persona no quedó: el cupo lo tomó otra persona, se cerró la búsqueda o se canceló el proceso.',
      'hiring_decision_cause_required',
      422,
    )
  }

  if (decision !== 'not_selected' && value) {
    throw new HiringValidationError(
      'La causa sólo corresponde cuando la persona llegó al final y no quedó.',
      'hiring_decision_cause_not_allowed',
      422,
    )
  }

  return value ?? null
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

/**
 * TASK-1765 — la causa ENTRA en la comparación de replay. Dos confirmaciones con la misma clave de
 * idempotencia y distinta causa son un CONFLICTO (409), no un replay: cerrar «porque el cupo lo tomó
 * otra persona» y cerrar «porque cancelamos el proceso» son hechos distintos, cuentan distinto en el
 * embudo de equidad y le mandan al candidato un cuerpo de correo distinto. Tratarlas como idénticas
 * dejaría la segunda intención silenciosamente descartada.
 *
 * `?? null` a ambos lados: las entradas de historial anteriores a esta task no tienen `cause`, y
 * `undefined !== null` las haría entrar en conflicto consigo mismas al reintentar.
 */
const sameReplayPayload = (
  entry: HiringDecisionHistoryEntry,
  input: DecideHiringApplicationInput,
  reason: HiringDecisionReason,
  destination: HiringFulfillmentMode | null,
  cause: HiringDecisionCause | null,
) =>
  entry.decision === input.decision &&
  entry.selectedDestination === destination &&
  (entry.cause ?? null) === cause &&
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
  const cause = assertCause(input.cause, decision)

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
      if (!sameReplayPayload(replay, input, reason, selectedDestination, cause)) {
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

    // Audit 2026-07-10: seleccionar contra un opening cerrado/cancelado produce un hire
    // sin vacante viva (handoff huérfano). Validar el contexto dentro de la misma tx.
    if (decision === 'selected' || decision === 'backup_selected') {
      const openingResult = await client.query<{ status: string }>(
        `SELECT status FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`,
        [currentRow.opening_id],
      )

      const openingStatus = openingResult.rows[0]?.status

      if (openingStatus === 'closed' || openingStatus === 'cancelled') {
        throw new HiringValidationError(
          'El opening ya está cerrado o cancelado; no se puede seleccionar esta postulación.',
          'hiring_opening_not_open_for_decision',
          409,
        )
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
      cause,
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
      // TASK-1765 — `decision` y `decision_cause` se escriben en el MISMO UPDATE, nunca en dos
      // escrituras: `hiring_application_decision_cause_pairing_check` es una bicondicional y
      // cualquier estado intermedio la viola. Lo mismo vale para `stage`, que el CHECK del
      // invariante (Slice 5) va a atar a `decision`.
      `UPDATE greenhouse_hiring.hiring_application
       SET decision = $2,
           decision_cause = $3,
           decision_at = $4,
           decision_by = $5,
           selected_destination = $6,
           tentative_start_date = $7,
           expected_legal_entity = $8,
           expected_context = $9,
           prerequisites_snapshot_json = $10::jsonb,
           stage = $11,
           explainability_json = jsonb_set(
             COALESCE(explainability_json, '{}'::jsonb),
             '{decisionHistory}',
             $12::jsonb,
             true
           )
       WHERE application_id = $1
       RETURNING ${HIRING_APPLICATION_COLUMNS}`,
      [
        safeApplicationId,
        decision,
        cause,
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
          // TASK-1765 — la causa es un enum gobernado, NO dato personal: entra al payload para que
          // el embudo de equidad y el correo ramifiquen por ella. La RAZÓN de la decisión (prosa
          // libre) y el nombre del candidato NUNCA entran acá.
          cause,
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
