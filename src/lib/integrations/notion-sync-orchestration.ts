import 'server-only'

import { randomUUID } from 'node:crypto'

import { getDb } from '@/lib/db'
import { runNotionDeliveryDataQualitySweep } from '@/lib/integrations/notion-delivery-data-quality'
import {
  getNotionRawFreshnessGate,
  type NotionRawFreshnessGateResult,
  type NotionRawFreshnessSpaceSnapshot
} from '@/lib/integrations/notion-readiness'
import { syncNotionToConformed, type SyncConformedResult } from '@/lib/sync/sync-notion-conformed'
import type { Json } from '@/types/db'
import type {
  NotionSyncOrchestrationExecutionSource,
  NotionSyncOrchestrationOverview,
  NotionSyncOrchestrationResult,
  NotionSyncOrchestrationRunRecord,
  NotionSyncOrchestrationSpaceSnapshot,
  NotionSyncOrchestrationTriggerSource,
  NotionSyncRecoveryResult,
  NotionSyncRetrySchedule,
  TenantNotionSyncOrchestrationDetail
} from '@/types/notion-sync-orchestration'

const INTEGRATION_KEY = 'notion'
const PIPELINE_KEY = 'notion_delivery_sync'
const OPEN_STATUSES = ['waiting_for_raw', 'retry_scheduled', 'retry_running'] as const
const RECOVERY_ELIGIBLE_STATUSES = ['waiting_for_raw', 'retry_scheduled'] as const
const MAX_RETRY_ATTEMPTS = 8

type ActiveNotionSpaceRow = {
  spaceId: string
  spaceName: string | null
  clientId: string | null
}

type OrchestrationRow = {
  orchestration_run_id: string
  integration_key: string
  pipeline_key: string
  space_id: string
  source_sync_run_id: string | null
  orchestration_status: string
  trigger_source: string
  retry_attempt: number
  max_retry_attempts: number
  raw_boundary_start_at: Date | string | null
  latest_raw_synced_at: Date | string | null
  waiting_reason: string | null
  next_retry_at: Date | string | null
  completed_at: Date | string | null
  metadata: unknown
  created_at: Date | string
  updated_at: Date | string
}

const buildOrchestrationRunId = () => `EO-NSO-${randomUUID().slice(0, 8).toUpperCase()}`

const toIsoString = (value: unknown) => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) return null

    const parsed = new Date(trimmed)

    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString()
  }

  return String(value)
}

const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

const getSpaceFreshestRawSyncedAt = (space: NotionRawFreshnessSpaceSnapshot) =>
  [space.maxTaskSyncedAt, space.maxProjectSyncedAt, space.maxSprintSyncedAt]
    .filter((entry): entry is string => Boolean(entry))
    .sort()
    .at(-1) ?? null

const mapExecutionSourceToTriggerSource = (
  executionSource: NotionSyncOrchestrationExecutionSource
): NotionSyncOrchestrationTriggerSource => {
  if (executionSource === 'scheduled_retry') return 'cron_recovery'
  if (executionSource === 'manual_admin') return 'manual_admin'

  return 'cron_primary'
}

const mapRow = (row: OrchestrationRow): NotionSyncOrchestrationRunRecord => ({
  orchestrationRunId: row.orchestration_run_id,
  integrationKey: row.integration_key,
  pipelineKey: row.pipeline_key,
  spaceId: row.space_id,
  sourceSyncRunId: row.source_sync_run_id,
  orchestrationStatus: row.orchestration_status as NotionSyncOrchestrationRunRecord['orchestrationStatus'],
  triggerSource: row.trigger_source as NotionSyncOrchestrationRunRecord['triggerSource'],
  retryAttempt: row.retry_attempt,
  maxRetryAttempts: row.max_retry_attempts,
  rawBoundaryStartAt: toIsoString(row.raw_boundary_start_at),
  latestRawSyncedAt: toIsoString(row.latest_raw_synced_at),
  waitingReason: row.waiting_reason,
  nextRetryAt: toIsoString(row.next_retry_at),
  completedAt: toIsoString(row.completed_at),
  metadata: toRecord(row.metadata),
  createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString()
})

