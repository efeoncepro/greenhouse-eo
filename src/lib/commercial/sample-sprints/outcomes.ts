import 'server-only'

import { query, withTransaction } from '@/lib/db'
import { assertEngagementServiceEligible, buildEligibleServicePredicate } from './eligibility'
import { isUniqueConstraintError, toDateString, toIsoDateKey, toTimestampString, trimRequired } from './shared'

export const ENGAGEMENT_OUTCOME_KINDS = [
  'converted',
  'adjusted',
  'dropped',
  'cancelled_by_client',
  'cancelled_by_provider'
] as const

export type EngagementOutcomeKind = typeof ENGAGEMENT_OUTCOME_KINDS[number]

export interface EngagementOutcome {
  outcomeId: string
  serviceId: string
  outcomeKind: EngagementOutcomeKind
  decisionDate: string
  reportAssetId: string | null
  metrics: Record<string, unknown> | null
  decisionRationale: string
  cancellationReason: string | null
  nextServiceId: string | null
  nextQuotationId: string | null
  decidedBy: string | null
  decidedAt: string
}

export interface RecordOutcomeInput {
  serviceId: string
  outcomeKind: EngagementOutcomeKind
  decisionDate: Date | string
  decisionRationale: string
  decidedBy: string
  reportAssetId?: string | null
  metrics?: Record<string, unknown> | null
  cancellationReason?: string | null
  nextServiceId?: string | null
  nextQuotationId?: string | null
}

interface OutcomeRow extends Record<string, unknown> {
  outcome_id: string
  service_id: string
  outcome_kind: EngagementOutcomeKind
  decision_date: Date | string
  report_asset_id: string | null
  metrics_json: Record<string, unknown> | null
  decision_rationale: string
  cancellation_reason: string | null
  next_service_id: string | null
  next_quotation_id: string | null
  decided_by: string | null
  decided_at: Date | string
}

export class EngagementOutcomeValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngagementOutcomeValidationError'
  }
}

export class EngagementOutcomeConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngagementOutcomeConflictError'
  }
}

const isOutcomeKind = (value: string): value is EngagementOutcomeKind => {
  return (ENGAGEMENT_OUTCOME_KINDS as readonly string[]).includes(value)
}

const isCancellationOutcome = (kind: EngagementOutcomeKind) => {
  return kind === 'cancelled_by_client' || kind === 'cancelled_by_provider'
}

const normalizeOutcome = (row: OutcomeRow): EngagementOutcome => ({
  outcomeId: row.outcome_id,
  serviceId: row.service_id,
  outcomeKind: row.outcome_kind,
  decisionDate: toDateString(row.decision_date) ?? '',
  reportAssetId: row.report_asset_id,
  metrics: row.metrics_json ?? null,
  decisionRationale: row.decision_rationale,
  cancellationReason: row.cancellation_reason,
  nextServiceId: row.next_service_id,
  nextQuotationId: row.next_quotation_id,
  decidedBy: row.decided_by,
  decidedAt: toTimestampString(row.decided_at) ?? ''
})

const assertRecordOutcomeInput = (input: RecordOutcomeInput) => {
  const serviceId = trimRequired(input.serviceId, 'serviceId')
  const decisionRationale = trimRequired(input.decisionRationale, 'decisionRationale')
  const decidedBy = trimRequired(input.decidedBy, 'decidedBy')
  const cancellationReason = input.cancellationReason?.trim() || null
  const nextServiceId = input.nextServiceId?.trim() || null
  const nextQuotationId = input.nextQuotationId?.trim() || null
  const reportAssetId = input.reportAssetId?.trim() || null

  if (!isOutcomeKind(input.outcomeKind)) {
    throw new EngagementOutcomeValidationError('outcomeKind is not supported.')
  }

  if (decisionRationale.length < 10) {
    throw new EngagementOutcomeValidationError('decisionRationale must contain at least 10 characters.')
  }

  if (isCancellationOutcome(input.outcomeKind)) {
    if (!cancellationReason || cancellationReason.length < 10) {
      throw new EngagementOutcomeValidationError('cancellationReason must contain at least 10 characters.')
    }
  } else if (cancellationReason) {
    throw new EngagementOutcomeValidationError('cancellationReason is only valid for cancellation outcomes.')
  }

  if (input.outcomeKind === 'converted' && !nextServiceId && !nextQuotationId) {
    throw new EngagementOutcomeValidationError('converted outcomes require nextServiceId or nextQuotationId.')
  }

  if (nextServiceId === serviceId) {
    throw new EngagementOutcomeValidationError('nextServiceId cannot be the same as serviceId.')
  }

  return {
    serviceId,
    outcomeKind: input.outcomeKind,
    decisionDate: toIsoDateKey(input.decisionDate, 'decisionDate'),
    decisionRationale,
    decidedBy,
    reportAssetId,
    metrics: input.metrics ?? null,
    cancellationReason,
    nextServiceId,
    nextQuotationId
  }
}

export const recordOutcome = async (input: RecordOutcomeInput): Promise<{ outcomeId: string }> => {
  const normalized = assertRecordOutcomeInput(input)

  try {
    return await withTransaction(async client => {
      await assertEngagementServiceEligible(client, normalized.serviceId)

      if (normalized.nextServiceId) {
        await assertEngagementServiceEligible(client, normalized.nextServiceId)
      }

      const result = await client.query<{ outcome_id: string }>(
        `INSERT INTO greenhouse_commercial.engagement_outcomes (
           service_id, outcome_kind, decision_date, report_asset_id, metrics_json,
           decision_rationale, cancellation_reason, next_service_id, next_quotation_id,
           decided_by
         ) VALUES (
           $1, $2, $3::date, $4, $5::jsonb,
           $6, $7, $8, $9, $10
         )
         RETURNING outcome_id`,
        [
          normalized.serviceId,
          normalized.outcomeKind,
          normalized.decisionDate,
          normalized.reportAssetId,
          normalized.metrics == null ? null : JSON.stringify(normalized.metrics),
          normalized.decisionRationale,
          normalized.cancellationReason,
          normalized.nextServiceId,
          normalized.nextQuotationId,
          normalized.decidedBy
        ]
      )

      const outcomeId = result.rows[0]?.outcome_id

      if (!outcomeId) throw new Error('Failed to record engagement outcome.')

      return { outcomeId }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new EngagementOutcomeConflictError(`Service ${normalized.serviceId} already has a terminal outcome.`)
    }

    throw error
  }
}

export const getOutcomeForService = async (serviceId: string): Promise<EngagementOutcome | null> => {
  const normalizedServiceId = trimRequired(serviceId, 'serviceId')

  const rows = await query<OutcomeRow>(
    `SELECT o.*
     FROM greenhouse_commercial.engagement_outcomes o
     JOIN greenhouse_core.services s ON s.service_id = o.service_id
     WHERE o.service_id = $1
       AND ${buildEligibleServicePredicate('s')}
     LIMIT 1`,
    [normalizedServiceId]
  )

  return rows[0] ? normalizeOutcome(rows[0]) : null
}
