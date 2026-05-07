import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { attachAssetToAggregate } from '@/lib/storage/greenhouse-assets'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import { recordEngagementAuditEvent } from './audit-log'
import { assertEngagementServiceEligible } from './eligibility'
import { publishEngagementEvent } from './engagement-events'
import { toIsoDateKey, trimRequired } from './shared'
import type { EngagementCommercialTermsKind } from './commercial-terms'

export interface ConvertEngagementCommercialTermsInput {
  kind: EngagementCommercialTermsKind
  effectiveFrom: Date | string
  monthlyAmountClp?: number | null
  successCriteria?: Record<string, unknown> | null
  reason: string
}

export interface ConvertEngagementInput {
  serviceId: string
  decisionDate: Date | string
  decisionRationale: string
  decidedBy: string
  nextServiceId?: string | null
  nextQuotationId?: string | null
  reportAssetId?: string | null
  metrics?: Record<string, unknown> | null
  transitionReason?: string | null
  commercialTerms?: ConvertEngagementCommercialTermsInput | null
}

export interface ConvertEngagementResult {
  outcomeId: string
  lineageId: string | null
  termsId: string | null
}

export class EngagementConversionValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngagementConversionValidationError'
  }
}

interface ConversionServiceScopeRow extends Record<string, unknown> {
  space_id: string | null
  client_id: string | null
}

const normalizeConversionInput = (input: ConvertEngagementInput) => {
  const serviceId = trimRequired(input.serviceId, 'serviceId')
  const decidedBy = trimRequired(input.decidedBy, 'decidedBy')
  const decisionRationale = trimRequired(input.decisionRationale, 'decisionRationale')
  const nextServiceId = input.nextServiceId?.trim() || null
  const nextQuotationId = input.nextQuotationId?.trim() || null
  const reportAssetId = input.reportAssetId?.trim() || null
  const transitionReason = input.transitionReason?.trim() || decisionRationale

  if (decisionRationale.length < 10) {
    throw new EngagementConversionValidationError('decisionRationale must contain at least 10 characters.')
  }

  if (!nextServiceId && !nextQuotationId) {
    throw new EngagementConversionValidationError('conversion requires nextServiceId or nextQuotationId.')
  }

  if (nextServiceId === serviceId) {
    throw new EngagementConversionValidationError('nextServiceId cannot be the same as serviceId.')
  }

  const commercialTerms = input.commercialTerms

  if (commercialTerms) {
    if (!nextServiceId) {
      throw new EngagementConversionValidationError('commercialTerms require nextServiceId.')
    }

    if (commercialTerms.reason.trim().length < 10) {
      throw new EngagementConversionValidationError('commercialTerms.reason must contain at least 10 characters.')
    }
  }

  return {
    serviceId,
    decisionDate: toIsoDateKey(input.decisionDate, 'decisionDate'),
    decisionRationale,
    decidedBy,
    nextServiceId,
    nextQuotationId,
    reportAssetId,
    metrics: input.metrics ?? null,
    transitionReason,
    commercialTerms: commercialTerms
      ? {
          ...commercialTerms,
          effectiveFrom: toIsoDateKey(commercialTerms.effectiveFrom, 'commercialTerms.effectiveFrom'),
          reason: commercialTerms.reason.trim(),
          monthlyAmountClp: commercialTerms.monthlyAmountClp ?? null,
          successCriteria: commercialTerms.successCriteria ?? null
        }
      : null
  }
}

const insertCommercialTerms = async (
  client: PoolClient,
  input: ReturnType<typeof normalizeConversionInput>
): Promise<string | null> => {
  if (!input.commercialTerms || !input.nextServiceId) return null

  await client.query(
    `UPDATE greenhouse_commercial.engagement_commercial_terms
     SET effective_to = $2::date
     WHERE service_id = $1
       AND effective_to IS NULL`,
    [input.nextServiceId, input.commercialTerms.effectiveFrom]
  )

  const result = await client.query<{ terms_id: string }>(
    `INSERT INTO greenhouse_commercial.engagement_commercial_terms (
       service_id, terms_kind, effective_from, monthly_amount_clp,
       success_criteria, declared_by, reason
     ) VALUES (
       $1, $2, $3::date, $4, $5::jsonb, $6, $7
     )
     RETURNING terms_id`,
    [
      input.nextServiceId,
      input.commercialTerms.kind,
      input.commercialTerms.effectiveFrom,
      input.commercialTerms.monthlyAmountClp,
      input.commercialTerms.successCriteria == null ? null : JSON.stringify(input.commercialTerms.successCriteria),
      input.decidedBy,
      input.commercialTerms.reason
    ]
  )

  return result.rows[0]?.terms_id ?? null
}

