import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

type TimestampValue = { value?: string } | string | null | undefined

interface BigQueryFreshnessRow {
  space_id: string | null
  last_synced_at: TimestampValue
}

interface PostgresFreshnessRow extends Record<string, unknown> {
  space_id: string
  last_synced_at: string | null
}

const toIsoString = (value: TimestampValue): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value || null

  return typeof value.value === 'string' ? value.value : null
}

const buildSpaceFilter = (column: string, spaceIds: string[] | null | undefined) => {
  if (!spaceIds || spaceIds.length === 0) return ''

  const escaped = spaceIds.map(spaceId => `'${spaceId.replace(/'/g, "''")}'`).join(', ')

  return ` AND ${column} IN (${escaped})`
}

export const getNotionFreshnessFromBigQuery = async (
  spaceIds: string[] | null = null
): Promise<Map<string, string>> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()
  const filter = buildSpaceFilter('space_id', spaceIds)

  const [rows] = await bq.query({
    query: `
      SELECT
        space_id,
        MAX(last_synced_at) AS last_synced_at
      FROM \`${projectId}.greenhouse.space_notion_sources\`
      WHERE sync_enabled = TRUE
        AND last_synced_at IS NOT NULL${filter}
      GROUP BY space_id
    `
  })

  const freshness = new Map<string, string>()

  for (const row of rows as BigQueryFreshnessRow[]) {
    if (!row.space_id) continue

    const syncedAt = toIsoString(row.last_synced_at)

    if (syncedAt) {
      freshness.set(row.space_id, syncedAt)
    }
  }

  return freshness
}

export const getEffectiveNotionFreshnessForSpaces = async (
  spaceIds: string[]
): Promise<Map<string, string>> => {
  if (spaceIds.length === 0) {
    return new Map()
  }

  const escaped = spaceIds.map(spaceId => `'${spaceId.replace(/'/g, "''")}'`).join(', ')

  const pgRows = await runGreenhousePostgresQuery<PostgresFreshnessRow>(
    `SELECT space_id, last_synced_at::text AS last_synced_at
     FROM greenhouse_core.space_notion_sources
     WHERE space_id IN (${escaped})`
  )

  const effective = new Map<string, string>()
  const missing: string[] = []

  for (const row of pgRows) {
    if (row.last_synced_at) {
      effective.set(row.space_id, row.last_synced_at)
    } else {
      missing.push(row.space_id)
    }
  }

  for (const spaceId of spaceIds) {
    if (!effective.has(spaceId) && !missing.includes(spaceId)) {
      missing.push(spaceId)
    }
  }

  if (missing.length === 0) {
    return effective
  }

  const bqFreshness = await getNotionFreshnessFromBigQuery(missing)

  for (const [spaceId, syncedAt] of bqFreshness.entries()) {
    if (!effective.has(spaceId)) {
      effective.set(spaceId, syncedAt)
    }
  }

  return effective
}

export const getEffectiveLatestNotionSyncAt = async (): Promise<string | null> => {
  const [pgRow] = await runGreenhousePostgresQuery<{ last_sync: string | null } & Record<string, unknown>>(
    `SELECT MAX(last_synced_at)::text AS last_sync
     FROM greenhouse_core.space_notion_sources
     WHERE sync_enabled = TRUE`
  )

  const pgLastSync = pgRow?.last_sync ?? null
  const bqFreshness = await getNotionFreshnessFromBigQuery()
  const bqLastSync = [...bqFreshness.values()].sort().at(-1) ?? null

  if (!pgLastSync) return bqLastSync
  if (!bqLastSync) return pgLastSync

  return new Date(pgLastSync) > new Date(bqLastSync) ? pgLastSync : bqLastSync
}

export const reconcileNotionFreshnessToPostgres = async (
  spaceIds: string[] | null = null
): Promise<{ candidateSpaces: number; updatedSpaces: number }> => {
  const bqFreshness = await getNotionFreshnessFromBigQuery(spaceIds)

  if (bqFreshness.size === 0) {
    return { candidateSpaces: 0, updatedSpaces: 0 }
  }

  const params: unknown[] = []

  const valuesSql = [...bqFreshness.entries()]
    .map(([spaceId, syncedAt], index) => {
      const base = index * 2

      params.push(spaceId, syncedAt)

      return `($${base + 1}, $${base + 2}::timestamptz)`
    })
    .join(', ')

  const updatedRows = await runGreenhousePostgresQuery<{ space_id: string } & Record<string, unknown>>(
    `WITH incoming (space_id, last_synced_at) AS (
       VALUES ${valuesSql}
     )
     UPDATE greenhouse_core.space_notion_sources sns
        SET last_synced_at = incoming.last_synced_at,
            updated_at = NOW()
       FROM incoming
      WHERE sns.space_id = incoming.space_id
        AND sns.sync_enabled = TRUE
        AND (
          sns.last_synced_at IS NULL
          OR sns.last_synced_at < incoming.last_synced_at
        )
    RETURNING sns.space_id`,
    params
  )

  return {
    candidateSpaces: bqFreshness.size,
    updatedSpaces: updatedRows.length
  }
}
