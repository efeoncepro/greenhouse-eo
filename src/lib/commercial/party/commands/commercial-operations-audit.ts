import 'server-only'

import { randomUUID } from 'node:crypto'

import type { CommercialOperationStatus, ConversionTriggeredBy } from './convert-quote-to-cash-types'

// TASK-541: narrow helpers over `greenhouse_commercial.commercial_operations_audit`.
// Used only from within the choreography's transaction; the caller passes the
// tx client so the audit row travels with the rest of the state changes.

interface QueryResultLike<T> {
  rows: T[]
}

interface QueryableClient {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ) => Promise<QueryResultLike<T>>
}

export interface StartOperationInput {
  correlationId?: string
  operationType: 'quote_to_cash'
  triggerSource: ConversionTriggeredBy
  actorUserId: string
  tenantScope: string
  quotationId: string | null
  organizationId: string | null
  hubspotDealId: string | null
  totalAmountClp: number | null
  metadata?: Record<string, unknown>
}

export interface StartOperationResult {
  operationId: string
  correlationId: string
}

export const startCorrelatedOperation = async (
  client: QueryableClient,
  input: StartOperationInput
): Promise<StartOperationResult> => {
  const correlationId = input.correlationId ?? randomUUID()

  const result = await client.query<{ operation_id: string }>(
    `INSERT INTO greenhouse_commercial.commercial_operations_audit (
       correlation_id,
       operation_type,
       status,
       trigger_source,
       actor_user_id,
       tenant_scope,
       quotation_id,
       organization_id,
       hubspot_deal_id,
       total_amount_clp,
       metadata
     ) VALUES ($1, $2, 'started', $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     RETURNING operation_id::text AS operation_id`,
    [
      correlationId,
      input.operationType,
      input.triggerSource,
      input.actorUserId,
      input.tenantScope,
      input.quotationId,
      input.organizationId,
      input.hubspotDealId,
      input.totalAmountClp,
      JSON.stringify(input.metadata ?? {})
    ]
  )

  const operationId = result.rows[0]?.operation_id

  if (!operationId) {
    throw new Error('Failed to persist commercial_operations_audit row')
  }

  return { operationId, correlationId }
}

export interface CompleteOperationInput {
  status: Exclude<CommercialOperationStatus, 'started'>
  contractId?: string | null
  clientId?: string | null
  approvalId?: string | null
  errorCode?: string | null
  errorMessage?: string | null
  metadataPatch?: Record<string, unknown>
}

export const completeOperation = async (
  client: QueryableClient,
  operationId: string,
  input: CompleteOperationInput
): Promise<void> => {
  await client.query(
    `UPDATE greenhouse_commercial.commercial_operations_audit
        SET status = $2,
            contract_id = COALESCE($3, contract_id),
            client_id = COALESCE($4, client_id),
            approval_id = COALESCE($5, approval_id),
            error_code = $6,
            error_message = $7,
            metadata = CASE
              WHEN $8::jsonb IS NULL THEN metadata
              ELSE metadata || $8::jsonb
            END,
            completed_at = NOW()
      WHERE operation_id = $1`,
    [
      operationId,
      input.status,
      input.contractId ?? null,
      input.clientId ?? null,
      input.approvalId ?? null,
      input.errorCode ?? null,
      input.errorMessage ?? null,
      input.metadataPatch ? JSON.stringify(input.metadataPatch) : null
    ]
  )
}

export interface ExistingOperationRow extends Record<string, unknown> {
  operation_id: string
  correlation_id: string
  status: string
  contract_id: string | null
  client_id: string | null
  organization_id: string | null
  hubspot_deal_id: string | null
  quotation_id: string | null
  approval_id: string | null
  completed_at: string | null
}

export const findCompletedOperationForQuotation = async (
  client: QueryableClient,
  quotationId: string
): Promise<ExistingOperationRow | null> => {
  const result = await client.query<ExistingOperationRow>(
    `SELECT operation_id::text AS operation_id,
            correlation_id::text AS correlation_id,
            status,
            contract_id,
            client_id,
            organization_id,
            hubspot_deal_id,
            quotation_id,
            approval_id,
            completed_at::text AS completed_at
       FROM greenhouse_commercial.commercial_operations_audit
       WHERE quotation_id = $1
         AND operation_type = 'quote_to_cash'
         AND status IN ('completed', 'pending_approval')
       ORDER BY started_at DESC
       LIMIT 1`,
    [quotationId]
  )

  return result.rows[0] ?? null
}
