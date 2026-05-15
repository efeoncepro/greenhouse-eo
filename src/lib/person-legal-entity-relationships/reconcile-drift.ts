import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import {
  createContractorLegalEntityRelationship,
  endPersonLegalEntityRelationship
} from './store'

import type {
  ContractorRelationshipSubtype,
  PersonLegalEntityRelationship
} from './types'

/**
 * TASK-891 Slice 2 — Canonical helper for reconciling Person 360 relationship drift.
 *
 * Composes the existing primitives from `store.ts` (`endPersonLegalEntityRelationship` +
 * `createContractorLegalEntityRelationship`) wrapped in `withGreenhousePostgresTransaction`
 * to perform an ATOMIC supersede operation:
 *
 *   1. Close the active `employee` relationship (UPDATE `effective_to + status='ended'`)
 *   2. Open a new `contractor` relationship with metadata correlation
 *   3. Emit outbox events `.deactivated` + `.created` in the same transaction
 *
 * If any step fails, the entire transaction rolls back — no inconsistent Person 360 state.
 *
 * **REUSE > CREATE**: this helper does NOT write SQL inline. It composes the canonical
 * primitives that already publish their own outbox events. Correlation between the two
 * events vives in `metadata_json.reconciliationContext` on the new row.
 *
 * Spec: `docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md`.
 */

export const MIN_RECONCILIATION_REASON_CHARS = 20

const VALID_CONTRACTOR_SUBTYPES: readonly ContractorRelationshipSubtype[] = ['contractor', 'honorarios']

/**
 * Canonical error codes (es-CL safe to expose at API boundary).
 */
export type ReconciliationErrorCode =
  | 'reason_too_short'
  | 'member_not_found'
  | 'member_inactive'
  | 'member_missing_identity_profile'
  | 'no_active_employee_relationship'
  | 'multiple_active_employee_relationships'
  | 'invalid_contractor_subtype'
  | 'invalid_external_close_date'

export class PersonRelationshipReconciliationError extends Error {
  readonly code: ReconciliationErrorCode
  readonly statusCode: number
  readonly evidence?: Record<string, unknown>

  constructor(code: ReconciliationErrorCode, message: string, statusCode = 400, evidence?: Record<string, unknown>) {
    super(message)
    this.name = 'PersonRelationshipReconciliationError'
    this.code = code
    this.statusCode = statusCode
    this.evidence = evidence
  }
}

export type ReconcileMemberContractDriftInput = {
  memberId: string
  contractorSubtype: ContractorRelationshipSubtype
  reason: string
  actorUserId: string
  /**
   * Optional ISO YYYY-MM-DD date for legal close (e.g. external provider issued
   * termination on this date). When omitted, NOW() is used as effectiveTo.
   * Must be `effective_from <= externalCloseDate <= NOW()`.
   */
  externalCloseDate?: string | null
}

export type ReconcileMemberContractDriftResult = {
  closedRelationshipId: string
  openedRelationshipId: string
  beforeSnapshot: PersonLegalEntityRelationship
  afterSnapshot: PersonLegalEntityRelationship
}

type MemberRow = {
  member_id: string
  active: boolean
  identity_profile_id: string | null
}

type ActiveEmployeeRelationshipRow = {
  relationship_id: string
  profile_id: string
  legal_entity_organization_id: string
  space_id: string | null
  effective_from: string | Date
}

const today = () => new Date().toISOString().slice(0, 10)

const assertReason = (reason: string): string => {
  const trimmed = reason.trim()

  if (trimmed.length < MIN_RECONCILIATION_REASON_CHARS) {
    throw new PersonRelationshipReconciliationError(
      'reason_too_short',
      `El motivo de reconciliación debe tener al menos ${MIN_RECONCILIATION_REASON_CHARS} caracteres.`,
      400,
      { reasonLength: trimmed.length }
    )
  }

  return trimmed
}

const assertContractorSubtype = (subtype: ContractorRelationshipSubtype): ContractorRelationshipSubtype => {
  if (!VALID_CONTRACTOR_SUBTYPES.includes(subtype)) {
    throw new PersonRelationshipReconciliationError(
      'invalid_contractor_subtype',
      `El subtipo de contractor debe ser uno de: ${VALID_CONTRACTOR_SUBTYPES.join(', ')}.`,
      400,
      { received: subtype }
    )
  }

  return subtype
}

