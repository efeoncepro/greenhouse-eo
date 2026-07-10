import 'server-only'

// TASK-356 — materializeHandoffFromApplication: construye/actualiza el HiringHandoff desde el
// snapshot ACTUAL de hiring_application (nunca desde el payload del evento — hay coalescing por
// scope en el consumer reactivo). Abre su propia transacción (`refresh()` no recibe client).
//
// Invariantes (task §Data model and invariants):
// - Solo `decision='selected'` materializa. rejected|withdrawn|on_hold|backup_selected → si no
//   hay handoff, no-op explícito; si hay, REVOCACIÓN (pending/blocked → cancelled;
//   post-aprobación → blocked:decision_revoked). Un backup NUNCA entra a la cola de onboarding.
// - Un handoff por aplicación (UNIQUE) con supersede guardado por decision_id + state:
//   mismo decision_id → no-op idempotente; pending/blocked → se re-deriva y audita;
//   approved|in_setup|completed → blocked:decision_superseded_after_approval (nunca overwrite).
// - Destinos sin owner V1 (contractor/partner/internal_reassignment) nacen blocked, nunca mudos.
// - Boundary: NUNCA escribe members/assignments/placements/payroll_*/compensation_versions/
//   final_settlements/contractor_engagements/providers/expenses.
// - Resolver loud: precondición rota → captureWithDomain + throw tipado (retry/dead-letter),
//   nunca `recorded=0` mudo (Playbook V2).

import type { PoolClient } from 'pg'

import { captureWithDomain } from '@/lib/observability/capture'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { HiringDecision, HiringFulfillmentMode } from '@/types/hiring'

import { HiringValidationError } from '../errors'
import { isPostApprovalState } from './state-machine'
import {
  appendHandoffAudit,
  insertHandoff,
  lockHandoffByApplicationId,
  normalizeHiringHandoff,
  updateHandoffState,
  type HiringHandoffRow,
} from './store'
import { isSupportedHandoffDestination, type HiringHandoff, type HiringHandoffState, type MaterializeHandoffOutcome } from './types'

interface ApplicationSnapshotRow {
  application_id: string
  opening_id: string
  identity_profile_id: string
  candidate_facet_id: string
  decision: string | null
  selected_destination: string | null
  tentative_start_date: string | Date | null
  expected_legal_entity: string | null
  prerequisites_snapshot_json: unknown
  explainability_json: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toDateOnly = (value: string | Date | null): string | null => {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

/** Última entrada de explainability_json.decisionHistory[] — ancla del supersede. */
const resolveLatestDecisionId = (explainability: unknown): string | null => {
  if (!isRecord(explainability)) return null

  const history = explainability.decisionHistory

  if (!Array.isArray(history) || history.length === 0) return null

  const last = history[history.length - 1]

  return isRecord(last) && typeof last.decisionId === 'string' ? last.decisionId : null
}

const emitHandoffEvent = async (
  client: PoolClient,
  eventType: string,
  handoff: HiringHandoff,
  extra: Record<string, unknown> = {},
): Promise<void> => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.hiringHandoff,
      aggregateId: handoff.handoffId,
      eventType,
      payload: {
        handoffId: handoff.handoffId,
        applicationId: handoff.applicationId,
        openingId: handoff.openingId,
        decisionId: handoff.decisionId,
        selectedDestination: handoff.selectedDestination,
        state: handoff.state,
        blockedReason: handoff.blockedReason,
        ...extra,
      },
    },
    client,
  )
}

const deriveBirthState = (
  destination: HiringFulfillmentMode,
): { state: Extract<HiringHandoffState, 'pending' | 'blocked'>; blockedReason: 'destination_not_supported' | null } =>
  isSupportedHandoffDestination(destination)
    ? { state: 'pending', blockedReason: null }
    : { state: 'blocked', blockedReason: 'destination_not_supported' }

/**
 * Idempotente por (application, decision_id). Retorna el outcome para que el consumer
 * reactivo lo registre como actionDescription observable.
 */