const attachReportAssetIfPresent = async ({
  client,
  input,
  outcomeId
}: {
  client: PoolClient
  input: ReturnType<typeof normalizeConversionInput>
  outcomeId: string
}) => {
  if (!input.reportAssetId) return

  const scopeResult = await client.query<ConversionServiceScopeRow>(
    `SELECT s.space_id, sp.client_id
     FROM greenhouse_core.services s
     LEFT JOIN greenhouse_core.spaces sp ON sp.space_id = s.space_id
     WHERE s.service_id = $1
     LIMIT 1`,
    [input.serviceId]
  )

  await attachAssetToAggregate({
    assetId: input.reportAssetId,
    ownerAggregateType: 'sample_sprint_report',
    ownerAggregateId: outcomeId,
    actorUserId: input.decidedBy,
    ownerSpaceId: scopeResult.rows[0]?.space_id ?? null,
    ownerClientId: scopeResult.rows[0]?.client_id ?? null,
    metadata: {
      serviceId: input.serviceId,
      outcomeKind: 'converted',
      decisionDate: input.decisionDate,
      nextServiceId: input.nextServiceId,
      nextQuotationId: input.nextQuotationId
    },
    client
  })
}

export const convertEngagement = async (
  input: ConvertEngagementInput
): Promise<ConvertEngagementResult> => {
  const normalized = normalizeConversionInput(input)

  return withTransaction(async client => {
    await assertEngagementServiceEligible(client, normalized.serviceId)

    if (normalized.nextServiceId) {
      await assertEngagementServiceEligible(client, normalized.nextServiceId)
    }

    const outcomeResult = await client.query<{ outcome_id: string }>(
      `INSERT INTO greenhouse_commercial.engagement_outcomes (
         service_id, outcome_kind, decision_date, report_asset_id, metrics_json,
         decision_rationale, next_service_id, next_quotation_id, decided_by
       ) VALUES (
         $1, 'converted', $2::date, $3, $4::jsonb,
         $5, $6, $7, $8
       )
       RETURNING outcome_id`,
      [
        normalized.serviceId,
        normalized.decisionDate,
        normalized.reportAssetId,
        normalized.metrics == null ? null : JSON.stringify(normalized.metrics),
        normalized.decisionRationale,
        normalized.nextServiceId,
        normalized.nextQuotationId,
        normalized.decidedBy
      ]
    )

    const outcomeId = outcomeResult.rows[0]?.outcome_id

    if (!outcomeId) throw new Error('Failed to record converted engagement outcome.')

    await attachReportAssetIfPresent({ client, input: normalized, outcomeId })

    const termsId = await insertCommercialTerms(client, normalized)

    let lineageId: string | null = null

    if (normalized.nextServiceId) {
      const lineageResult = await client.query<{ lineage_id: string }>(
        `INSERT INTO greenhouse_commercial.engagement_lineage (
           parent_service_id, child_service_id, relationship_kind,
           transition_date, transition_reason, recorded_by
         ) VALUES (
           $1, $2, 'converted_to', $3::date, $4, $5
         )
         RETURNING lineage_id`,
        [
          normalized.serviceId,
          normalized.nextServiceId,
          normalized.decisionDate,
          normalized.transitionReason,
          normalized.decidedBy
        ]
      )

      lineageId = lineageResult.rows[0]?.lineage_id ?? null
      if (!lineageId) throw new Error('Failed to record engagement conversion lineage.')
    }

    await recordEngagementAuditEvent(
      {
        serviceId: normalized.serviceId,
        eventKind: 'converted',
        actorUserId: normalized.decidedBy,
        reason: normalized.decisionRationale,
        payload: {
          outcomeId,
          lineageId,
          termsId,
          nextServiceId: normalized.nextServiceId,
          nextQuotationId: normalized.nextQuotationId
        }
      },
      client
    )

    await publishEngagementEvent(
      {
        serviceId: normalized.serviceId,
        eventType: EVENT_TYPES.serviceEngagementConverted,
        actorUserId: normalized.decidedBy,
        payload: {
          outcomeId,
          lineageId,
          termsId,
          nextServiceId: normalized.nextServiceId,
          nextQuotationId: normalized.nextQuotationId
        }
      },
      client
    )

    return { outcomeId, lineageId, termsId }
  })
}