const assertExternalCloseDate = (value: string | null | undefined, effectiveFrom: string): string => {
  if (!value) return today()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new PersonRelationshipReconciliationError(
      'invalid_external_close_date',
      'La fecha de cierre externa debe tener formato YYYY-MM-DD.',
      400,
      { received: value }
    )
  }

  const todayStr = today()

  if (value > todayStr) {
    throw new PersonRelationshipReconciliationError(
      'invalid_external_close_date',
      'La fecha de cierre externa no puede ser futura.',
      400,
      { received: value, today: todayStr }
    )
  }

  if (value < effectiveFrom) {
    throw new PersonRelationshipReconciliationError(
      'invalid_external_close_date',
      'La fecha de cierre externa no puede ser anterior al inicio de la relación legal.',
      400,
      { received: value, effectiveFrom }
    )
  }

  return value
}

/**
 * Fetches the member runtime row (active flag + identity_profile_id bridge).
 */
const fetchMemberRow = async (client: PoolClient, memberId: string): Promise<MemberRow | null> => {
  const result = await client.query<MemberRow>(
    `
      SELECT member_id, active, identity_profile_id
      FROM greenhouse_core.members
      WHERE member_id = $1
      LIMIT 1
    `,
    [memberId]
  )

  return result.rows[0] ?? null
}

/**
 * Locks the active `employee` relationships for a profile (SELECT FOR UPDATE)
 * so concurrent reconcile attempts serialize. Returns 0, 1, or N rows — caller
 * validates that there's exactly 1.
 */
const fetchActiveEmployeeRelationships = async (
  client: PoolClient,
  profileId: string
): Promise<ActiveEmployeeRelationshipRow[]> => {
  const result = await client.query<ActiveEmployeeRelationshipRow>(
    `
      SELECT
        relationship_id,
        profile_id,
        legal_entity_organization_id,
        space_id,
        effective_from
      FROM greenhouse_core.person_legal_entity_relationships
      WHERE profile_id = $1
        AND relationship_type = 'employee'
        AND status = 'active'
        AND effective_to IS NULL
      FOR UPDATE
    `,
    [profileId]
  )

  return result.rows
}

/**
 * Reconciles the Person 360 drift by superseding the active employee relationship
 * with a new contractor relationship.
 *
 * Atomicity: the entire operation runs in a single PG transaction. Any failure
 * (validation, DB error, outbox publish) rolls back both UPDATE and INSERT.
 *
 * Correlation forensic: the new relationship's `metadata_json` includes a
 * `reconciliationContext` object with `supersededRelationshipId + reason +
 * actorUserId + reconciledAt + externalCloseDate`. The legacy row's `notes`
 * receives a human-readable marker.
 *
 * Idempotency: if invoked twice on the same member, the second call FAILS
 * with `no_active_employee_relationship` (the first call already closed the
 * active relationship). Operators who hit this safely.
 */
