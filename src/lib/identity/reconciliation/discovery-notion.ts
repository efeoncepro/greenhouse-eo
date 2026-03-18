import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { DiscoveredIdentity } from './types'

// ── Raw Notion user from BigQuery ─────────────────────────────────────

interface RawNotionUser {
  source_object_id: string
  source_display_name: string | null
  occurrence_count: number
}

// ── Discovery ─────────────────────────────────────────────────────────

/**
 * Discover Notion user IDs present in task data that are NOT yet linked
 * to a team member or already proposed in the reconciliation queue.
 */
export async function discoverUnlinkedNotionUsers(): Promise<DiscoveredIdentity[]> {
  const bq = getBigQueryClient()
  const projectId = getBigQueryProjectId()

  // 1. All unique Notion person IDs + display names from task responsables
  const [allUsersRows] = await bq.query({
    query: `
      SELECT
        rid AS source_object_id,
        ANY_VALUE(rname) AS source_display_name,
        COUNT(*) AS occurrence_count
      FROM \`${projectId}.notion_ops.tareas\` t,
           UNNEST(COALESCE(t.responsables_ids, t.responsable_ids, ARRAY<STRING>[])) AS rid WITH OFFSET idx
      LEFT JOIN UNNEST(COALESCE(t.responsables_names, t.responsable_names, ARRAY<STRING>[])) AS rname WITH OFFSET nidx
        ON idx = nidx
      WHERE rid IS NOT NULL AND TRIM(rid) != ''
      GROUP BY rid
    `
  }) as [RawNotionUser[], unknown]

  if (allUsersRows.length === 0) return []

  // 2. Already-linked Notion IDs in team_members
  const [linkedRows] = await bq.query({
    query: `
      SELECT DISTINCT notion_user_id
      FROM \`${projectId}.greenhouse.team_members\`
      WHERE notion_user_id IS NOT NULL AND TRIM(notion_user_id) != ''
    `
  }) as [{ notion_user_id: string }[], unknown]

  const linkedIds = new Set(linkedRows.map(r => r.notion_user_id))

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

  // 4. Filter to unlinked + unproposed
  return allUsersRows
    .filter(r => !linkedIds.has(r.source_object_id) && !activeProposalIds.has(r.source_object_id))
    .map(r => ({
      sourceSystem: 'notion' as const,
      sourceObjectType: 'person',
      sourceObjectId: r.source_object_id,
      sourceDisplayName: r.source_display_name || null,
      sourceEmail: null,
      discoveredIn: 'notion_ops.tareas.responsables_ids',
      occurrenceCount: Number(r.occurrence_count)
    }))
}
