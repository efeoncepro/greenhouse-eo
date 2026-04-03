import 'server-only'

import { getDb } from '@/lib/db'
import type {
  NotionPublicationKey,
  NotionPublicationRun,
  SpaceNotionPublicationTarget
} from '@/types/notion-publication'

const mapTarget = (row: Record<string, unknown>): SpaceNotionPublicationTarget => ({
  targetId: row.target_id as string,
  spaceId: row.space_id as string,
  publicationKey: row.publication_key as NotionPublicationKey,
  notionWorkspaceId: row.notion_workspace_id as string | null,
  notionDatabaseId: row.notion_database_id as string | null,
  notionDataSourceId: row.notion_data_source_id as string | null,
  notionParentPageId: row.notion_parent_page_id as string | null,
  active: row.active as boolean,
  metadata: (row.metadata ?? {}) as Record<string, unknown>,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
  createdBy: row.created_by as string | null
})

const mapRun = (row: Record<string, unknown>): NotionPublicationRun => ({
  publicationRunId: row.publication_run_id as string,
  integrationKey: row.integration_key as string,
  targetId: row.target_id as string,
  spaceId: row.space_id as string,
  publicationKey: row.publication_key as NotionPublicationKey,
  reportScope: row.report_scope as string,
  periodYear: Number(row.period_year),
  periodMonth: Number(row.period_month),
  targetPageId: row.target_page_id as string | null,
  targetDatabaseId: row.target_database_id as string | null,
  payloadHash: row.payload_hash as string | null,
  source: row.source as string,
  status: row.status as NotionPublicationRun['status'],
  resultSummary: row.result_summary as string | null,
  errorMessage: row.error_message as string | null,
  startedAt: String(row.started_at),
  completedAt: row.completed_at ? String(row.completed_at) : null,
  createdBy: row.created_by as string | null,
  metadata: (row.metadata ?? {}) as Record<string, unknown>
})

export async function getSpaceNotionPublicationTarget(
  spaceId: string,
  publicationKey: NotionPublicationKey
): Promise<SpaceNotionPublicationTarget | null> {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_core.space_notion_publication_targets')
    .selectAll()
    .where('space_id', '=', spaceId)
    .where('publication_key', '=', publicationKey)
    .where('active', '=', true)
    .executeTakeFirst()

  return row ? mapTarget(row) : null
}

export async function getDefaultSpaceNotionPublicationTarget(
  publicationKey: NotionPublicationKey
): Promise<SpaceNotionPublicationTarget | null> {
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_core.space_notion_publication_targets')
    .selectAll()
    .where('publication_key', '=', publicationKey)
    .where('active', '=', true)
    .orderBy('updated_at', 'desc')
    .limit(2)
    .execute()

  if (rows.length !== 1) {
    return null
  }

  return mapTarget(rows[0])
}

export async function findSuccessfulPublicationRunByHash(params: {
  spaceId: string
  publicationKey: NotionPublicationKey
  reportScope: string
  periodYear: number
  periodMonth: number
  payloadHash: string
}): Promise<NotionPublicationRun | null> {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_sync.notion_publication_runs')
    .selectAll()
    .where('space_id', '=', params.spaceId)
    .where('publication_key', '=', params.publicationKey)
    .where('report_scope', '=', params.reportScope)
    .where('period_year', '=', params.periodYear)
    .where('period_month', '=', params.periodMonth)
    .where('payload_hash', '=', params.payloadHash)
    .where('status', '=', 'succeeded')
    .orderBy('started_at', 'desc')
    .executeTakeFirst()

  return row ? mapRun(row) : null
}

export async function createPublicationRun(params: {
  publicationRunId: string
  integrationKey: string
  targetId: string
  spaceId: string
  publicationKey: NotionPublicationKey
  reportScope: string
  periodYear: number
  periodMonth: number
  targetDatabaseId: string | null
  payloadHash: string | null
  createdBy: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const db = await getDb()

  await db
    .insertInto('greenhouse_sync.notion_publication_runs')
    .values({
      publication_run_id: params.publicationRunId,
      integration_key: params.integrationKey,
      target_id: params.targetId,
      space_id: params.spaceId,
      publication_key: params.publicationKey,
      report_scope: params.reportScope,
      period_year: params.periodYear,
      period_month: params.periodMonth,
      target_database_id: params.targetDatabaseId,
      payload_hash: params.payloadHash,
      status: 'running',
      created_by: params.createdBy,
      metadata: JSON.stringify(params.metadata ?? {}) as never
    })
    .execute()
}

export async function completePublicationRun(params: {
  publicationRunId: string
  status: 'succeeded' | 'failed' | 'skipped'
  targetPageId?: string | null
  payloadHash?: string | null
  resultSummary?: string | null
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const db = await getDb()

  await db
    .updateTable('greenhouse_sync.notion_publication_runs')
    .set({
      status: params.status,
      target_page_id: params.targetPageId ?? null,
      payload_hash: params.payloadHash ?? null,
      result_summary: params.resultSummary ?? null,
      error_message: params.errorMessage ?? null,
      completed_at: new Date().toISOString(),
      metadata: JSON.stringify(params.metadata ?? {}) as never
    })
    .where('publication_run_id', '=', params.publicationRunId)
    .execute()
}
