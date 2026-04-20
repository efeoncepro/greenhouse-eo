import 'server-only'

import { randomUUID } from 'node:crypto'

import { createStructuredContext } from '@/lib/structured-context/store'
import { query } from '@/lib/db'

import type {
  CommercialCostBasisPeriod,
  CommercialCostBasisRunResult,
  CommercialCostBasisScope,
  CommercialCostBasisTenantScope
} from './contracts'

type CommercialCostBasisRunStatus = 'running' | 'succeeded' | 'failed' | 'partial' | 'cancelled'

const buildNotes = ({
  scope,
  periods,
  notes
}: {
  scope: CommercialCostBasisScope
  periods: CommercialCostBasisPeriod[]
  notes?: string | null
}) => {
  const base = `scope=${scope}; periods=${periods.map(period => period.periodId).join(',')}`

  return notes ? `${base}; ${notes}` : base
}

const persistReplayContext = async ({
  runId,
  status,
  result,
  errorMessage,
  scope,
  periods,
  notes
}: {
  runId: string
  status: CommercialCostBasisRunStatus
  result?: CommercialCostBasisRunResult
  errorMessage?: string | null
  scope: CommercialCostBasisScope
  periods: CommercialCostBasisPeriod[]
  notes?: string | null
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
        triggeredBy: null,
        sourceObjectType: `cost_basis_${scope}:${periods.map(period => period.periodId).join(',')}`,
        eventsProcessed: result?.recordsRead ?? null,
        eventsFailed: result?.recordsFailed ?? null,
        projectionsTriggered: result?.eventsPublished ?? null,
        durationMs: result?.durationMs ?? null,
        notes: notes ?? null,
        errorMessage: errorMessage ?? null
      }
    })
  } catch (error) {
    console.warn('[commercial-cost-worker] Failed to persist replay context', {
      runId,
      status,
      error
    })
  }
}

export const generateCommercialCostBasisRunId = () => `commercial-cost-${randomUUID()}`

export const writeCommercialCostBasisRunStart = async ({
  runId,
  scope,
  periods,
  triggeredBy,
  tenantScope,
  notes
}: {
  runId: string
  scope: CommercialCostBasisScope
  periods: CommercialCostBasisPeriod[]
  triggeredBy: string
  tenantScope: CommercialCostBasisTenantScope
  notes?: string | null
}) => {
  const tenantNotes = [
    tenantScope.spaceId ? `space=${tenantScope.spaceId}` : null,
    tenantScope.clientId ? `client=${tenantScope.clientId}` : null,
    tenantScope.organizationId ? `organization=${tenantScope.organizationId}` : null
  ].filter(Boolean)

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
      `cost_basis_${scope}`,
      triggeredBy,
      [buildNotes({ scope, periods, notes }), ...tenantNotes].join('; ')
    ]
  )
}

export const writeCommercialCostBasisRunComplete = async ({
  runId,
  scope,
  periods,
  result
}: {
  runId: string
  scope: CommercialCostBasisScope
  periods: CommercialCostBasisPeriod[]
  result: CommercialCostBasisRunResult
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
      result.recordsRead,
      result.recordsWritten,
      result.recordsWritten,
      result.eventsPublished,
      `${result.periodsProcessed} period(s), ${result.recordsWritten} writes, ${result.recordsFailed} failed, ${result.eventsPublished} events, ${result.durationMs}ms`
    ]
  )

  await persistReplayContext({
    runId,
    status: result.status,
    result,
    scope,
    periods,
    notes: `${result.periodsProcessed} period(s), ${result.recordsWritten} writes, ${result.recordsFailed} failed, ${result.eventsPublished} events, ${result.durationMs}ms`
  })
}

export const writeCommercialCostBasisRunFailure = async ({
  runId,
  scope,
  periods,
  error
}: {
  runId: string
  scope: CommercialCostBasisScope
  periods: CommercialCostBasisPeriod[]
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
    errorMessage: message.slice(0, 500),
    scope,
    periods,
    notes: message.slice(0, 500)
  })
}
