import 'server-only'

import { createHash } from 'node:crypto'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishPeriodMaterializedEvent } from '@/lib/sync/publish-event'
import { materializeCommercialCostAttributionForPeriod } from '@/lib/commercial-cost-attribution/member-period-attribution'
import { materializeProviderToolingSnapshotsForPeriod } from '@/lib/providers/provider-tooling-snapshots'
import { materializeToolProviderCostBasisSnapshotsForPeriod } from '@/lib/commercial-cost-basis/tool-provider-cost-basis'
import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'
import { materializeMemberCapacityEconomicsForPeriod } from '@/lib/sync/projections/member-capacity-economics'

import {
  generateCommercialCostBasisRunId,
  writeCommercialCostBasisRunComplete,
  writeCommercialCostBasisRunFailure,
  writeCommercialCostBasisRunStart
} from './run-tracker'
import {
  getCommercialCostBasisPeriodId,
  normalizeCommercialCostBasisRequest,
  resolveCommercialCostBasisPeriods,
  type CommercialCostBasisPeriod,
  type CommercialCostBasisPeriodResult,
  type CommercialCostBasisRequest,
  type CommercialCostBasisRunResult,
  type CommercialCostBasisScope,
  type CommercialCostBasisTenantScope
} from './contracts'

const ENGINE_VERSION = 'task-483.v1'

const buildSnapshotKey = ({
  scope,
  periodId,
  runId,
  tenantScope
}: {
  scope: CommercialCostBasisScope
  periodId: string
  runId: string
  tenantScope: CommercialCostBasisTenantScope
}) => {
  const scopeKey =
    tenantScope.spaceId ??
    tenantScope.clientId ??
    tenantScope.organizationId ??
    'global'

  return `ccb:${scope}:${periodId}:${scopeKey}:${runId}`
}

const hashInput = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')

const writeSnapshotStart = async ({
  snapshotKey,
  runId,
  request,
  period
}: {
  snapshotKey: string
  runId: string
  request: CommercialCostBasisRequest
  period: CommercialCostBasisPeriod
}) => {
  const db = await getDb()

  const manifest = {
    scope: request.scope,
    triggerSource: request.triggerSource,
    triggeredBy: request.triggeredBy,
    periodId: period.periodId,
    tenantScope: request.tenantScope,
    recomputeEconomics: request.recomputeEconomics,
    notes: request.notes
  }

  await sql`
    INSERT INTO greenhouse_commercial.commercial_cost_basis_snapshots (
      snapshot_key,
      source_sync_run_id,
      basis_scope,
      status,
      period_year,
      period_month,
      period_id,
      organization_id,
      space_id,
      client_id,
      engine_version,
      trigger_source,
      triggered_by,
      input_hash,
      input_manifest_json,
      summary_jsonb,
      started_at,
      updated_at
    ) VALUES (
      ${snapshotKey},
      ${runId},
      ${request.scope},
      'running',
      ${period.year},
      ${period.month},
      ${period.periodId},
      ${request.tenantScope.organizationId ?? null},
      ${request.tenantScope.spaceId ?? null},
      ${request.tenantScope.clientId ?? null},
      ${ENGINE_VERSION},
      ${request.triggerSource},
      ${request.triggeredBy},
      ${hashInput(manifest)},
      ${JSON.stringify(manifest)}::jsonb,
      ${JSON.stringify({ status: 'running' })}::jsonb,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (snapshot_key)
    DO UPDATE SET
      status = EXCLUDED.status,
      trigger_source = EXCLUDED.trigger_source,
      triggered_by = EXCLUDED.triggered_by,
      input_hash = EXCLUDED.input_hash,
      input_manifest_json = EXCLUDED.input_manifest_json,
      summary_jsonb = EXCLUDED.summary_jsonb,
      updated_at = CURRENT_TIMESTAMP
  `.execute(db)
}

const writeSnapshotComplete = async ({
  snapshotKey,
  result
}: {
  snapshotKey: string
  result: CommercialCostBasisPeriodResult
}) => {
  const db = await getDb()

  await sql`
    UPDATE greenhouse_commercial.commercial_cost_basis_snapshots
       SET status = ${result.status},
           records_read = ${result.recordsRead},
           records_written = ${result.recordsWritten},
           records_failed = ${result.recordsFailed},
           summary_jsonb = ${JSON.stringify(result.summary)}::jsonb,
           finished_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
     WHERE snapshot_key = ${snapshotKey}
  `.execute(db)
}

