import { NextResponse } from 'next/server'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { sampleDatabase } from '@/lib/notion/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/integrations/notion/register
 *
 * Register Notion database mappings for a Space.
 * Saves to PostgreSQL (source of truth) and BigQuery (pipeline replica).
 *
 * Body:
 * {
 *   spaceId: string,                 // must exist in greenhouse_core.spaces
 *   notionDbProyectos: string,       // 32-char hex (required)
 *   notionDbTareas: string,          // 32-char hex (required)
 *   notionDbSprints?: string | null, // 32-char hex (optional)
 *   notionDbRevisiones?: string | null,
 *   verify?: boolean                 // if true, query each DB to verify access (default true)
 * }
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()
  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    const spaceId = assertNotionField(body.spaceId, 'spaceId', false)
    const notionDbProyectos = assertNotionDbId(body.notionDbProyectos, 'notionDbProyectos')
    const notionDbTareas = assertNotionDbId(body.notionDbTareas, 'notionDbTareas')
    const notionDbSprints = body.notionDbSprints ? assertNotionDbId(body.notionDbSprints, 'notionDbSprints') : null
    const notionDbRevisiones = body.notionDbRevisiones ? assertNotionDbId(body.notionDbRevisiones, 'notionDbRevisiones') : null
    const verify = body.verify !== false

    // 1. Verify space exists
    const spaces = await runGreenhousePostgresQuery<Record<string, unknown>>(
      `SELECT space_id, space_name, client_id FROM greenhouse_core.spaces WHERE space_id = $1`,
      [spaceId]
    )
    if (spaces.length === 0) {
      return NextResponse.json({ error: `Space not found: ${spaceId}` }, { status: 404 })
    }
    const space = spaces[0]

    // 2. Optionally verify Notion access to each database
    const verification: Record<string, { ok: boolean; sampleTitle?: string; error?: string }> = {}
    if (verify) {
      const dbsToVerify: Array<[string, string]> = [
        [notionDbProyectos, 'proyectos'],
        [notionDbTareas, 'tareas']
      ]
      if (notionDbSprints) dbsToVerify.push([notionDbSprints, 'sprints'])
      if (notionDbRevisiones) dbsToVerify.push([notionDbRevisiones, 'revisiones'])

      for (const [dbId, label] of dbsToVerify) {
        try {
          const records = await sampleDatabase(dbId, 1)
          const sampleTitle = records.length > 0
            ? findTitleProp(records[0].properties)
            : '(empty database)'
          verification[label] = { ok: true, sampleTitle }
        } catch (err) {
          verification[label] = {
            ok: false,
            error: err instanceof Error ? err.message : 'Access failed'
          }
        }
      }

      const failed = Object.entries(verification).filter(([, v]) => !v.ok)
      if (failed.length > 0) {
        return NextResponse.json({
          error: 'Notion database verification failed',
          verification,
          hint: 'Ensure the Notion integration has access to these databases. Set verify=false to skip.'
        }, { status: 422 })
      }
    }

    // 3. Upsert in PostgreSQL
    const pgResult = await runGreenhousePostgresQuery<Record<string, unknown>>(
      `INSERT INTO greenhouse_core.space_notion_sources (
        source_id, space_id,
        notion_db_proyectos, notion_db_tareas, notion_db_sprints, notion_db_revisiones,
        sync_enabled, sync_frequency, created_by
      )
      VALUES (
        'sns-' || gen_random_uuid(), $1,
        $2, $3, $4, $5,
        TRUE, 'daily', $6
      )
      ON CONFLICT (space_id) DO UPDATE SET
        notion_db_proyectos = EXCLUDED.notion_db_proyectos,
        notion_db_tareas = EXCLUDED.notion_db_tareas,
        notion_db_sprints = EXCLUDED.notion_db_sprints,
        notion_db_revisiones = EXCLUDED.notion_db_revisiones,
        sync_enabled = TRUE,
        updated_at = CURRENT_TIMESTAMP
      RETURNING source_id, space_id`,
      [spaceId, notionDbProyectos, notionDbTareas, notionDbSprints, notionDbRevisiones, tenant.userId]
    )

    const sourceId = pgResult[0]?.source_id as string

    // 4. Replicate to BigQuery (pipeline reads from here)
    const projectId = getBigQueryProjectId()
    const bq = getBigQueryClient()
    const clientId = (space.client_id as string) || null

    await bq.query({
      query: `
        MERGE \`${projectId}.greenhouse.space_notion_sources\` AS target
        USING (
          SELECT
            @sourceId AS source_id,
            @spaceId AS space_id,
            @clientId AS client_id,
            @dbProyectos AS notion_db_proyectos,
            @dbTareas AS notion_db_tareas,
            @dbSprints AS notion_db_sprints,
            @dbRevisiones AS notion_db_revisiones,
            CAST(NULL AS STRING) AS notion_workspace_id,
            TRUE AS sync_enabled,
            'daily' AS sync_frequency,
            CAST(NULL AS TIMESTAMP) AS last_synced_at,
            CURRENT_TIMESTAMP() AS created_at,
            CURRENT_TIMESTAMP() AS updated_at,
            @createdBy AS created_by
        ) AS source
        ON target.space_id = source.space_id
        WHEN MATCHED THEN UPDATE SET
          notion_db_proyectos = source.notion_db_proyectos,
          notion_db_tareas = source.notion_db_tareas,
          notion_db_sprints = source.notion_db_sprints,
          notion_db_revisiones = source.notion_db_revisiones,
          sync_enabled = TRUE,
          updated_at = CURRENT_TIMESTAMP()
        WHEN NOT MATCHED THEN INSERT ROW
      `,
      params: {
        sourceId,
        spaceId,
        clientId,
        dbProyectos: notionDbProyectos,
        dbTareas: notionDbTareas,
        dbSprints: notionDbSprints || null,
        dbRevisiones: notionDbRevisiones || null,
        createdBy: tenant.userId
      }
    })

    return NextResponse.json({
      registered: true,
      sourceId,
      spaceId,
      spaceName: space.space_name,
      databases: {
        proyectos: notionDbProyectos,
        tareas: notionDbTareas,
        sprints: notionDbSprints,
        revisiones: notionDbRevisiones
      },
      verification: verify ? verification : undefined,
      syncEnabled: true,
      nextStep: `Trigger sync: POST /api/integrations/notion/sync?spaceId=${spaceId}`
    }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed'
    if (message.includes('NOTION_TOKEN')) {
      return NextResponse.json({ error: 'Notion integration not configured' }, { status: 503 })
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

/**
 * GET /api/integrations/notion/register
 *
 * List all registered Space → Notion mappings.
 */
export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()
  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT
      sns.source_id, sns.space_id,
      s.space_name, s.client_id,
      sns.notion_db_proyectos, sns.notion_db_tareas,
      sns.notion_db_sprints, sns.notion_db_revisiones,
      sns.sync_enabled, sns.sync_frequency,
      sns.last_synced_at, sns.created_at, sns.updated_at, sns.created_by
    FROM greenhouse_core.space_notion_sources sns
    JOIN greenhouse_core.spaces s ON s.space_id = sns.space_id
    ORDER BY sns.created_at`
  )

  return NextResponse.json({
    mappings: rows.map(r => ({
      sourceId: r.source_id,
      spaceId: r.space_id,
      spaceName: r.space_name,
      clientId: r.client_id,
      databases: {
        proyectos: r.notion_db_proyectos,
        tareas: r.notion_db_tareas,
        sprints: r.notion_db_sprints,
        revisiones: r.notion_db_revisiones
      },
      syncEnabled: r.sync_enabled,
      syncFrequency: r.sync_frequency,
      lastSyncedAt: r.last_synced_at,
      createdAt: r.created_at,
      createdBy: r.created_by
    })),
    total: rows.length
  })
}

// ─── Helpers ───

function assertNotionField(value: unknown, name: string, isDbId: boolean): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} is required`)
  }
  const trimmed = value.trim()
  if (isDbId && !/^[a-f0-9]{32}$/i.test(trimmed)) {
    throw new Error(`${name} must be a 32-character hex Notion database ID`)
  }
  return trimmed
}

function assertNotionDbId(value: unknown, name: string): string {
  return assertNotionField(value, name, true)
}

function findTitleProp(props: Record<string, unknown>): string {
  for (const [, val] of Object.entries(props)) {
    if (typeof val === 'string' && val.length > 0) return val
  }
  return '(untitled)'
}
