/**
 * Backfill: Resolve Notion task assignees → member_ids in delivery_tasks.
 *
 * Strategy:
 * 1. Read distinct responsable values from notion_ops.tareas
 * 2. Match against greenhouse_core.members by fuzzy name + Notion UUID
 * 3. Update delivery_tasks.assignee_member_id in BigQuery
 * 4. Update delivery_tasks.assignee_member_ids array
 *
 * Usage: npx tsx scripts/backfill-task-assignees.ts
 */
import { BigQuery } from '@google-cloud/bigquery'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

// ── Name mapping (Notion display name → member_id) ──
// Built from Notion responsable values + Greenhouse members table.
// This is the manual resolution for names that can't be fuzzy-matched.

/** Strip accents for fuzzy matching */
const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const EXPLICIT_NAME_MAP: Record<string, string> = {
  'daniela': 'daniela-ferreira',
  'daniela ferreira': 'daniela-ferreira',
  'adriana': '', // Client contact, not a Greenhouse member
  'adriana contreras': '', // Client contact
}

const main = async () => {
  console.log('=== Backfill task assignees ===\n')

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    || (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64
      ? Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64, 'base64').toString()
      : null)

  if (!raw) { console.error('No BQ credentials'); process.exit(1) }

  const credentials = JSON.parse(raw.replace(/^["']|["']$/g, ''))
  const projectId = process.env.GCP_PROJECT || credentials.project_id
  const bq = new BigQuery({ projectId, credentials })

  // Step 1: Load members from Postgres
  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('../src/lib/postgres/client')

  const members = await runGreenhousePostgresQuery<{
    member_id: string; display_name: string; first_name: string | null;
    last_name: string | null; notion_user_id: string | null
  }>('SELECT member_id, display_name, first_name, last_name, notion_user_id FROM greenhouse_core.members')

  console.log(`Loaded ${members.length} members from Postgres`)

  // Build lookup maps
  const nameToMember = new Map<string, string>()

  for (const m of members) {
    // Full display name (normalized — strips accents)
    nameToMember.set(normalize(m.display_name), m.member_id)

    // First name only
    if (m.first_name) nameToMember.set(normalize(m.first_name), m.member_id)

    // "Name | Efeonce" pattern
    nameToMember.set(`${normalize(m.display_name)} | efeonce`, m.member_id)

    // Notion user ID
    if (m.notion_user_id) nameToMember.set(m.notion_user_id, m.member_id)
  }

  // Add explicit overrides
  for (const [name, memberId] of Object.entries(EXPLICIT_NAME_MAP)) {
    if (memberId) nameToMember.set(normalize(name), memberId)
  }

  console.log(`Name lookup has ${nameToMember.size} entries\n`)

  // Step 2: Get distinct responsable values + task counts
  const [respRows] = await bq.query({
    query: `SELECT responsable, COUNT(*) as task_count
            FROM \`${projectId}.notion_ops.tareas\`
            WHERE responsable IS NOT NULL AND responsable != ''
            GROUP BY responsable
            ORDER BY task_count DESC`
  })

  console.log(`Found ${respRows.length} distinct responsable values\n`)

  // Step 3: Resolve each responsable to member_id(s)
  const resolvedMap = new Map<string, string[]>() // responsable_text → member_ids[]
  let resolvedTasks = 0
  let unresolvedTasks = 0

  for (const row of respRows as Array<{ responsable: string; task_count: number }>) {
    const parts = row.responsable.split(',').map(p => p.trim()).filter(Boolean)
    const memberIds: string[] = []

    for (const part of parts) {
      const norm = normalize(part)

      // Try exact match first (accent-normalized)
      let memberId = nameToMember.get(norm)

      // Try without " | Efeonce" suffix
      if (!memberId && norm.includes('|')) {
        const clean = norm.split('|')[0].trim()

        memberId = nameToMember.get(clean)
      }

      // Try as Notion UUID
      if (!memberId && /^[0-9a-f]{8}-/.test(part)) {
        memberId = nameToMember.get(part)
      }

      // Skip empty (non-member contacts like "Adriana")
      if (memberId === '') continue

      if (memberId) {
        memberIds.push(memberId)
      }
    }

    if (memberIds.length > 0) {
      resolvedMap.set(row.responsable, memberIds)
      resolvedTasks += Number(row.task_count)

      console.log(`  ✓ "${row.responsable}" → [${memberIds.join(', ')}] (${row.task_count} tasks)`)
    } else {
      unresolvedTasks += Number(row.task_count)

      console.log(`  ✗ "${row.responsable}" → UNRESOLVED (${row.task_count} tasks)`)
    }
  }

  console.log(`\nResolved: ${resolvedTasks} tasks | Unresolved: ${unresolvedTasks} tasks`)

  // Step 4: Update BigQuery delivery_tasks
  console.log('\n=== Updating delivery_tasks in BigQuery ===\n')

  let updated = 0

  for (const [responsable, memberIds] of resolvedMap) {
    const primaryMemberId = memberIds[0]

    try {
      await bq.query({
        query: `UPDATE \`${projectId}.greenhouse_conformed.delivery_tasks\`
                SET assignee_member_id = @primaryMemberId,
                    assignee_member_ids = @memberIds
                WHERE task_source_id IN (
                  SELECT notion_page_id FROM \`${projectId}.notion_ops.tareas\`
                  WHERE responsable = @responsable
                )
                AND (assignee_member_id IS NULL OR assignee_member_id = '')`,
        params: {
          primaryMemberId,
          memberIds,
          responsable
        }
      })

      updated++
    } catch (e) {
      console.error(`  Failed for "${responsable}":`, (e as Error).message?.slice(0, 80))
    }
  }

  console.log(`Updated ${updated} responsable groups`)

  // Step 5: Verify
  const [verifyRows] = await bq.query({
    query: `SELECT
              COUNT(*) as total,
              COUNTIF(assignee_member_id IS NOT NULL AND assignee_member_id != '') as has_member
            FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
            WHERE is_deleted = FALSE`
  })

  console.log(`\nVerification:`)
  console.log(`  Total active tasks: ${verifyRows[0]?.total}`)
  console.log(`  With assignee_member_id: ${verifyRows[0]?.has_member}`)

  // Also update the enriched view's cache by checking
  const [enrichedCheck] = await bq.query({
    query: `SELECT COUNT(*) as cnt,
            COUNTIF(assignee_member_id IS NOT NULL AND assignee_member_id != '') as has_member
            FROM \`${projectId}.ico_engine.v_tasks_enriched\``
  })

  console.log(`  v_tasks_enriched total: ${enrichedCheck[0]?.cnt}`)
  console.log(`  v_tasks_enriched with member: ${enrichedCheck[0]?.has_member}`)

  // Step 6: Also update notion_user_id in members table
  console.log('\n=== Updating Notion user IDs in members table ===\n')

  // Extract Notion UUIDs from responsable values and map to members
  const notionIdMap = new Map<string, string>() // notion_uuid → member_id

  for (const [responsable, memberIds] of resolvedMap) {
    const parts = responsable.split(',').map(p => p.trim())

    for (const part of parts) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(part)) {
        // This is a Notion UUID — find which member it maps to
        const memberName = parts.find(p => !/^[0-9a-f]{8}-/.test(p))

        if (memberName) {
          const lower = memberName.toLowerCase().split('|')[0].trim()
          const memberId = nameToMember.get(lower)

          if (memberId) notionIdMap.set(part, memberId)
        }
      }
    }
  }

  for (const [notionId, memberId] of notionIdMap) {
    try {
      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_core.members SET notion_user_id = $1 WHERE member_id = $2 AND (notion_user_id IS NULL OR notion_user_id = '')`,
        [notionId, memberId]
      )

      console.log(`  Updated ${memberId} → notion_user_id: ${notionId}`)
    } catch (e) {
      console.error(`  Failed for ${memberId}:`, (e as Error).message?.slice(0, 60))
    }
  }

  await closeGreenhousePostgres()
  console.log('\nDone.')
}

main().catch(err => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