const writeSnapshotFailure = async ({
  snapshotKey,
  message
}: {
  snapshotKey: string
  message: string
}) => {
  const db = await getDb()

  await sql`
    UPDATE greenhouse_commercial.commercial_cost_basis_snapshots
       SET status = 'failed',
           records_failed = GREATEST(records_failed, 1),
           summary_jsonb = ${JSON.stringify({ error: message.slice(0, 500) })}::jsonb,
           finished_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
     WHERE snapshot_key = ${snapshotKey}
  `.execute(db)
}

const publishCommercialCostBasisEvent = async ({
  scope,
  period,
  snapshotCount,
  payload
}: {
  scope: Extract<CommercialCostBasisScope, 'people' | 'tools' | 'bundle'>
  period: CommercialCostBasisPeriod
  snapshotCount: number
  payload: Record<string, unknown>
}) => {
  const eventType =
    scope === 'people'
      ? EVENT_TYPES.commercialCostBasisPeoplePeriodMaterialized
      : scope === 'tools'
        ? EVENT_TYPES.commercialCostBasisToolsPeriodMaterialized
        : EVENT_TYPES.commercialCostBasisBundlePeriodMaterialized

  await publishPeriodMaterializedEvent({
    aggregateType: AGGREGATE_TYPES.commercialCostBasis,
    aggregateId: `${scope}:${period.periodId}`,
    eventType,
    periodId: period.periodId,
    snapshotCount,
    payload: {
      scope,
      periodYear: period.year,
      periodMonth: period.month,
      ...payload
    }
  })
}

const materializePeopleScope = async (period: CommercialCostBasisPeriod) => {
  const refreshedMembers = await materializeMemberCapacityEconomicsForPeriod({
    year: period.year,
    month: period.month
  })

  await publishCommercialCostBasisEvent({
    scope: 'people',
    period,
    snapshotCount: refreshedMembers,
    payload: {
      refreshedMembers
    }
  })

  return {
    recordsRead: refreshedMembers,
    recordsWritten: refreshedMembers,
    recordsFailed: 0,
    eventsPublished: 1,
    summary: {
      refreshedMembers
    }
  }
}

const materializeToolsScope = async (
  period: CommercialCostBasisPeriod,
  reason: string,
  tenantScope: CommercialCostBasisTenantScope
) => {
  const snapshots = await materializeProviderToolingSnapshotsForPeriod(period.year, period.month, reason)

  const toolProviderSnapshots = await materializeToolProviderCostBasisSnapshotsForPeriod(period.year, period.month, {
    reason,
    tenantScope
  })

  await publishCommercialCostBasisEvent({
    scope: 'tools',
    period,
    snapshotCount: toolProviderSnapshots.length,
    payload: {
      providerSnapshots: snapshots.length,
      toolProviderSnapshots: toolProviderSnapshots.length
    }
  })

  return {
    recordsRead: snapshots.length + toolProviderSnapshots.length,
    recordsWritten: snapshots.length + toolProviderSnapshots.length,
    recordsFailed: 0,
    eventsPublished: 1,
    summary: {
      providerSnapshots: snapshots.length,
      toolProviderSnapshots: toolProviderSnapshots.length
    }
  }
}

const materializeBundleScope = async (period: CommercialCostBasisPeriod, request: CommercialCostBasisRequest) => {
  const people = await materializePeopleScope(period)
  const tools = await materializeToolsScope(period, `${request.triggerSource}:bundle`, request.tenantScope)

  const attribution = await materializeCommercialCostAttributionForPeriod(
    period.year,
    period.month,
    `${request.triggerSource}:bundle`
  )

  const economicsRecomputed = request.recomputeEconomics
    ? (await computeClientEconomicsSnapshots(
        period.year,
        period.month,
        `${request.triggerSource}:bundle`
      )).length
    : 0

  await publishCommercialCostBasisEvent({
    scope: 'bundle',
    period,
    snapshotCount: people.recordsWritten + tools.recordsWritten + attribution.replaced + economicsRecomputed,
    payload: {
      refreshedMembers: people.recordsWritten,
      providerSnapshots: Number(tools.summary.providerSnapshots ?? 0),
      toolProviderSnapshots: Number(tools.summary.toolProviderSnapshots ?? 0),
      attributedAllocations: attribution.replaced,
      economicsRecomputed
    }
  })

  return {
    recordsRead: people.recordsRead + tools.recordsRead + attribution.replaced,
    recordsWritten: people.recordsWritten + tools.recordsWritten + attribution.replaced + economicsRecomputed,
    recordsFailed: 0,
    eventsPublished: people.eventsPublished + tools.eventsPublished + 1,
    summary: {
      refreshedMembers: people.recordsWritten,
      providerSnapshots: Number(tools.summary.providerSnapshots ?? 0),
      toolProviderSnapshots: Number(tools.summary.toolProviderSnapshots ?? 0),
      attributedAllocations: attribution.replaced,
      economicsRecomputed
    }
  }
}

