import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { DiscoveredIdentity } from './types'
import { isUuidAsName } from './normalize'

// ── Raw Notion user from BigQuery ─────────────────────────────────────

interface RawNotionUser {
  source_object_id: string
  source_display_name: string | null
  text_display_name: string | null
  occurrence_count: number
}

interface LinkedNotionIdRow extends Record<string, unknown> {
  source_object_id: string
}

// ── Discovery ─────────────────────────────────────────────────────────

/**
 * Discover Notion user IDs present in task data that are NOT yet linked
 * to a team member or already proposed in the reconciliation queue.
 */
export async function discoverUnlinkedNotionUsers(): Promise<DiscoveredIdentity[]> {
  const bq = getBigQueryClient()
  const projectId = getBigQueryProjectId()

  // 1. All unique Notion person IDs + display names from task responsables.
  //    responsables_names often stores UUIDs for external/guest users.
  //    responsable_texto has the real comma-separated names. We extract
  //    the positional name by matching the UUID's position in the
  //    responsables comma-separated field against responsable_texto.
  const [allUsersRows] = await bq.query({
    query: `
      WITH raw AS (
        SELECT
          rid AS source_object_id,
          rname AS source_display_name,
          -- Extract positional name from responsable_texto
          -- responsables = "uuid1, uuid2", responsable_texto = "Name1, Name2"
          CASE
            WHEN t.responsable_texto IS NOT NULL AND t.responsables IS NOT NULL
            THEN TRIM(SPLIT(t.responsable_texto, ',')[SAFE_OFFSET(idx)])
            ELSE NULL
          END AS text_display_name
        FROM (
          SELECT
            *,
            CASE
              WHEN ARRAY_LENGTH(IFNULL(responsables_ids, ARRAY<STRING>[])) > 0 THEN IFNULL(responsables_ids, ARRAY<STRING>[])
              ELSE IFNULL(responsable_ids, ARRAY<STRING>[])
            END AS normalized_assignee_ids,
            CASE
              WHEN ARRAY_LENGTH(IFNULL(responsables_names, ARRAY<STRING>[])) > 0 THEN IFNULL(responsables_names, ARRAY<STRING>[])
              ELSE IFNULL(responsable_names, ARRAY<STRING>[])
            END AS normalized_assignee_names
          FROM \`${projectId}.notion_ops.tareas\`
        ) t,
             UNNEST(t.normalized_assignee_ids) AS rid WITH OFFSET idx
        LEFT JOIN UNNEST(t.normalized_assignee_names) AS rname WITH OFFSET nidx
          ON idx = nidx
        WHERE rid IS NOT NULL AND TRIM(rid) != ''
      )
      SELECT
        source_object_id,
        ANY_VALUE(source_display_name) AS source_display_name,
        ANY_VALUE(text_display_name) AS text_display_name,
        COUNT(*) AS occurrence_count
      FROM raw
      GROUP BY source_object_id
    `
  }) as [RawNotionUser[], unknown]

  if (allUsersRows.length === 0) return []

  // 2. Already-linked Notion IDs in team_members
  const [linkedRows] = await bq.query({
    query: `
      SELECT DISTINCT notion_user_id AS source_object_id
      FROM \`${projectId}.greenhouse.team_members\`
      WHERE notion_user_id IS NOT NULL AND TRIM(notion_user_id) != ''
    `
  }) as [LinkedNotionIdRow[], unknown]

  const linkedIds = new Set(linkedRows.map(r => r.source_object_id))

  try {
    const [identityLinkRows] = await bq.query({
      query: `
        SELECT DISTINCT source_object_id
        FROM \`${projectId}.greenhouse.identity_profile_source_links\`
        WHERE active = TRUE
          AND source_system = 'notion'
          AND source_object_id IS NOT NULL
          AND TRIM(source_object_id) != ''
      `
    }) as [LinkedNotionIdRow[], unknown]

    for (const row of identityLinkRows) {
      if (row.source_object_id) {
        linkedIds.add(row.source_object_id)
      }
    }
  } catch {
    // BigQuery identity links may not exist yet in all environments.
  }

  try {
    const postgresLinkedRows = await runGreenhousePostgresQuery<LinkedNotionIdRow>(
      `SELECT DISTINCT source_object_id
       FROM (
         SELECT notion_user_id AS source_object_id
         FROM greenhouse_core.members
         WHERE notion_user_id IS NOT NULL
           AND TRIM(notion_user_id) != ''

         UNION

         SELECT source_object_id
         FROM greenhouse_core.identity_profile_source_links
         WHERE active = TRUE
           AND source_system = 'notion'
           AND source_object_id IS NOT NULL
           AND TRIM(source_object_id) != ''
       ) linked`
    )

    for (const row of postgresLinkedRows) {
      if (row.source_object_id) {
        linkedIds.add(row.source_object_id)
      }
    }
  } catch {
    // Postgres may not be available; BigQuery-linked IDs remain the fallback.
  }

  // 3. Already-active proposals in Postgres (skip re-proposing)
  let activeProposalIds = new Set<string>()

  try {
    const proposalRows = await runGreenhousePostgresQuery<{ source_object_id: string }>(`
      SELECT source_object_id
      FROM greenhouse_sync.identity_reconciliation_proposals
      WHERE source_system = 'notion'
        AND status IN ('pending', 'auto_linked', 'dismissed')
    `)

    activeProposalIds = new Set(proposalRows.map(r => r.source_object_id))
  } catch {
    // Table may not exist yet; proceed without exclusion
  }

  // 4. Filter to unlinked + unproposed, prefer text name over UUID-as-name
  return allUsersRows
    .filter(r => !linkedIds.has(r.source_object_id) && !activeProposalIds.has(r.source_object_id))
    .map(r => {
      // When responsables_names has the UUID echoed back, fall back to
      // the positional name extracted from responsable_texto
      const apiName = r.source_display_name

      const displayName = isUuidAsName(apiName) && r.text_display_name
        ? r.text_display_name
        : apiName

      return {
        sourceSystem: 'notion' as const,
        sourceObjectType: 'person',
        sourceObjectId: r.source_object_id,
        sourceDisplayName: displayName || null,
        sourceEmail: null,
        discoveredIn: 'notion_ops.tareas.assignee_ids',
        occurrenceCount: Number(r.occurrence_count)
      }
    })
}