export const reconcileMemberContractDrift = async (
  input: ReconcileMemberContractDriftInput
): Promise<ReconcileMemberContractDriftResult> => {
  // Stateless pre-validation (no DB roundtrip needed).
  const reason = assertReason(input.reason)
  const contractorSubtype = assertContractorSubtype(input.contractorSubtype)

  try {
    return await withGreenhousePostgresTransaction(async client => {
      // 1. Resolve member runtime.
      const member = await fetchMemberRow(client, input.memberId)

      if (!member) {
        throw new PersonRelationshipReconciliationError(
          'member_not_found',
          'El colaborador no existe en el directorio.',
          404,
          { memberId: input.memberId }
        )
      }

      if (!member.active) {
        throw new PersonRelationshipReconciliationError(
          'member_inactive',
          'El colaborador no está activo. La reconciliación solo opera sobre colaboradores activos.',
          409,
          { memberId: input.memberId }
        )
      }

      if (!member.identity_profile_id) {
        throw new PersonRelationshipReconciliationError(
          'member_missing_identity_profile',
          'El colaborador no tiene perfil de identidad enlazado. Completa la ficha laboral primero.',
          409,
          { memberId: input.memberId }
        )
      }

      // 2. Lock and validate the active employee relationship(s).
      const activeRelationships = await fetchActiveEmployeeRelationships(client, member.identity_profile_id)

      if (activeRelationships.length === 0) {
        throw new PersonRelationshipReconciliationError(
          'no_active_employee_relationship',
          'No hay relación laboral activa de tipo "employee" para este colaborador. No hay nada que reconciliar.',
          409,
          { profileId: member.identity_profile_id }
        )
      }

      if (activeRelationships.length > 1) {
        throw new PersonRelationshipReconciliationError(
          'multiple_active_employee_relationships',
          'El colaborador tiene múltiples relaciones laborales activas como "employee". Reconciliar manualmente con HR antes de continuar.',
          409,
          {
            profileId: member.identity_profile_id,
            count: activeRelationships.length,
            relationshipIds: activeRelationships.map(r => r.relationship_id)
          }
        )
      }

      const legacy = activeRelationships[0]

      const legacyEffectiveFrom =
        typeof legacy.effective_from === 'string'
          ? legacy.effective_from.slice(0, 10)
          : legacy.effective_from.toISOString().slice(0, 10)

      // 3. Resolve cutoff date for legacy close.
      const closeDate = assertExternalCloseDate(input.externalCloseDate, legacyEffectiveFrom)
      const reconciledAt = new Date().toISOString()

      // 4. Close legacy relationship (reuses canonical helper — emits .deactivated event).
      const beforeSnapshot = await endPersonLegalEntityRelationship(client, {
        relationshipId: legacy.relationship_id,
        effectiveTo: closeDate,
        notes: `[TASK-891 reconciled by actor=${input.actorUserId} on ${closeDate} — superseded by new contractor relationship] ${reason}`,
        metadataPatch: {
          reconciliationContext: {
            commandId: 'reconcile-member-contract-drift',
            reason,
            actorUserId: input.actorUserId,
            reconciledAt,
            externalCloseDate: input.externalCloseDate ?? null,
            contractorSubtype
          }
        },
        actorUserId: input.actorUserId
      })

      // 5. Open new contractor relationship (reuses canonical helper — emits .created event).
      // Note: spaceId is inherited from the legacy relationship. legalEntityOrganizationId
      // stays the same (same employer). The new relationship is at the same legal entity
      // but with a different contractual nature.
      const afterSnapshot = await createContractorLegalEntityRelationship(client, {
        profileId: member.identity_profile_id,
        legalEntityOrganizationId: legacy.legal_entity_organization_id,
        spaceId: legacy.space_id,
        subtype: contractorSubtype,
        effectiveFrom: closeDate,
        sourceOfTruth: 'operator_reconciliation',
        sourceRecordType: 'person_legal_entity_relationship',
        sourceRecordId: legacy.relationship_id,
        roleLabel: null,
        notes: `Reconciled from employee via TASK-891 (actor=${input.actorUserId}, ${closeDate}) — reason: ${reason}`,
        metadata: {
          reconciliationContext: {
            commandId: 'reconcile-member-contract-drift',
            supersededRelationshipId: legacy.relationship_id,
            supersededRelationshipType: 'employee',
            reason,
            actorUserId: input.actorUserId,
            reconciledAt,
            externalCloseDate: input.externalCloseDate ?? null,
            contractorSubtype
          }
        },
        actorUserId: input.actorUserId
      })

      return {
        closedRelationshipId: beforeSnapshot.relationshipId,
        openedRelationshipId: afterSnapshot.relationshipId,
        beforeSnapshot,
        afterSnapshot
      }
    })
  } catch (error) {
    // Re-throw canonical errors as-is so the route handler can map them.
    if (error instanceof PersonRelationshipReconciliationError) {
      throw error
    }

    // Unknown failure → capture + re-throw generic error. Sanitization happens at
    // the API boundary; here we preserve the stack for Sentry forensic.
    captureWithDomain(error, 'identity', {
      tags: { source: 'person_relationship_reconcile_drift' },
      extra: {
        memberId: input.memberId,
        actorUserId: input.actorUserId
      }
    })

    throw error
  }
}