export const materializeHandoffFromApplication = async (
  applicationId: string,
): Promise<MaterializeHandoffOutcome> => {
  const safeApplicationId = applicationId.trim()

  if (!safeApplicationId) {
    throw new HiringValidationError('La postulación es obligatoria.', 'hiring_application_id_required')
  }

  return withGreenhousePostgresTransaction(async (client) => {
    const appResult = await client.query<ApplicationSnapshotRow>(
      `SELECT application_id, opening_id, identity_profile_id, candidate_facet_id, decision,
              selected_destination, tentative_start_date, expected_legal_entity,
              prerequisites_snapshot_json, explainability_json
       FROM greenhouse_hiring.hiring_application
       WHERE application_id = $1
       FOR UPDATE`,
      [safeApplicationId],
    )

    const app = appResult.rows[0]

    if (!app) {
      // Resolver loud: el evento referencia una application inexistente → anomalía de datos.
      const error = new HiringValidationError(
        'La postulación del evento no existe.',
        'hiring_handoff_application_missing',
        422,
      )

      captureWithDomain(error, 'hiring', {
        tags: { source: 'hiring:handoff_materialize' },
        extra: { applicationId: safeApplicationId },
      })
      throw error
    }

    // Audit 2026-07-10: el lock de la application (FOR UPDATE, arriba) serializa este
    // snapshot contra un decide concurrente (que también la lockea) — sin él, el
    // materialize podía leer una decisión vieja y el lock del handoff llegaba tarde (TOCTOU).
    const decision = (app.decision ?? null) as HiringDecision | null
    const existingRow = await lockHandoffByApplicationId(client, safeApplicationId)

    // ── Rama no-selected: no-op si no hay handoff; revocación si lo hay ──
    if (decision !== 'selected') {
      if (!existingRow) {
        return { kind: 'noop', reason: 'decision-not-selected' } satisfies MaterializeHandoffOutcome
      }

      return revokeExistingHandoff(client, existingRow, decision, app)
    }

    // ── Rama selected ──
    const decisionId = resolveLatestDecisionId(app.explainability_json)

    if (!decisionId) {
      // decision='selected' sin decisionHistory: shape roto (anomalía 355) → loud.
      const error = new HiringValidationError(
        'La decisión no tiene historial rastreable (decisionId).',
        'hiring_handoff_decision_id_missing',
        422,
      )

      captureWithDomain(error, 'hiring', {
        tags: { source: 'hiring:handoff_materialize' },
        extra: { applicationId: safeApplicationId },
      })
      throw error
    }

    const destination = (app.selected_destination ?? null) as HiringFulfillmentMode | null

    if (!destination) {
      // assertDestination (355) lo garantiza para selected; si falta, anomalía → loud.
      const error = new HiringValidationError(
        'La decisión selected no declara destino.',
        'hiring_handoff_destination_missing',
        422,
      )

      captureWithDomain(error, 'hiring', {
        tags: { source: 'hiring:handoff_materialize' },
        extra: { applicationId: safeApplicationId, decisionId },
      })
      throw error
    }

    const snapshot = {
      expectedLegalEntity: app.expected_legal_entity,
      tentativeStartDate: toDateOnly(app.tentative_start_date),
      prerequisitesSnapshot: isRecord(app.prerequisites_snapshot_json)
        ? app.prerequisites_snapshot_json
        : {},
    }

    if (!existingRow) {
      const birth = deriveBirthState(destination)

      const inserted = await insertHandoff(client, {
        applicationId: safeApplicationId,
        openingId: app.opening_id,
        decisionId,
        identityProfileId: app.identity_profile_id,
        candidateFacetId: app.candidate_facet_id,
        selectedDestination: destination,
        state: birth.state,
        expectedLegalEntity: snapshot.expectedLegalEntity,
        tentativeStartDate: snapshot.tentativeStartDate,
        prerequisitesSnapshot: snapshot.prerequisitesSnapshot,
        blockedReason: birth.blockedReason,
        blockedDetail: birth.blockedReason ? `destination:${destination}` : null,
      })

      const handoff = normalizeHiringHandoff(inserted)

      await appendHandoffAudit(client, {
        handoffId: handoff.handoffId,
        fromState: null,
        toState: handoff.state,
        decisionId,
        actorUserId: null,
        reasonCode: birth.blockedReason,
        reasonDetail: birth.blockedReason ? `destination:${destination}` : null,
        downstreamRef: null,
        openPrerequisites: snapshot.prerequisitesSnapshot,
      })

      await emitHandoffEvent(client, EVENT_TYPES.hiringHandoffCreated, handoff)

      return (birth.state === 'blocked'
        ? { kind: 'blocked', handoff }
        : { kind: 'created', handoff }) satisfies MaterializeHandoffOutcome
    }

    // Handoff existente: idempotencia por decision_id.
    if (existingRow.decision_id === decisionId) {
      return { kind: 'noop', reason: 'same-decision' } satisfies MaterializeHandoffOutcome
    }

    const currentState = existingRow.state as HiringHandoffState

    // Post-aprobación: NUNCA sobrescribir — bloquear para resolución humana.
    if (isPostApprovalState(currentState)) {
      const supersededDetail = `superseded_by:${decisionId}`

      const updated = await updateHandoffState(client, {
        handoffId: existingRow.hiring_handoff_id,
        state: 'blocked',
        blockedReason: 'decision_superseded_after_approval',
        blockedDetail: supersededDetail,
      })

      const handoff = normalizeHiringHandoff(updated)

      await appendHandoffAudit(client, {
        handoffId: handoff.handoffId,
        fromState: currentState,
        toState: 'blocked',
        decisionId,
        actorUserId: null,
        reasonCode: 'decision_superseded_after_approval',
        reasonDetail: supersededDetail,
        downstreamRef: existingRow.downstream_ref,
        openPrerequisites: {},
      })

      await emitHandoffEvent(client, EVENT_TYPES.hiringHandoffBlocked, handoff, {
        supersededByDecisionId: decisionId,
      })
      await emitHandoffEvent(client, EVENT_TYPES.hiringHandoffDecisionSuperseded, handoff, {
        supersededByDecisionId: decisionId,
      })

      return { kind: 'blocked', handoff } satisfies MaterializeHandoffOutcome
    }

    // Estados pre-aprobación (pending/blocked) y reopen (cancelled): re-derivar con la
    // decisión nueva. Excepción sticky: blocked por supersede/revocación post-aprobación
    // requiere resolución humana — solo se actualiza el snapshot de la decisión.
    const sticky =
      currentState === 'blocked' &&
      (existingRow.blocked_reason === 'decision_superseded_after_approval' ||
        existingRow.blocked_reason === 'decision_revoked')

    const rederived = sticky
      ? {
          state: 'blocked' as const,
          blockedReason: existingRow.blocked_reason as 'decision_superseded_after_approval' | 'decision_revoked',
        }
      : deriveBirthState(destination)

    const updated = await updateHandoffState(client, {
      handoffId: existingRow.hiring_handoff_id,
      state: rederived.state,
      decisionId,
      selectedDestination: destination,
      expectedLegalEntity: snapshot.expectedLegalEntity,
      tentativeStartDate: snapshot.tentativeStartDate,
      prerequisitesSnapshot: snapshot.prerequisitesSnapshot,
      blockedReason: rederived.blockedReason,
      blockedDetail: rederived.blockedReason ? `destination:${destination}` : null,
    })

    const handoff = normalizeHiringHandoff(updated)

    await appendHandoffAudit(client, {
      handoffId: handoff.handoffId,
      fromState: currentState,
      toState: handoff.state,
      decisionId,
      actorUserId: null,
      reasonCode: 'decision_superseded',
      reasonDetail: `previous_decision:${existingRow.decision_id}`,
      downstreamRef: null,
      openPrerequisites: snapshot.prerequisitesSnapshot,
    })

    await emitHandoffEvent(client, EVENT_TYPES.hiringHandoffDecisionSuperseded, handoff, {
      previousDecisionId: existingRow.decision_id,
    })

    return { kind: 'superseded', handoff } satisfies MaterializeHandoffOutcome
  })
}