export const computeRetryDelayMinutes = (retryAttempt: number) => {
  if (retryAttempt <= 0) return 15

  return Math.min(15 * 2 ** (retryAttempt - 1), 60)
}

export const buildRetrySchedule = ({
  retryAttempt,
  now = new Date()
}: {
  retryAttempt: number
  now?: Date
}): NotionSyncRetrySchedule => {
  const delayMinutes = computeRetryDelayMinutes(retryAttempt)
  const nextRetryAt = new Date(now.getTime() + delayMinutes * 60_000).toISOString()

  return {
    retryAttempt,
    delayMinutes,
    nextRetryAt
  }
}

const listActiveNotionSpaces = async (): Promise<ActiveNotionSpaceRow[]> => {
  const db = await getDb()

  return db
    .selectFrom('greenhouse_core.space_notion_sources as sources')
    .innerJoin('greenhouse_core.spaces as spaces', 'spaces.space_id', 'sources.space_id')
    .select([
      'sources.space_id as spaceId',
      'spaces.space_name as spaceName',
      'spaces.client_id as clientId'
    ])
    .where('sources.sync_enabled', '=', true)
    .where('spaces.active', '=', true)
    .orderBy('spaces.space_name', 'asc')
    .execute()
}

const listOpenRuns = async () => {
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_sync.notion_sync_orchestration_runs')
    .selectAll()
    .where('integration_key', '=', INTEGRATION_KEY)
    .where('pipeline_key', '=', PIPELINE_KEY)
    .where('orchestration_status', 'in', [...OPEN_STATUSES])
    .orderBy('created_at', 'asc')
    .execute()

  return rows.map(mapRow)
}

export const listDueNotionSyncRecoveryRuns = async (now = new Date()) => {
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_sync.notion_sync_orchestration_runs')
    .selectAll()
    .where('integration_key', '=', INTEGRATION_KEY)
    .where('pipeline_key', '=', PIPELINE_KEY)
    .where('orchestration_status', 'in', [...RECOVERY_ELIGIBLE_STATUSES])
    .where(eb =>
      eb.or([
        eb('next_retry_at', 'is', null),
        eb('next_retry_at', '<=', now)
      ])
    )
    .orderBy('next_retry_at', 'asc')
    .orderBy('created_at', 'asc')
    .execute()

  return rows.map(mapRow)
}

export const recordNotionSyncWaitingForRaw = async ({
  rawFreshness,
  triggerSource
}: {
  rawFreshness: NotionRawFreshnessGateResult
  triggerSource: NotionSyncOrchestrationTriggerSource
}) => {
  const staleSpaces = rawFreshness.staleSpaces

  if (staleSpaces.length === 0) {
    return {
      pendingSpaces: 0,
      nextRetryAt: null as string | null
    }
  }

  const db = await getDb()
  const now = new Date()
  const schedule = buildRetrySchedule({ retryAttempt: 0, now })
  const openRuns = await listOpenRuns()
  const openBySpaceId = new Map(openRuns.map(run => [run.spaceId, run]))
  let nextRetryAt: string | null = null

  await db.transaction().execute(async trx => {
    for (const space of staleSpaces) {
      const existing = openBySpaceId.get(space.spaceId)

      const metadata = {
        boundaryStartAt: rawFreshness.boundaryStartAt,
        freshestRawSyncedAt: rawFreshness.freshestRawSyncedAt,
        staleSpaces: rawFreshness.staleSpaces.map(item => ({
          spaceId: item.spaceId,
          reasons: item.reasons,
          freshestRawSyncedAt: getSpaceFreshestRawSyncedAt(item)
        }))
      }

      const freshestSpaceRaw = getSpaceFreshestRawSyncedAt(space)

      if (existing) {
        const scheduledNextRetryAt =
          existing.nextRetryAt && new Date(existing.nextRetryAt) > now
            ? existing.nextRetryAt
            : schedule.nextRetryAt

        await trx
          .updateTable('greenhouse_sync.notion_sync_orchestration_runs')
          .set({
            orchestration_status: 'waiting_for_raw',
            trigger_source: triggerSource,
            raw_boundary_start_at: rawFreshness.boundaryStartAt,
            latest_raw_synced_at: freshestSpaceRaw,
            waiting_reason: space.reasons.join(' | '),
            next_retry_at: scheduledNextRetryAt,
            completed_at: null,
            updated_at: now.toISOString(),
            metadata: metadata as unknown as Json
          })
          .where('orchestration_run_id', '=', existing.orchestrationRunId)
          .execute()

        nextRetryAt = nextRetryAt && nextRetryAt < scheduledNextRetryAt ? nextRetryAt : scheduledNextRetryAt

        continue
      }

      await trx
        .insertInto('greenhouse_sync.notion_sync_orchestration_runs')
        .values({
          orchestration_run_id: buildOrchestrationRunId(),
          integration_key: INTEGRATION_KEY,
          pipeline_key: PIPELINE_KEY,
          space_id: space.spaceId,
          orchestration_status: 'waiting_for_raw',
          trigger_source: triggerSource,
          retry_attempt: 0,
          max_retry_attempts: MAX_RETRY_ATTEMPTS,
          raw_boundary_start_at: rawFreshness.boundaryStartAt,
          latest_raw_synced_at: freshestSpaceRaw,
          waiting_reason: space.reasons.join(' | '),
          next_retry_at: schedule.nextRetryAt,
          metadata: metadata as unknown as Json
        })
        .execute()

      nextRetryAt = nextRetryAt && nextRetryAt < schedule.nextRetryAt ? nextRetryAt : schedule.nextRetryAt
    }
  })

  return {
    pendingSpaces: staleSpaces.length,
    nextRetryAt
  }
}