const materializeScopeForPeriod = async (request: CommercialCostBasisRequest, period: CommercialCostBasisPeriod) => {
  switch (request.scope) {
    case 'people':
      return materializePeopleScope(period)
    case 'tools':
      return materializeToolsScope(period, request.triggerSource, request.tenantScope)
    case 'bundle':
      return materializeBundleScope(period, request)
    case 'roles':
      throw new Error('Role cost basis materialization is reserved for TASK-477 and not implemented yet.')
  }
}

export const runCommercialCostBasisMaterialization = async (
  request: CommercialCostBasisRequest
): Promise<CommercialCostBasisRunResult> => {
  const runId = generateCommercialCostBasisRunId()
  const periods = resolveCommercialCostBasisPeriods(request)
  const startedAt = Date.now()

  await writeCommercialCostBasisRunStart({
    runId,
    scope: request.scope,
    periods,
    triggeredBy: request.triggeredBy,
    tenantScope: request.tenantScope,
    notes: request.notes
  })

  try {
    const periodResults: CommercialCostBasisPeriodResult[] = []

    for (const period of periods) {
      const snapshotKey = buildSnapshotKey({
        scope: request.scope,
        periodId: period.periodId,
        runId,
        tenantScope: request.tenantScope
      })

      await writeSnapshotStart({ snapshotKey, runId, request, period })

      const periodStartedAt = Date.now()

      try {
        const result = await materializeScopeForPeriod(request, period)
        const status = result.recordsFailed > 0 ? 'partial' : 'succeeded'

        const periodResult: CommercialCostBasisPeriodResult = {
          periodId: period.periodId,
          year: period.year,
          month: period.month,
          scope: request.scope,
          status,
          snapshotKey,
          recordsRead: result.recordsRead,
          recordsWritten: result.recordsWritten,
          recordsFailed: result.recordsFailed,
          eventsPublished: result.eventsPublished,
          durationMs: Date.now() - periodStartedAt,
          summary: result.summary
        }

        await writeSnapshotComplete({ snapshotKey, result: periodResult })
        periodResults.push(periodResult)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'

        await writeSnapshotFailure({ snapshotKey, message })

        periodResults.push({
          periodId: period.periodId,
          year: period.year,
          month: period.month,
          scope: request.scope,
          status: 'failed',
          snapshotKey,
          recordsRead: 0,
          recordsWritten: 0,
          recordsFailed: 1,
          eventsPublished: 0,
          durationMs: Date.now() - periodStartedAt,
          summary: {
            error: message
          }
        })
      }
    }

    const recordsRead = periodResults.reduce((sum, period) => sum + period.recordsRead, 0)
    const recordsWritten = periodResults.reduce((sum, period) => sum + period.recordsWritten, 0)
    const recordsFailed = periodResults.reduce((sum, period) => sum + period.recordsFailed, 0)
    const eventsPublished = periodResults.reduce((sum, period) => sum + period.eventsPublished, 0)
    const status = recordsFailed > 0 && recordsWritten > 0 ? 'partial' : recordsFailed > 0 ? 'failed' : 'succeeded'

    const runResult: CommercialCostBasisRunResult = {
      runId,
      scope: request.scope,
      periods: periodResults,
      status,
      durationMs: Date.now() - startedAt,
      periodsProcessed: periodResults.length,
      recordsRead,
      recordsWritten,
      recordsFailed,
      eventsPublished
    }

    await writeCommercialCostBasisRunComplete({
      runId,
      scope: request.scope,
      periods,
      result: runResult
    })

    return runResult
  } catch (error) {
    await writeCommercialCostBasisRunFailure({
      runId,
      scope: request.scope,
      periods,
      error
    })

    throw error
  }
}

export {
  normalizeCommercialCostBasisRequest,
  type CommercialCostBasisScope,
  type CommercialCostBasisRunResult,
  type CommercialCostBasisRequest
}

export const buildCommercialCostBasisPeriod = (year: number, month: number): CommercialCostBasisPeriod => ({
  year,
  month,
  periodId: getCommercialCostBasisPeriodId(year, month)
})
