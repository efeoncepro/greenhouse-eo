import 'server-only'

import { randomUUID } from 'node:crypto'

import { createStructuredContext } from '@/lib/structured-context/store'
import { query } from '@/lib/db'
import {
  recalculateQuotationPricing,
  UnsupportedQuotationReplayError
} from '@/lib/finance/pricing/quotation-pricing-orchestrator'

import type {
  QuoteRepriceBulkRequest,
  QuoteRepriceBulkQuoteResult,
  QuoteRepriceBulkRunResult
} from './contracts'

const generateQuoteRepriceRunId = () => `quote-reprice-${randomUUID()}`

const buildTenantFilters = (request: QuoteRepriceBulkRequest) => {
  const conditions: string[] = []
  const values: unknown[] = []

  if (request.tenantScope.spaceId) {
    values.push(request.tenantScope.spaceId)
    conditions.push(`q.space_id = $${values.length}`)
  }

  if (request.tenantScope.organizationId) {
    values.push(request.tenantScope.organizationId)
    conditions.push(`q.organization_id = $${values.length}`)
  }

  if (request.tenantScope.clientId) {
    values.push(request.tenantScope.clientId)
    conditions.push(`q.client_id = $${values.length}`)
  }

  return { conditions, values }
}

const selectQuotationIds = async (request: QuoteRepriceBulkRequest) => {
  const { conditions, values } = buildTenantFilters(request)

  if (request.replayCriteria === 'quote_ids') {
    if (request.quoteIds.length === 0) {
      throw new Error('quoteIds is required when replayCriteria=quote_ids')
    }

    values.push(request.quoteIds)
    conditions.push(`q.quotation_id = ANY($${values.length}::text[])`)
  }

  if (request.replayCriteria === 'period_scope' && request.period) {
    values.push(request.period.year)
    values.push(request.period.month)
    conditions.push(
      `EXTRACT(YEAR FROM q.quote_date) = $${values.length - 1} AND EXTRACT(MONTH FROM q.quote_date) = $${values.length}`
    )
  }

  if (request.replayCriteria === 'current_open_quotes') {
    conditions.push(`q.status IN ('draft', 'pending_approval', 'sent', 'approved')`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await query<{ quotation_id: string }>(
    `SELECT DISTINCT q.quotation_id
       FROM greenhouse_commercial.quotations q
       ${whereClause}
       ORDER BY q.updated_at DESC, q.quotation_id ASC`,
    values
  )

  return rows.map(row => row.quotation_id)
}

const persistReplayContext = async ({
  runId,
  status,
  result,
  errorMessage,
  request
}: {
  runId: string
  status: 'running' | 'succeeded' | 'failed' | 'partial'
  result?: QuoteRepriceBulkRunResult
  errorMessage?: string | null
  request: QuoteRepriceBulkRequest
}) => {
  try {
    await createStructuredContext({
      ownerAggregateType: 'source_sync_run',
      ownerAggregateId: runId,
      contextKind: 'event.replay_context',
      schemaVersion: 'v1',
      sourceSystem: 'commercial_cost_worker',
      producerType: 'worker',
      producerId: 'commercial-cost-worker',
      accessScope: 'restricted_finance',
      retentionPolicyCode: 'ops_replay_90d',
      idempotencyKey: `commercial-cost-worker:${runId}:${status}`,
      document: {
        runId,
        status,
        sourceSystem: 'commercial_cost_worker',
        triggeredBy: request.triggeredBy,
        sourceObjectType: `quote_reprice:${request.replayCriteria}`,
        eventsProcessed: result?.quotesProcessed ?? null,
        eventsFailed: result?.quotesFailed ?? null,
        projectionsTriggered: result?.quotesSucceeded ?? null,
        durationMs: result?.durationMs ?? null,
        notes: request.notes ?? null,
        errorMessage: errorMessage ?? null,
        request
      }
    })
  } catch (error) {
    console.warn('[commercial-cost-worker] Failed to persist quote reprice replay context', {
      runId,
      status,
      error
    })
  }
}

const writeRunStart = async ({
  runId,
  request
}: {
  runId: string
  request: QuoteRepriceBulkRequest
}) => {
  await query(
    `INSERT INTO greenhouse_sync.source_sync_runs (
      sync_run_id,
      source_system,
      source_object_type,
      sync_mode,
      status,
      records_read,
      records_written_raw,
      records_written_conformed,
      records_projected_postgres,
      triggered_by,
      notes,
      finished_at
    )
    VALUES (
      $1,
      'commercial_cost_worker',
      $2,
      'batch',
      'running',
      0,
      0,
      0,
      0,
      $3,
      $4,
      NULL
    )
    ON CONFLICT (sync_run_id) DO NOTHING`,
    [
      runId,
      'quote_reprice_bulk',
      request.triggeredBy,
      [
        `criteria=${request.replayCriteria}`,
        request.period
          ? `period=${request.period.year}-${String(request.period.month).padStart(2, '0')}`
          : null,
        request.tenantScope.spaceId ? `space=${request.tenantScope.spaceId}` : null,
        request.tenantScope.organizationId
          ? `organization=${request.tenantScope.organizationId}`
          : null,
        request.tenantScope.clientId ? `client=${request.tenantScope.clientId}` : null,
        request.notes
      ]
        .filter(Boolean)
        .join('; ')
    ]
  )

  await persistReplayContext({ runId, status: 'running', request })
}

const writeRunComplete = async ({
  runId,
  request,
  result
}: {
  runId: string
  request: QuoteRepriceBulkRequest
  result: QuoteRepriceBulkRunResult
}) => {
  await query(
    `UPDATE greenhouse_sync.source_sync_runs
     SET status = $2,
         records_read = $3,
         records_written_raw = $4,
         records_written_conformed = $5,
         records_projected_postgres = $6,
         notes = $7,
         finished_at = CURRENT_TIMESTAMP
     WHERE sync_run_id = $1`,
    [
      runId,
      result.status,
      result.quotesProcessed,
      result.quotesSucceeded,
      result.quotesSucceeded,
      result.quotesSucceeded,
      `${result.quotesProcessed} processed, ${result.quotesSucceeded} repriced, ${result.quotesSkipped} skipped, ${result.quotesFailed} failed, ${result.durationMs}ms`
    ]
  )

  await persistReplayContext({ runId, status: result.status, result, request })
}

const writeRunFailure = async ({
  runId,
  request,
  error
}: {
  runId: string
  request: QuoteRepriceBulkRequest
  error: unknown
}) => {
  const message = error instanceof Error ? error.message : String(error)

  await query(
    `UPDATE greenhouse_sync.source_sync_runs
     SET status = 'failed',
         notes = $2,
         finished_at = CURRENT_TIMESTAMP
     WHERE sync_run_id = $1`,
    [runId, message.slice(0, 500)]
  )

  await persistReplayContext({
    runId,
    status: 'failed',
    request,
    errorMessage: message.slice(0, 500)
  })
}

export const runQuoteRepriceBulk = async (
  request: QuoteRepriceBulkRequest
): Promise<QuoteRepriceBulkRunResult> => {
  const runId = generateQuoteRepriceRunId()
  const startedAt = Date.now()

  await writeRunStart({ runId, request })

  try {
    const quotationIds = await selectQuotationIds(request)
    const results: QuoteRepriceBulkQuoteResult[] = []

    for (const quotationId of quotationIds) {
      try {
        const snapshot = await recalculateQuotationPricing({
          quotationId,
          createdBy: request.triggeredBy,
          createVersion: request.createVersion,
          strictReplay: true
        })

        results.push({
          quotationId,
          status: 'succeeded',
          reason: null,
          versionNumber: snapshot.versionNumber,
          lineItemsRepriced: snapshot.lineItems.length
        })
      } catch (error) {
        if (error instanceof UnsupportedQuotationReplayError) {
          results.push({
            quotationId,
            status: 'skipped',
            reason: error.message,
            versionNumber: null,
            lineItemsRepriced: 0
          })

          continue
        }

        results.push({
          quotationId,
          status: 'failed',
          reason: error instanceof Error ? error.message : String(error),
          versionNumber: null,
          lineItemsRepriced: 0
        })
      }
    }

    const quotesSucceeded = results.filter(result => result.status === 'succeeded').length
    const quotesSkipped = results.filter(result => result.status === 'skipped').length
    const quotesFailed = results.filter(result => result.status === 'failed').length
    const quotesProcessed = results.length

    const status =
      quotesFailed > 0 ? (quotesSucceeded > 0 || quotesSkipped > 0 ? 'partial' : 'failed') : 'succeeded'

    const runResult: QuoteRepriceBulkRunResult = {
      runId,
      status,
      durationMs: Date.now() - startedAt,
      quotesProcessed,
      quotesSucceeded,
      quotesSkipped,
      quotesFailed,
      results
    }

    await writeRunComplete({ runId, request, result: runResult })

    return runResult
  } catch (error) {
    await writeRunFailure({ runId, request, error })
    throw error
  }
}
