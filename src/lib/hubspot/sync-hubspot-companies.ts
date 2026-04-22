import 'server-only'

import { randomUUID } from 'node:crypto'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import {
  createPartyFromHubSpotCompany,
  instantiateClientForParty,
  promoteParty,
  resolveHubSpotStage,
  type LifecycleStage
} from '@/lib/commercial/party'

const SOURCE_SYSTEM = 'hubspot'
const SOURCE_OBJECT_TYPE = 'companies_party'
const WATERMARK_KEY = 'last_source_updated_at'

const SUPPORTED_HUBSPOT_STAGES = new Set([
  'lead',
  'marketingqualifiedlead',
  'salesqualifiedlead',
  'opportunity',
  'customer',
  'evangelist'
])

const PROTECTED_LOCAL_STAGES = new Set<LifecycleStage>([
  'provider_only',
  'disqualified',
  'churned'
])

const LIFECYCLE_RANK: Record<LifecycleStage, number> = {
  prospect: 0,
  opportunity: 1,
  active_client: 2,
  inactive: 1,
  provider_only: 0,
  churned: -1,
  disqualified: -2
}

interface HubSpotCompanySourceRow {
  hubspot_company_id: string
  company_name: string
  legal_name: string | null
  lifecycle_stage: string | null
  source_updated_at: Date | string | null
  synced_at: Date | string
  updated_at: Date | string
}

interface ExistingOrganizationRow {
  organization_id: string
  lifecycle_stage: string
}

export interface HubSpotCompaniesSyncOptions {
  dryRun?: boolean
  fullResync?: boolean
}

export interface HubSpotCompaniesSyncSummary {
  enabled: boolean
  dryRun: boolean
  fullResync: boolean
  runId: string | null
  watermarkStart: string | null
  watermarkEnd: string | null
  processed: number
  created: number
  promoted: number
  clientsInstantiated: number
  skipped: number
  errors: string[]
}

const actor = { system: true, reason: 'hubspot_companies_sync' } as const

const toIso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const getSourceTimestamp = (row: HubSpotCompanySourceRow): string | null =>
  toIso(row.source_updated_at) ?? toIso(row.synced_at) ?? toIso(row.updated_at)

const isSupportedHubSpotStage = (value: string | null | undefined): boolean => {
  const normalized = value?.trim().toLowerCase() ?? ''

  return normalized.length === 0 || SUPPORTED_HUBSPOT_STAGES.has(normalized)
}

const shouldPromote = (currentStage: LifecycleStage, targetStage: LifecycleStage): boolean => {
  if (currentStage === targetStage) return false
  if (PROTECTED_LOCAL_STAGES.has(currentStage)) return false

  return LIFECYCLE_RANK[targetStage] > LIFECYCLE_RANK[currentStage]
}

const getWatermark = async () => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_sync.source_sync_watermarks')
    .select(['watermark_value'])
    .where('source_system', '=', SOURCE_SYSTEM)
    .where('source_object_type', '=', SOURCE_OBJECT_TYPE)
    .where('watermark_key', '=', WATERMARK_KEY)
    .executeTakeFirst()

  return row?.watermark_value ?? null
}

const listSourceRows = async ({
  watermark,
  fullResync
}: {
  watermark: string | null
  fullResync: boolean
}) => {
  const db = await getDb()
  let rowsQuery = db
    .selectFrom('greenhouse_crm.companies')
    .select([
      'hubspot_company_id',
      'company_name',
      'legal_name',
      'lifecycle_stage',
      'source_updated_at',
      'synced_at',
      'updated_at'
    ])
    .where('active', '=', true)
    .where('is_deleted', '=', false)
    .where('hubspot_company_id', 'is not', null)

  if (!fullResync && watermark) {
    const watermarkDate = new Date(watermark)

    if (!Number.isNaN(watermarkDate.getTime())) {
      rowsQuery = rowsQuery.where(
        sql<boolean>`COALESCE(source_updated_at, synced_at, updated_at) > ${watermarkDate}`
      )
    }
  }

  const rows = await rowsQuery
    .orderBy(sql`COALESCE(source_updated_at, synced_at, updated_at) ASC`)
    .orderBy('hubspot_company_id', 'asc')
    .execute()

  return rows.filter(row => isSupportedHubSpotStage(row.lifecycle_stage))
}

const getExistingOrganization = async (hubspotCompanyId: string): Promise<ExistingOrganizationRow | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_core.organizations')
    .select(['organization_id', 'lifecycle_stage'])
    .where('hubspot_company_id', '=', hubspotCompanyId)
    .executeTakeFirst()

  return row ?? null
}

const writeSyncRunStart = async ({
  runId,
  dryRun,
  fullResync,
  watermarkStart
}: {
  runId: string
  dryRun: boolean
  fullResync: boolean
  watermarkStart: string | null
}) => {
  const db = await getDb()

  await db
    .insertInto('greenhouse_sync.source_sync_runs')
    .values({
      sync_run_id: runId,
      source_system: SOURCE_SYSTEM,
      source_object_type: SOURCE_OBJECT_TYPE,
      sync_mode: fullResync ? 'full' : 'incremental',
      status: 'running',
      triggered_by: dryRun ? 'hubspot_companies_sync:dry_run' : 'hubspot_companies_sync',
      watermark_key: WATERMARK_KEY,
      watermark_start_value: watermarkStart,
      notes: dryRun ? 'dry-run' : null
    })
    .execute()
}

