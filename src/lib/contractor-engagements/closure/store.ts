import 'server-only'

import type { PoolClient } from 'pg'

import { query, withGreenhousePostgresTransaction } from '@/lib/db'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import { isClassificationRiskBlocking } from '../classification-risk'
import { ContractorEngagementValidationError } from '../errors'
import { assertValidEngagementTransition } from '../state-machine'
import {
  CONTRACTOR_ENGAGEMENT_SELECT_COLUMNS,
  appendEngagementEvent,
  getContractorEngagementById,
  mapContractorEngagement,
  publishEngagementEvent
} from '../store'
import type { ContractorEngagement } from '../types'
import { evaluateContractorClosureReadiness } from './readiness'
import type {
  ContractorClosureReadinessResult,
  ExecuteContractorClosureInput,
  InitiateContractorClosureInput
} from './types'

/** Engagements whose ledger is operated by an external provider/EOR. */
const PROVIDER_OWNED_PAYROLL_VIA = new Set(['deel', 'remote', 'oyster'])

const MIN_REASON_LENGTH = 10

// The store mapper expects an indexed row; reuse the canonical SELECT + mapper.
type EngagementRow = Parameters<typeof mapContractorEngagement>[0]

const isProviderOwned = (engagement: ContractorEngagement): boolean =>
  PROVIDER_OWNED_PAYROLL_VIA.has(engagement.payrollVia)

/**
 * Counts NON-terminal work submissions + payables for an engagement. Defines the
 * "open items" surfaced by closure readiness. Runs against the provided client
 * (tx-consistent) or the shared pool reader.
 */
