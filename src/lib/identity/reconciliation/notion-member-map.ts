import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'

export type NotionMemberMapSource = 'postgres_identity_profile_source_links' | 'bigquery_team_members'

export interface NotionMemberMapResult {
  readonly map: Map<string, string>
  readonly source: NotionMemberMapSource
}

interface NotionMemberMapRow extends Record<string, unknown> {
  notion_user_id: string | null
  member_id: string | null
}

const rowsToMap = (rows: readonly NotionMemberMapRow[]): Map<string, string> =>
  new Map(
    rows
      .map(row => [row.notion_user_id?.trim() || null, row.member_id?.trim() || null] as const)
      .filter((pair): pair is readonly [string, string] => Boolean(pair[0] && pair[1]))
  )

const runBigQueryRows = async <T>(query: string): Promise<T[]> => {
  const [rows] = await getBigQueryClient().query({ query })

  return rows as T[]
}

export const loadNotionMemberMapPostgresFirst = async (): Promise<NotionMemberMapResult> => {
  if (isGreenhousePostgresConfigured()) {
    try {
      const rows = await runGreenhousePostgresQuery<NotionMemberMapRow>(
        `SELECT notion_user_id, member_id
         FROM (
           SELECT
             sl.source_object_id AS notion_user_id,
             m.member_id AS member_id,
             1 AS priority
           FROM greenhouse_core.identity_profile_source_links sl
           JOIN greenhouse_core.members m
             ON m.identity_profile_id = sl.profile_id
           WHERE sl.source_system = 'notion'
             AND sl.source_object_type = 'user'
             AND sl.active = TRUE
           UNION ALL
           SELECT
             m.notion_user_id AS notion_user_id,
             m.member_id AS member_id,
             2 AS priority
           FROM greenhouse_core.members m
           WHERE m.notion_user_id IS NOT NULL
         ) mapped
         WHERE notion_user_id IS NOT NULL
           AND member_id IS NOT NULL
         ORDER BY notion_user_id, priority`
      )

      const map = rowsToMap(rows)

      if (map.size > 0) {
        return { map, source: 'postgres_identity_profile_source_links' }
      }
    } catch (error) {
      console.warn(
        '[identity-reconciliation] Could not load Notion member map from Postgres; falling back to BigQuery:',
        error instanceof Error ? error.message : error
      )
    }
  }

  const projectId = getBigQueryProjectId()

  const rows = await runBigQueryRows<NotionMemberMapRow>(`
    SELECT notion_user_id, member_id
    FROM \`${projectId}.greenhouse.team_members\`
    WHERE notion_user_id IS NOT NULL
  `)

  return { map: rowsToMap(rows), source: 'bigquery_team_members' }
}