const finalizeSyncRun = async ({
  runId,
  summary,
  status
}: {
  runId: string
  summary: HubSpotCompaniesSyncSummary
  status: 'succeeded' | 'failed' | 'partial'
}) => {
  const db = await getDb()

  await db
    .updateTable('greenhouse_sync.source_sync_runs')
    .set({
      status,
      records_read: summary.processed,
      records_projected_postgres: summary.created + summary.promoted + summary.clientsInstantiated,
      watermark_end_value: summary.watermarkEnd,
      notes:
        `created=${summary.created} promoted=${summary.promoted} ` +
        `clientsInstantiated=${summary.clientsInstantiated} skipped=${summary.skipped} ` +
        `errors=${summary.errors.length}${summary.dryRun ? ' dry-run' : ''}`,
      finished_at: sql`CURRENT_TIMESTAMP`
    })
    .where('sync_run_id', '=', runId)
    .execute()
}

const persistWatermark = async ({
  runId,
  watermark
}: {
  runId: string
  watermark: string
}) => {
  const db = await getDb()

  await db
    .insertInto('greenhouse_sync.source_sync_watermarks')
    .values({
      watermark_id: `wm-${SOURCE_SYSTEM}-${SOURCE_OBJECT_TYPE}-${WATERMARK_KEY}`,
      source_system: SOURCE_SYSTEM,
      source_object_type: SOURCE_OBJECT_TYPE,
      watermark_key: WATERMARK_KEY,
      watermark_value: watermark,
      watermark_updated_at: new Date(watermark),
      sync_run_id: runId
    })
    .onConflict(oc => oc
      .columns(['source_system', 'source_object_type', 'watermark_key'])
      .doUpdateSet({
        watermark_value: watermark,
        watermark_updated_at: new Date(watermark),
        sync_run_id: runId,
        updated_at: sql`CURRENT_TIMESTAMP`
      }))
    .execute()
}

export const syncHubSpotCompanies = async (
  options: HubSpotCompaniesSyncOptions = {}
): Promise<HubSpotCompaniesSyncSummary> => {
  const dryRun = options.dryRun ?? false
  const fullResync = options.fullResync ?? false
  const watermarkStart = fullResync ? null : await getWatermark()
  const runId = `hubspot-companies-${randomUUID()}`

  const summary: HubSpotCompaniesSyncSummary = {
    enabled: true,
    dryRun,
    fullResync,
    runId,
    watermarkStart,
    watermarkEnd: null,
    processed: 0,
    created: 0,
    promoted: 0,
    clientsInstantiated: 0,
    skipped: 0,
    errors: []
  }

  await writeSyncRunStart({ runId, dryRun, fullResync, watermarkStart })

  try {
    const sourceRows = await listSourceRows({ watermark: watermarkStart, fullResync })

    for (const row of sourceRows) {
      summary.processed += 1
      summary.watermarkEnd = getSourceTimestamp(row) ?? summary.watermarkEnd

      try {
        const targetStage = resolveHubSpotStage(row.lifecycle_stage, {
          unknownFallback: 'prospect'
        })

        const existingOrganization = await getExistingOrganization(row.hubspot_company_id)

        if (!existingOrganization) {
          if (dryRun) {
            summary.created += 1

            if (targetStage === 'active_client') {
              summary.clientsInstantiated += 1
            }

            continue
          }

          const party = await createPartyFromHubSpotCompany({
            hubspotCompanyId: row.hubspot_company_id,
            hubspotLifecycleStage: row.lifecycle_stage,
            defaultName: row.legal_name ?? row.company_name,
            actor
          })

          summary.created += 1

          if (targetStage === 'active_client') {
            await instantiateClientForParty({
              organizationId: party.organizationId,
              triggerEntity: {
                type: 'manual',
                id: `hubspot-company:${row.hubspot_company_id}`
              },
              actor
            })

            summary.clientsInstantiated += 1
          }

          continue
        }

        const currentStage = existingOrganization.lifecycle_stage as LifecycleStage

        if (!shouldPromote(currentStage, targetStage)) {
          summary.skipped += 1
          continue
        }

        if (dryRun) {
          summary.promoted += 1
          continue
        }

        await promoteParty({
          organizationId: existingOrganization.organization_id,
          toStage: targetStage,
          source: 'hubspot_sync',
          actor,
          triggerEntity: {
            type: 'manual',
            id: `hubspot-company:${row.hubspot_company_id}`
          },
          metadata: {
            hubspotCompanyId: row.hubspot_company_id,
            hubspotLifecycleStage: row.lifecycle_stage,
            sourceUpdatedAt: getSourceTimestamp(row)
          }
        })

        summary.promoted += 1
      } catch (error) {
        summary.errors.push(
          `${row.hubspot_company_id}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    const finalStatus =
      summary.errors.length > 0 && summary.processed > 0
        ? 'partial'
        : summary.errors.length > 0
          ? 'failed'
          : 'succeeded'

    if (!dryRun && finalStatus === 'succeeded' && summary.watermarkEnd) {
      await persistWatermark({ runId, watermark: summary.watermarkEnd })
    }

    await finalizeSyncRun({ runId, summary, status: finalStatus })

    return summary
  } catch (error) {
    summary.errors.push(error instanceof Error ? error.message : String(error))

    await finalizeSyncRun({ runId, summary, status: 'failed' })

    return summary
  }
}
