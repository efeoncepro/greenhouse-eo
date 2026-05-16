import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  CONTRACT_DERIVATIONS,
  normalizeLegalReviewReference,
  type ContractType,
  type PayRegime,
  type PayrollVia
} from '@/types/hr-contracts'

export type MemberContractTypeAuditSource = 'payroll_compensation' | 'workforce_intake'

export interface MemberContractFacts {
  contractType: ContractType | string | null
  payRegime: PayRegime | string | null
  payrollVia: PayrollVia | string | null
  deelContractId: string | null
}

interface RecordMemberContractTypeChangeInput {
  client: PoolClient
  memberId: string
  actorUserId: string
  actorEmail?: string | null
  source: MemberContractTypeAuditSource
  reason?: string | null
  legalReviewReference?: string | null
  previous: MemberContractFacts
  next: Required<MemberContractFacts>
  metadata?: Record<string, unknown>
}

const changed = (previous: MemberContractFacts, next: Required<MemberContractFacts>) =>
  previous.contractType !== next.contractType ||
  previous.payRegime !== next.payRegime ||
  previous.payrollVia !== next.payrollVia ||
  (previous.deelContractId ?? null) !== (next.deelContractId ?? null)

const assertNextFacts = (next: Required<MemberContractFacts>) => {
  if (
    next.contractType !== 'indefinido' &&
    next.contractType !== 'plazo_fijo' &&
    next.contractType !== 'honorarios' &&
    next.contractType !== 'contractor' &&
    next.contractType !== 'eor' &&
    next.contractType !== 'international_internal'
  ) {
    throw new Error(`Unsupported contractType for audit: ${next.contractType}`)
  }

  const derivation = CONTRACT_DERIVATIONS[next.contractType]

  if (next.payRegime !== derivation.payRegime || next.payrollVia !== derivation.payrollVia) {
    throw new Error('Contract facts do not match canonical derivation.')
  }
}

export const recordMemberContractTypeChange = async ({
  client,
  memberId,
  actorUserId,
  actorEmail,
  source,
  reason,
  legalReviewReference,
  previous,
  next,
  metadata
}: RecordMemberContractTypeChangeInput) => {
  assertNextFacts(next)

  if (!changed(previous, next)) {
    return null
  }

  const normalizedLegalReviewReference = normalizeLegalReviewReference(legalReviewReference)
  const auditId = `member-contract-type-audit-${randomUUID()}`
  const changedAt = new Date().toISOString()

  await client.query(
    `
      INSERT INTO greenhouse_core.member_contract_type_audit_log (
        audit_id,
        member_id,
        actor_user_id,
        actor_email,
        source,
        reason,
        legal_review_reference,
        previous_contract_type,
        previous_pay_regime,
        previous_payroll_via,
        previous_deel_contract_id,
        new_contract_type,
        new_pay_regime,
        new_payroll_via,
        new_deel_contract_id,
        effective_at,
        metadata_json
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16::timestamptz, $17::jsonb
      )
    `,
    [
      auditId,
      memberId,
      actorUserId,
      actorEmail ?? null,
      source,
      reason ?? null,
      normalizedLegalReviewReference,
      previous.contractType,
      previous.payRegime,
      previous.payrollVia,
      previous.deelContractId,
      next.contractType,
      next.payRegime,
      next.payrollVia,
      next.deelContractId,
      changedAt,
      JSON.stringify(metadata ?? {})
    ]
  )

  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.member,
      aggregateId: memberId,
      eventType: EVENT_TYPES.memberContractTypeChanged,
      payload: {
        schemaVersion: 1,
        memberId,
        auditId,
        source,
        actorUserId,
        previous: {
          contractType: previous.contractType,
          payRegime: previous.payRegime,
          payrollVia: previous.payrollVia,
          hasDeelContractId: Boolean(previous.deelContractId)
        },
        next: {
          contractType: next.contractType,
          payRegime: next.payRegime,
          payrollVia: next.payrollVia,
          hasDeelContractId: Boolean(next.deelContractId)
        },
        hasLegalReviewReference: Boolean(normalizedLegalReviewReference),
        changedAt
      }
    },
    client
  )

  return auditId
}