export const rescheduleNotionSyncRecoveryRuns = async ({
  rawFreshness,
  triggerSource,
  runs
}: {
  rawFreshness: NotionRawFreshnessGateResult
  triggerSource: NotionSyncOrchestrationTriggerSource
  runs: NotionSyncOrchestrationRunRecord[]
}) => {
  if (runs.length === 0) {
    return {
      blockedSpaces: 0,
      failedSpaces: 0,
      nextRetryAt: null as string | null
    }
  }

  const db = await getDb()
  const staleSpaceById = new Map(rawFreshness.staleSpaces.map(space => [space.spaceId, space]))
  const now = new Date()
  let blockedSpaces = 0
  let failedSpaces = 0
  let nextRetryAt: string | null = null

  await db.transaction().execute(async trx => {
    for (const run of runs) {
      const space = staleSpaceById.get(run.spaceId)
      const nextAttempt = run.retryAttempt + 1
      const freshestSpaceRaw = space ? getSpaceFreshestRawSyncedAt(space) : rawFreshness.freshestRawSyncedAt

      const metadata = {
        boundaryStartAt: rawFreshness.boundaryStartAt,
        freshestRawSyncedAt: rawFreshness.freshestRawSyncedAt,
        staleSpaces: rawFreshness.staleSpaces.map(item => ({
          spaceId: item.spaceId,
          reasons: item.reasons,
          freshestRawSyncedAt: getSpaceFreshestRawSyncedAt(item)
        }))
      }

      if (nextAttempt > run.maxRetryAttempts) {
        await trx
          .updateTable('greenhouse_sync.notion_sync_orchestration_runs')
          .set({
            orchestration_status: 'sync_failed',
            trigger_source: triggerSource,
            retry_attempt: nextAttempt,
            latest_raw_synced_at: freshestSpaceRaw,
            waiting_reason: space?.reasons.join(' | ') ?? rawFreshness.reason,
            next_retry_at: null,
            completed_at: now.toISOString(),
            updated_at: now.toISOString(),
            metadata: {
              ...run.metadata,
              ...metadata,
              failureReason: 'max_retry_attempts_exhausted'
            } as unknown as Json
          })
          .where('orchestration_run_id', '=', run.orchestrationRunId)
          .execute()

        failedSpaces += 1
        continue
      }

      const schedule = buildRetrySchedule({ retryAttempt: nextAttempt, now })

      await trx
        .updateTable('greenhouse_sync.notion_sync_orchestration_runs')
        .set({
          orchestration_status: 'retry_scheduled',
          trigger_source: triggerSource,
          retry_attempt: nextAttempt,
          raw_boundary_start_at: rawFreshness.boundaryStartAt,
          latest_raw_synced_at: freshestSpaceRaw,
          waiting_reason: space?.reasons.join(' | ') ?? rawFreshness.reason,
          next_retry_at: schedule.nextRetryAt,
          updated_at: now.toISOString(),
          metadata: metadata as unknown as Json
        })
        .where('orchestration_run_id', '=', run.orchestrationRunId)
        .execute()

      blockedSpaces += 1
      nextRetryAt = nextRetryAt && nextRetryAt < schedule.nextRetryAt ? nextRetryAt : schedule.nextRetryAt
    }
  })

  return {
    blockedSpaces,
    failedSpaces,
    nextRetryAt
  }
}

