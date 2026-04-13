import 'server-only'

import type { ReactiveRunSummary } from '@/lib/sync/reactive-run-tracker'

import { createStructuredContext, getLatestStructuredContextByOwner } from './store'
import type { ReactiveReplayContextDocument } from './types'

type ReactiveRunStatus = 'running' | 'succeeded' | 'failed' | 'partial' | 'cancelled'

export const createReactiveReplayContext = async ({
  runId,
  status,
  result,
  errorMessage,
  triggeredBy,
  sourceObjectType,
  notes
}: {
  runId: string
  status: ReactiveRunStatus
  result?: ReactiveRunSummary
  errorMessage?: string | null
  triggeredBy?: string | null
  sourceObjectType?: string | null
  notes?: string | null
}) => {
  const document = {
    runId,
    status,
    sourceSystem: 'reactive_worker',
    triggeredBy: triggeredBy ?? null,
    sourceObjectType: sourceObjectType ?? 'reactive_events',
    eventsProcessed: result?.eventsProcessed ?? null,
    eventsFailed: result?.eventsFailed ?? null,
    projectionsTriggered: result?.projectionsTriggered ?? null,
    durationMs: result?.durationMs ?? null,
    notes: notes ?? null,
    errorMessage: errorMessage ?? null
  } satisfies ReactiveReplayContextDocument

  return createStructuredContext<ReactiveReplayContextDocument>({
    ownerAggregateType: 'source_sync_run',
    ownerAggregateId: runId,
    contextKind: 'event.replay_context',
    schemaVersion: 'v1',
    sourceSystem: 'reactive_worker',
    producerType: 'worker',
    producerId: 'reactive-run-tracker',
    accessScope: 'restricted_ops',
    retentionPolicyCode: 'ops_replay_90d',
    idempotencyKey: `reactive-run:${runId}:${status}`,
    document
  })
}

export const getReactiveReplayContext = async (runId: string) =>
  getLatestStructuredContextByOwner<ReactiveReplayContextDocument>({
    ownerAggregateType: 'source_sync_run',
    ownerAggregateId: runId,
    contextKind: 'event.replay_context'
  })