const countOpenItems = async (
  contractorEngagementId: string,
  client?: PoolClient
): Promise<{ openWorkSubmissionsCount: number; openPayablesCount: number }> => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM greenhouse_hr.contractor_work_submissions
        WHERE contractor_engagement_id = $1
          AND status NOT IN ('rejected', 'cancelled'))::int AS open_submissions,
      (SELECT COUNT(*) FROM greenhouse_hr.contractor_payables
        WHERE contractor_engagement_id = $1
          AND status NOT IN ('paid', 'cancelled'))::int AS open_payables
  `

  if (client) {
    const result = await client.query<{ open_submissions: number; open_payables: number }>(sql, [
      contractorEngagementId
    ])

    return {
      openWorkSubmissionsCount: Number(result.rows[0]?.open_submissions ?? 0),
      openPayablesCount: Number(result.rows[0]?.open_payables ?? 0)
    }
  }

  const rows = await query<{ open_submissions: number; open_payables: number }>(sql, [
    contractorEngagementId
  ])

  return {
    openWorkSubmissionsCount: Number(rows[0]?.open_submissions ?? 0),
    openPayablesCount: Number(rows[0]?.open_payables ?? 0)
  }
}

export interface AssessContractorClosureReadinessOptions {
  acknowledgedBlockerCodes?: ExecuteContractorClosureInput['acknowledgedBlockerCodes']
  /** Provider termination ref aportado en el comando (override del persistido). */
  providerTerminationRefOverride?: string | null
}

export interface ContractorClosureReadinessAssessment {
  engagement: ContractorEngagement
  readiness: ContractorClosureReadinessResult
}

/**
 * Resolves the live closure-readiness inputs (open submissions/payables + the
 * engagement flags) and evaluates them via the pure helper. Read-only — used by
 * the closure surface + by `executeContractorClosure` before gating.
 */
export const assessContractorClosureReadiness = async (
  contractorEngagementId: string,
  options: AssessContractorClosureReadinessOptions = {}
): Promise<ContractorClosureReadinessAssessment> => {
  const engagement = await getContractorEngagementById(contractorEngagementId)

  if (!engagement) {
    throw new ContractorEngagementValidationError(
      'El engagement no existe.',
      'engagement_not_found',
      404
    )
  }

  const { openWorkSubmissionsCount, openPayablesCount } = await countOpenItems(
    contractorEngagementId
  )

  const providerTerminationRefPresent = Boolean(
    options.providerTerminationRefOverride ?? engagement.providerTerminationRef
  )

  const readiness = evaluateContractorClosureReadiness({
    openWorkSubmissionsCount,
    openPayablesCount,
    providerOwned: isProviderOwned(engagement),
    providerTerminationRefPresent,
    classificationRiskBlocking: isClassificationRiskBlocking(engagement.classificationRiskStatus),
    hasPortalMember: Boolean(engagement.memberId),
    acknowledgedBlockerCodes: options.acknowledgedBlockerCodes
  })

  return { engagement, readiness }
}

const lockEngagement = async (
  client: PoolClient,
  contractorEngagementId: string
): Promise<ContractorEngagement> => {
  const result = await client.query<EngagementRow>(
    `SELECT ${CONTRACTOR_ENGAGEMENT_SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_engagements
     WHERE contractor_engagement_id = $1
     FOR UPDATE`,
    [contractorEngagementId]
  )

  const row = result.rows[0]

  if (!row) {
    throw new ContractorEngagementValidationError(
      'El engagement no existe.',
      'engagement_not_found',
      404
    )
  }

  return mapContractorEngagement(row)
}

const assertReason = (reason: string): string => {
  const trimmed = (reason ?? '').trim()

  if (trimmed.length < MIN_REASON_LENGTH) {
    throw new ContractorEngagementValidationError(
      `La razón del cierre es obligatoria (mínimo ${MIN_REASON_LENGTH} caracteres).`,
      'closure_reason_required',
      400
    )
  }

  return trimmed
}

/**
 * Inicia el cierre contractual: transición active/paused -> ending (winding-down).
 * En `ending` ya no se aceptan nuevas work submissions (guard TASK-797 Slice 3),
 * pero los payables/submissions ya aprobados pueden liquidarse. Idempotente si el
 * engagement ya está en `ending`.
 *
 * NUNCA finiquito (boundary TASK-890): no toca `final_settlements` ni las lanes de
 * `work_relationship_offboarding_cases`.
 */
export const initiateContractorClosure = async (
  input: InitiateContractorClosureInput
): Promise<ContractorEngagement> =>
  withGreenhousePostgresTransaction(async (client) => {
    const reason = assertReason(input.reason)
    const current = await lockEngagement(client, input.contractorEngagementId)

    if (current.status === 'ending') {
      return current
    }

    if (current.status === 'ended' || current.status === 'cancelled') {
      throw new ContractorEngagementValidationError(
        'El engagement ya está en un estado terminal; no se puede iniciar el cierre.',
        'engagement_terminal_cannot_initiate_closure',
        409
      )
    }

    assertValidEngagementTransition(current.status, 'ending')

    const result = await client.query<EngagementRow>(
      `UPDATE greenhouse_hr.contractor_engagements
       SET status = 'ending',
           closure_reason = $2,
           closure_effective_date = $3::date,
           provider_termination_ref = COALESCE($4, provider_termination_ref),
           closure_initiated_at = NOW(),
           closure_initiated_by = $5,
           end_date = COALESCE(end_date, $3::date)
       WHERE contractor_engagement_id = $1
       RETURNING ${CONTRACTOR_ENGAGEMENT_SELECT_COLUMNS}`,
      [
        input.contractorEngagementId,
        input.closureReason,
        input.closureEffectiveDate,
        input.providerTerminationRef ?? null,
        input.actorUserId
      ]
    )

    const updated = mapContractorEngagement(result.rows[0])

    await appendEngagementEvent(client, {
      contractorEngagementId: updated.contractorEngagementId,
      eventType: 'status_changed',
      fromStatus: current.status,
      toStatus: updated.status,
      actorUserId: input.actorUserId,
      reason,
      metadata: {
        lifecycle: 'closure_initiated',
        closureReason: input.closureReason,
        closureEffectiveDate: input.closureEffectiveDate
      }
    })

    await publishEngagementEvent(
      client,
      updated,
      EVENT_TYPES.contractorEngagementClosureInitiated,
      {
        fromStatus: current.status,
        closureReason: updated.closureReason,
        closureEffectiveDate: updated.closureEffectiveDate
      }
    )

    return updated
  })

/**
 * Ejecuta el cierre contractual final: lleva el engagement a `ended`, gateado por
 * la readiness (no quedan blockers SIN reconocer). Si el engagement aún está
 * active/paused, hace la transición a `ending` primero en la misma tx.
 *
 * NUNCA finiquito (boundary TASK-890).
 */
export const executeContractorClosure = async (
  input: ExecuteContractorClosureInput
): Promise<{ engagement: ContractorEngagement; readiness: ContractorClosureReadinessResult }> =>
  withGreenhousePostgresTransaction(async (client) => {
    const reason = assertReason(input.reason)
    const current = await lockEngagement(client, input.contractorEngagementId)

    // Idempotent: ya cerrado.
    if (current.status === 'ended') {
      const { openWorkSubmissionsCount, openPayablesCount } = await countOpenItems(
        input.contractorEngagementId,
        client
      )

      const readiness = evaluateContractorClosureReadiness({
        openWorkSubmissionsCount,
        openPayablesCount,
        providerOwned: isProviderOwned(current),
        providerTerminationRefPresent: Boolean(current.providerTerminationRef),
        classificationRiskBlocking: isClassificationRiskBlocking(current.classificationRiskStatus),
        hasPortalMember: Boolean(current.memberId),
        acknowledgedBlockerCodes: input.acknowledgedBlockerCodes
      })

      return { engagement: current, readiness }
    }

    if (current.status === 'cancelled') {
      throw new ContractorEngagementValidationError(
        'El engagement está cancelado; no se puede ejecutar el cierre.',
        'engagement_cancelled_cannot_close',
        409
      )
    }

    const closureReason = input.closureReason ?? current.closureReason

    if (!closureReason) {
      throw new ContractorEngagementValidationError(
        'Falta la causal de cierre (closureReason).',
        'closure_reason_code_required',
        400
      )
    }

    const closureEffectiveDate = input.closureEffectiveDate ?? current.closureEffectiveDate

    if (!closureEffectiveDate) {
      throw new ContractorEngagementValidationError(
        'Falta la fecha efectiva del cierre (closureEffectiveDate).',
        'closure_effective_date_required',
        400
      )
    }

    const providerTerminationRef = input.providerTerminationRef ?? current.providerTerminationRef

    // ── Readiness gate (fail-closed: blockers sin reconocer impiden cerrar) ──
    const { openWorkSubmissionsCount, openPayablesCount } = await countOpenItems(
      input.contractorEngagementId,
      client
    )

    const readiness = evaluateContractorClosureReadiness({
      openWorkSubmissionsCount,
      openPayablesCount,
      providerOwned: isProviderOwned(current),
      providerTerminationRefPresent: Boolean(providerTerminationRef),
      classificationRiskBlocking: isClassificationRiskBlocking(current.classificationRiskStatus),
      hasPortalMember: Boolean(current.memberId),
      acknowledgedBlockerCodes: input.acknowledgedBlockerCodes
    })

    if (!readiness.ready) {
      throw new ContractorEngagementValidationError(
        'No se puede cerrar el engagement: hay ítems abiertos sin reconocer.',
        'closure_blocked_open_items',
        409,
        { blockers: readiness.blockers.filter((b) => !b.acknowledged) }
      )
    }

    // Step A: active|paused -> ending (winding-down) si aún no estaba en ending.
    if (current.status === 'active' || current.status === 'paused') {
      assertValidEngagementTransition(current.status, 'ending')

      await client.query(
        `UPDATE greenhouse_hr.contractor_engagements
         SET status = 'ending',
             closure_reason = $2,
             closure_effective_date = $3::date,
             provider_termination_ref = $4,
             closure_initiated_at = COALESCE(closure_initiated_at, NOW()),
             closure_initiated_by = COALESCE(closure_initiated_by, $5),
             end_date = COALESCE(end_date, $3::date)
         WHERE contractor_engagement_id = $1`,
        [
          input.contractorEngagementId,
          closureReason,
          closureEffectiveDate,
          providerTerminationRef ?? null,
          input.actorUserId
        ]
      )

      await appendEngagementEvent(client, {
        contractorEngagementId: current.contractorEngagementId,
        eventType: 'status_changed',
        fromStatus: current.status,
        toStatus: 'ending',
        actorUserId: input.actorUserId,
        reason,
        metadata: { lifecycle: 'closure_initiated', closureReason }
      })
    }

    // Step B: ending -> ended (cierre final, gateado).
    assertValidEngagementTransition('ending', 'ended')

    const result = await client.query<EngagementRow>(
      `UPDATE greenhouse_hr.contractor_engagements
       SET status = 'ended',
           closure_reason = $2,
           closure_effective_date = $3::date,
           provider_termination_ref = $4,
           closure_executed_at = NOW(),
           closure_executed_by = $5,
           post_closure_invoices_allowed = $6,
           end_date = COALESCE(end_date, $3::date)
       WHERE contractor_engagement_id = $1
       RETURNING ${CONTRACTOR_ENGAGEMENT_SELECT_COLUMNS}`,
      [
        input.contractorEngagementId,
        closureReason,
        closureEffectiveDate,
        providerTerminationRef ?? null,
        input.actorUserId,
        input.postClosureInvoicesAllowed ?? false
      ]
    )

    const updated = mapContractorEngagement(result.rows[0])

    await appendEngagementEvent(client, {
      contractorEngagementId: updated.contractorEngagementId,
      eventType: 'status_changed',
      fromStatus: 'ending',
      toStatus: 'ended',
      actorUserId: input.actorUserId,
      reason,
      metadata: {
        lifecycle: 'closure_executed',
        closureReason,
        closureEffectiveDate,
        postClosureInvoicesAllowed: updated.postClosureInvoicesAllowed,
        acknowledgedBlockerCodes: input.acknowledgedBlockerCodes ?? []
      }
    })

    await publishEngagementEvent(client, updated, EVENT_TYPES.contractorEngagementEnded, {
      fromStatus: current.status,
      lifecycle: 'closure_executed',
      closureReason: updated.closureReason,
      closureEffectiveDate: updated.closureEffectiveDate,
      providerTerminationRef: updated.providerTerminationRef,
      postClosureInvoicesAllowed: updated.postClosureInvoicesAllowed
    })

    return { engagement: updated, readiness }
  })

export interface AllowPostClosureInvoicesInput {
  contractorEngagementId: string
  allowed: boolean
  reason: string
  actorUserId: string
}

/**
 * Política explícita de invoices post-cierre: habilita/deshabilita la creación de
 * payables después de `ended`. Solo aplica a engagements ya `ended` (auditado).
 */
export const setPostClosureInvoicesAllowed = async (
  input: AllowPostClosureInvoicesInput
): Promise<ContractorEngagement> =>
  withGreenhousePostgresTransaction(async (client) => {
    const reason = assertReason(input.reason)
    const current = await lockEngagement(client, input.contractorEngagementId)

    if (current.status !== 'ended') {
      throw new ContractorEngagementValidationError(
        'La política de invoices post-cierre solo aplica a engagements cerrados (ended).',
        'engagement_not_ended_for_post_closure_policy',
        409
      )
    }

    if (current.postClosureInvoicesAllowed === input.allowed) {
      return current
    }

    const result = await client.query<EngagementRow>(
      `UPDATE greenhouse_hr.contractor_engagements
       SET post_closure_invoices_allowed = $2
       WHERE contractor_engagement_id = $1
       RETURNING ${CONTRACTOR_ENGAGEMENT_SELECT_COLUMNS}`,
      [input.contractorEngagementId, input.allowed]
    )

    const updated = mapContractorEngagement(result.rows[0])

    await appendEngagementEvent(client, {
      contractorEngagementId: updated.contractorEngagementId,
      eventType: 'updated',
      actorUserId: input.actorUserId,
      reason,
      metadata: {
        lifecycle: 'post_closure_invoices_policy_changed',
        postClosureInvoicesAllowed: updated.postClosureInvoicesAllowed
      }
    })

    return updated
  })