export const markNotionSyncRecoveryRunning = async (runs: NotionSyncOrchestrationRunRecord[]) => {
  if (runs.length === 0) return

  const db = await getDb()
  const nowIso = new Date().toISOString()

  await db
    .updateTable('greenhouse_sync.notion_sync_orchestration_runs')
    .set({
      orchestration_status: 'retry_running',
      trigger_source: 'cron_recovery',
      next_retry_at: null,
      updated_at: nowIso
    })
    .where('orchestration_run_id', 'in', runs.map(run => run.orchestrationRunId))
    .execute()
}

export const completeOpenNotionSyncRuns = async ({
  sourceSyncRunId,
  triggerSource,
  metadata = {}
}: {
  sourceSyncRunId: string
  triggerSource: NotionSyncOrchestrationTriggerSource
  metadata?: Record<string, unknown>
}) => {
  const db = await getDb()
  const nowIso = new Date().toISOString()

  await db
    .updateTable('greenhouse_sync.notion_sync_orchestration_runs')
    .set({
      orchestration_status: 'sync_completed',
      trigger_source: triggerSource,
      source_sync_run_id: sourceSyncRunId,
      next_retry_at: null,
      completed_at: nowIso,
      updated_at: nowIso,
      metadata: metadata as unknown as Json
    })
    .where('integration_key', '=', INTEGRATION_KEY)
    .where('pipeline_key', '=', PIPELINE_KEY)
    .where('orchestration_status', 'in', [...OPEN_STATUSES])
    .execute()
}

export const failOpenNotionSyncRuns = async ({
  sourceSyncRunId = null,
  triggerSource,
  message,
  metadata = {}
}: {
  sourceSyncRunId?: string | null
  triggerSource: NotionSyncOrchestrationTriggerSource
  message: string
  metadata?: Record<string, unknown>
}) => {
  const db = await getDb()
  const nowIso = new Date().toISOString()

  await db
    .updateTable('greenhouse_sync.notion_sync_orchestration_runs')
    .set({
      orchestration_status: 'sync_failed',
      trigger_source: triggerSource,
      source_sync_run_id: sourceSyncRunId,
      waiting_reason: message,
      next_retry_at: null,
      completed_at: nowIso,
      updated_at: nowIso,
      metadata: {
        error: message,
        ...metadata
      } as unknown as Json
    })
    .where('integration_key', '=', INTEGRATION_KEY)
    .where('pipeline_key', '=', PIPELINE_KEY)
    .where('orchestration_status', 'in', [...OPEN_STATUSES])
    .execute()
}

export const runNotionConformedCycle = async (
  rawFreshness?: NotionRawFreshnessGateResult
): Promise<{
  sync: SyncConformedResult
  dataQualityMonitor: NotionSyncRecoveryResult['dataQualityMonitor']
}> => {
  const sync = await syncNotionToConformed(
    rawFreshness
      ? {
          rawFreshness
        }
      : undefined
  )

  if (sync.skipped) {
    return {
      sync,
      dataQualityMonitor: null
    }
  }

  try {
    const sweep = await runNotionDeliveryDataQualitySweep({
      executionSource: 'post_sync',
      sourceSyncRunId: sync.syncRunId,
      periodField: 'due_date'
    })

    return {
      sync,
      dataQualityMonitor: {
        executed: true,
        healthySpaces: sweep.healthySpaces,
        degradedSpaces: sweep.degradedSpaces,
        brokenSpaces: sweep.brokenSpaces,
        failedSpaces: sweep.failedSpaces
      }
    }
  } catch (error) {
    return {
      sync,
      dataQualityMonitor: {
        executed: false,
        healthySpaces: 0,
        degradedSpaces: 0,
        brokenSpaces: 0,
        failedSpaces: 0,
        error: error instanceof Error ? error.message : 'Unknown data quality monitor error'
      }
    }
  }
}