/** Revocación: la selección fue retirada (rejected/withdrawn/on_hold/backup_selected). */
const revokeExistingHandoff = async (
  client: PoolClient,
  existingRow: HiringHandoffRow,
  decision: HiringDecision | null,
  app: ApplicationSnapshotRow,
): Promise<MaterializeHandoffOutcome> => {
  const currentState = existingRow.state as HiringHandoffState
  const revokedDecisionId = resolveLatestDecisionId(app.explainability_json)

  if (currentState === 'cancelled') {
    return { kind: 'noop', reason: 'already-cancelled' }
  }

  // Bloqueado por supersede/revocación post-aprobación: ya está flaggeado para resolución
  // humana — una revocación adicional no cambia el estado (el humano cancela vía command).
  if (
    currentState === 'blocked' &&
    (existingRow.blocked_reason === 'decision_superseded_after_approval' ||
      existingRow.blocked_reason === 'decision_revoked')
  ) {
    return { kind: 'noop', reason: 'already-blocked-post-approval' }
  }

  if (isPostApprovalState(currentState)) {
    // Post-aprobación: bloquear para resolución humana (nunca cancelar en silencio un
    // handoff que downstream ya pudo haber empezado a ejecutar).
    const updated = await updateHandoffState(client, {
      handoffId: existingRow.hiring_handoff_id,
      state: 'blocked',
      blockedReason: 'decision_revoked',
      blockedDetail: `revoked_by_decision:${decision ?? 'unknown'}`,
    })

    const handoff = normalizeHiringHandoff(updated)

    await appendHandoffAudit(client, {
      handoffId: handoff.handoffId,
      fromState: currentState,
      toState: 'blocked',
      decisionId: revokedDecisionId,
      actorUserId: null,
      reasonCode: 'decision_revoked',
      reasonDetail: `decision:${decision ?? 'unknown'}`,
      downstreamRef: existingRow.downstream_ref,
      openPrerequisites: {},
    })

    await emitHandoffEvent(client, EVENT_TYPES.hiringHandoffBlocked, handoff, {
      revokedByDecision: decision,
    })

    return { kind: 'blocked', handoff }
  }

  // pending / blocked pre-aprobación → cancelar auditado.
  const updated = await updateHandoffState(client, {
    handoffId: existingRow.hiring_handoff_id,
    state: 'cancelled',
    blockedReason: null,
    blockedDetail: null,
  })

  const handoff = normalizeHiringHandoff(updated)

  await appendHandoffAudit(client, {
    handoffId: handoff.handoffId,
    fromState: currentState,
    toState: 'cancelled',
    decisionId: revokedDecisionId,
    actorUserId: null,
    reasonCode: 'decision_revoked',
    reasonDetail: `decision:${decision ?? 'unknown'}`,
    downstreamRef: null,
    openPrerequisites: {},
  })

  await emitHandoffEvent(client, EVENT_TYPES.hiringHandoffCancelled, handoff, {
    revokedByDecision: decision,
  })

  return { kind: 'revoked', handoff }
}
