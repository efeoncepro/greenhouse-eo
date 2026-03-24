import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/tenants/[id]/notion-status
 *
 * Returns the Space and Notion mapping status for a given client.
 * Used by the tenant detail's Notion onboarding panel.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: clientId } = await params

  // 1. Look up the space for this client
  const spaces = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT space_id, space_name, organization_id, space_type, status, active
     FROM greenhouse_core.spaces
     WHERE client_id = $1 AND active = TRUE
     ORDER BY created_at
     LIMIT 1`,
    [clientId]
  )

  if (spaces.length === 0) {
    return NextResponse.json({
      space: null,
      notionMapping: null,
      message: 'No space found for this client'
    })
  }

  const space = spaces[0]
  const spaceId = String(space.space_id)

  // 2. Look up the Notion mapping for this space
  const mappings = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT
       source_id, space_id,
       notion_db_proyectos, notion_db_tareas,
       notion_db_sprints, notion_db_revisiones,
       sync_enabled, sync_frequency,
       last_synced_at, created_at, updated_at, created_by
     FROM greenhouse_core.space_notion_sources
     WHERE space_id = $1`,
    [spaceId]
  )

  const mapping = mappings.length > 0 ? mappings[0] : null

  return NextResponse.json({
    space: {
      spaceId,
      spaceName: String(space.space_name || ''),
      organizationId: space.organization_id ? String(space.organization_id) : null,
      spaceType: String(space.space_type || 'client_space'),
      status: String(space.status || 'active'),
      active: Boolean(space.active)
    },
    notionMapping: mapping ? {
      sourceId: String(mapping.source_id),
      spaceId: String(mapping.space_id),
      databases: {
        proyectos: mapping.notion_db_proyectos ? String(mapping.notion_db_proyectos) : null,
        tareas: mapping.notion_db_tareas ? String(mapping.notion_db_tareas) : null,
        sprints: mapping.notion_db_sprints ? String(mapping.notion_db_sprints) : null,
        revisiones: mapping.notion_db_revisiones ? String(mapping.notion_db_revisiones) : null
      },
      syncEnabled: Boolean(mapping.sync_enabled),
      syncFrequency: String(mapping.sync_frequency || 'daily'),
      lastSyncedAt: mapping.last_synced_at ? String(mapping.last_synced_at) : null,
      createdAt: mapping.created_at ? String(mapping.created_at) : null,
      updatedAt: mapping.updated_at ? String(mapping.updated_at) : null,
      createdBy: mapping.created_by ? String(mapping.created_by) : null
    } : null
  })
}