export const runNotionSyncRecovery = async (): Promise<NotionSyncRecoveryResult> => {
  const dueRuns = await listDueNotionSyncRecoveryRuns()

  if (dueRuns.length === 0) {
    return {
      triggered: false,
      pendingSpaces: 0,
      retriedSpaces: 0,
      blockedSpaces: 0,
      completedSpaces: 0,
      failedSpaces: 0,
      reason: 'No pending retries due',
      nextRetryAt: null,
      syncRunId: null,
      dataQualityMonitor: null
    }
  }

  const rawFreshness = await getNotionRawFreshnessGate()

  if (!rawFreshness.ready) {
    const rescheduled = await rescheduleNotionSyncRecoveryRuns({
      rawFreshness,
      triggerSource: 'cron_recovery',
      runs: dueRuns
    })

    return {
      triggered: false,
      pendingSpaces: dueRuns.length,
      retriedSpaces: 0,
      blockedSpaces: rescheduled.blockedSpaces,
      completedSpaces: 0,
      failedSpaces: rescheduled.failedSpaces,
      reason: rawFreshness.reason,
      nextRetryAt: rescheduled.nextRetryAt,
      syncRunId: null,
      dataQualityMonitor: null
    }
  }

  await markNotionSyncRecoveryRunning(dueRuns)

  try {
    const cycle = await runNotionConformedCycle(rawFreshness)

    if (cycle.sync.skipped && cycle.sync.rawFreshness && !cycle.sync.rawFreshness.ready) {
      const rescheduled = await rescheduleNotionSyncRecoveryRuns({
        rawFreshness: cycle.sync.rawFreshness,
        triggerSource: 'cron_recovery',
        runs: dueRuns
      })

      return {
        triggered: false,
        pendingSpaces: dueRuns.length,
        retriedSpaces: 0,
        blockedSpaces: rescheduled.blockedSpaces,
        completedSpaces: 0,
        failedSpaces: rescheduled.failedSpaces,
        reason: cycle.sync.skipReason ?? cycle.sync.rawFreshness.reason,
        nextRetryAt: rescheduled.nextRetryAt,
        syncRunId: cycle.sync.syncRunId,
        dataQualityMonitor: cycle.dataQualityMonitor
      }
    }

    await completeOpenNotionSyncRuns({
      sourceSyncRunId: cycle.sync.syncRunId,
      triggerSource: 'cron_recovery',
      metadata: {
        completedBy: 'cron_recovery',
        dataQualityMonitor: cycle.dataQualityMonitor
      }
    })

    return {
      triggered: true,
      pendingSpaces: dueRuns.length,
      retriedSpaces: dueRuns.length,
      blockedSpaces: 0,
      completedSpaces: dueRuns.length,
      failedSpaces: 0,
      reason: 'Retry converged successfully',
      nextRetryAt: null,
      syncRunId: cycle.sync.syncRunId,
      dataQualityMonitor: cycle.dataQualityMonitor
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown recovery error'

    await failOpenNotionSyncRuns({
      triggerSource: 'cron_recovery',
      message,
      metadata: {
        failedBy: 'cron_recovery'
      }
    })

    return {
      triggered: false,
      pendingSpaces: dueRuns.length,
      retriedSpaces: 0,
      blockedSpaces: 0,
      completedSpaces: 0,
      failedSpaces: dueRuns.length,
      reason: message,
      nextRetryAt: null,
      syncRunId: null,
      dataQualityMonitor: null
    }
  }
}

export const runNotionSyncOrchestration = async ({
  executionSource
}: {
  executionSource: NotionSyncOrchestrationExecutionSource
}): Promise<NotionSyncOrchestrationResult> => {
  if (executionSource === 'scheduled_retry') {
    return runNotionSyncRecovery()
  }

  const triggerSource = mapExecutionSourceToTriggerSource(executionSource)
  const rawFreshness = await getNotionRawFreshnessGate()

  if (!rawFreshness.ready) {
    const blocked = await recordNotionSyncWaitingForRaw({
      rawFreshness,
      triggerSource
    })

    return {
      triggered: false,
      pendingSpaces: blocked.pendingSpaces,
      retriedSpaces: 0,
      blockedSpaces: blocked.pendingSpaces,
      completedSpaces: 0,
      failedSpaces: 0,
      reason: rawFreshness.reason,
      nextRetryAt: blocked.nextRetryAt,
      syncRunId: null,
      dataQualityMonitor: null
    }
  }

  const openRuns = await listOpenRuns()

  try {
    const cycle = await runNotionConformedCycle(rawFreshness)

    if (cycle.sync.skipped) {
      if (cycle.sync.rawFreshness && !cycle.sync.rawFreshness.ready) {
        const blocked = await recordNotionSyncWaitingForRaw({
          rawFreshness: cycle.sync.rawFreshness,
          triggerSource
        })

        return {
          triggered: false,
          pendingSpaces: blocked.pendingSpaces,
          retriedSpaces: 0,
          blockedSpaces: blocked.pendingSpaces,
          completedSpaces: 0,
          failedSpaces: 0,
          reason: cycle.sync.skipReason ?? cycle.sync.rawFreshness.reason,
          nextRetryAt: blocked.nextRetryAt,
          syncRunId: cycle.sync.syncRunId,
          dataQualityMonitor: cycle.dataQualityMonitor
        }
      }

      return {
        triggered: false,
        pendingSpaces: openRuns.length,
        retriedSpaces: 0,
        blockedSpaces: 0,
        completedSpaces: 0,
        failedSpaces: 0,
        reason: cycle.sync.skipReason ?? 'Sync skipped',
        nextRetryAt: null,
        syncRunId: cycle.sync.syncRunId,
        dataQualityMonitor: cycle.dataQualityMonitor
      }
    }

    await completeOpenNotionSyncRuns({
      sourceSyncRunId: cycle.sync.syncRunId,
      triggerSource,
      metadata: {
        completedBy: executionSource,
        dataQualityMonitor: cycle.dataQualityMonitor
      }
    })

    return {
      triggered: true,
      pendingSpaces: openRuns.length,
      retriedSpaces: 0,
      blockedSpaces: 0,
      completedSpaces: openRuns.length,
      failedSpaces: 0,
      reason: 'Conformed sync converged successfully',
      nextRetryAt: null,
      syncRunId: cycle.sync.syncRunId,
      dataQualityMonitor: cycle.dataQualityMonitor
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown orchestration error'

    await failOpenNotionSyncRuns({
      triggerSource,
      message,
      metadata: {
        failedBy: executionSource
      }
    })

    return {
      triggered: false,
      pendingSpaces: openRuns.length,
      retriedSpaces: 0,
      blockedSpaces: 0,
      completedSpaces: 0,
      failedSpaces: openRuns.length,
      reason: message,
      nextRetryAt: null,
      syncRunId: null,
      dataQualityMonitor: null
    }
  }
}

export const getNotionSyncOrchestrationOverview = async ({
  limit = 20
}: {
  limit?: number
} = {}): Promise<NotionSyncOrchestrationOverview> => {
  const activeSpaces = await listActiveNotionSpaces()
  const spaceIds = activeSpaces.map(space => space.spaceId)

  if (spaceIds.length === 0) {
    return {
      integrationKey: INTEGRATION_KEY,
      pipelineKey: PIPELINE_KEY,
      generatedAt: new Date().toISOString(),
      totals: {
        totalSpaces: 0,
        openSpaces: 0,
        waitingForRaw: 0,
        retryScheduled: 0,
        retryRunning: 0,
        syncCompleted: 0,
        syncFailed: 0,
        cancelled: 0,
        unknownSpaces: 0
      },
      latestBySpace: [],
      recentRuns: []
    }
  }

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_sync.notion_sync_orchestration_runs')
    .selectAll()
    .where('integration_key', '=', INTEGRATION_KEY)
    .where('pipeline_key', '=', PIPELINE_KEY)
    .where('space_id', 'in', spaceIds)
    .orderBy('created_at', 'desc')
    .limit(Math.max(limit, spaceIds.length * 6, 30))
    .execute()

  const mappedRuns = rows.map(mapRow)
  const spaceNameById = new Map(activeSpaces.map(space => [space.spaceId, space.spaceName]))
  const clientIdBySpaceId = new Map(activeSpaces.map(space => [space.spaceId, space.clientId]))
  const latestBySpace = new Map<string, NotionSyncOrchestrationSpaceSnapshot>()

  for (const run of mappedRuns) {
    if (latestBySpace.has(run.spaceId)) continue

    latestBySpace.set(run.spaceId, {
      spaceId: run.spaceId,
      spaceName: spaceNameById.get(run.spaceId) ?? null,
      clientId: clientIdBySpaceId.get(run.spaceId) ?? null,
      orchestrationStatus: run.orchestrationStatus,
      retryAttempt: run.retryAttempt,
      nextRetryAt: run.nextRetryAt,
      waitingReason: run.waitingReason,
      updatedAt: run.updatedAt
    })
  }

  const latestRows = Array.from(latestBySpace.values()).sort((left, right) =>
    (left.spaceName ?? left.spaceId).localeCompare(right.spaceName ?? right.spaceId)
  )

  return {
    integrationKey: INTEGRATION_KEY,
    pipelineKey: PIPELINE_KEY,
    generatedAt: new Date().toISOString(),
    totals: {
      totalSpaces: activeSpaces.length,
      openSpaces: latestRows.filter(row =>
        ['waiting_for_raw', 'retry_scheduled', 'retry_running'].includes(row.orchestrationStatus)
      ).length,
      waitingForRaw: latestRows.filter(row => row.orchestrationStatus === 'waiting_for_raw').length,
      retryScheduled: latestRows.filter(row => row.orchestrationStatus === 'retry_scheduled').length,
      retryRunning: latestRows.filter(row => row.orchestrationStatus === 'retry_running').length,
      syncCompleted: latestRows.filter(row => row.orchestrationStatus === 'sync_completed').length,
      syncFailed: latestRows.filter(row => row.orchestrationStatus === 'sync_failed').length,
      cancelled: latestRows.filter(row => row.orchestrationStatus === 'cancelled').length,
      unknownSpaces: activeSpaces.length - latestRows.length
    },
    latestBySpace: latestRows,
    recentRuns: mappedRuns.slice(0, limit)
  }
}

export const getTenantNotionSyncOrchestrationDetail = async ({
  clientId,
  limit = 10
}: {
  clientId: string
  limit?: number
}): Promise<TenantNotionSyncOrchestrationDetail | null> => {
  const db = await getDb()

  const space = await db
    .selectFrom('greenhouse_core.spaces')
    .select(['space_id', 'space_name', 'client_id'])
    .where('client_id', '=', clientId)
    .where('active', '=', true)
    .orderBy('created_at', 'asc')
    .executeTakeFirst()

  if (!space) {
    return null
  }

  const rows = await db
    .selectFrom('greenhouse_sync.notion_sync_orchestration_runs')
    .selectAll()
    .where('integration_key', '=', INTEGRATION_KEY)
    .where('pipeline_key', '=', PIPELINE_KEY)
    .where('space_id', '=', space.space_id)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .execute()

  const recentRuns = rows.map(mapRow)
  const latestRun = recentRuns[0] ?? null

  const openRun = recentRuns.find(run =>
    ['waiting_for_raw', 'retry_scheduled', 'retry_running'].includes(run.orchestrationStatus)
  ) ?? null

  return {
    clientId,
    space: {
      spaceId: space.space_id,
      spaceName: space.space_name
    },
    latestRun,
    openRun,
    recentRuns
  }
}
