import { randomUUID } from 'crypto'

import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/spaces
 *
 * Create a new Space (tenant boundary) for a client.
 * Auto-resolves the Organization from the client's existing data
 * (Account 360 M1 backfill or HubSpot-synced organizations).
 * If no Organization exists yet, creates one from the client record.
 *
 * Body:
 * {
 *   spaceName: string,
 *   clientId: string,
 *   spaceType?: 'client_space' | 'internal_space'
 * }
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    const spaceName = (body.spaceName || '').trim()
    const clientId = (body.clientId || '').trim()
    const spaceType = body.spaceType === 'internal_space' ? 'internal_space' : 'client_space'

    if (!spaceName) {
      return NextResponse.json({ error: 'spaceName is required' }, { status: 400 })
    }

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    // 1. Verify client exists and get metadata for Organization resolution
    const clients = await runGreenhousePostgresQuery<Record<string, unknown>>(
      `SELECT client_id, client_name, hubspot_company_id
       FROM greenhouse_core.clients WHERE client_id = $1`,
      [clientId]
    )

    if (clients.length === 0) {
      return NextResponse.json({ error: `Client '${clientId}' not found` }, { status: 404 })
    }

    const client = clients[0]
    const clientName = String(client.client_name || clientId)
    const hubspotCompanyId = client.hubspot_company_id ? String(client.hubspot_company_id) : null

    // 2. Check no active Space already exists for this client
    const existing = await runGreenhousePostgresQuery<Record<string, unknown>>(
      `SELECT space_id, space_name FROM greenhouse_core.spaces
       WHERE client_id = $1 AND active = TRUE LIMIT 1`,
      [clientId]
    )

    if (existing.length > 0) {
      return NextResponse.json({
        error: 'Client already has an active Space',
        existingSpaceId: existing[0].space_id,
        existingSpaceName: existing[0].space_name
      }, { status: 409 })
    }

    // 3. Resolve Organization — source of truth is HubSpot via Account 360
    //    Priority: (a) existing org linked to this client via hubspot_company_id
    //              (b) existing org linked via a previous space
    //              (c) auto-create from client metadata
    let organizationId: string | null = null
    let organizationName: string | null = null

    // (a) Find Organization by HubSpot company ID (canonical link)
    if (hubspotCompanyId) {
      const orgByHubspot = await runGreenhousePostgresQuery<Record<string, unknown>>(
        `SELECT organization_id, organization_name
         FROM greenhouse_core.organizations
         WHERE hubspot_company_id = $1 AND active = TRUE
         LIMIT 1`,
        [hubspotCompanyId]
      )

      if (orgByHubspot.length > 0) {
        organizationId = String(orgByHubspot[0].organization_id)
        organizationName = String(orgByHubspot[0].organization_name)
      }
    }

    // (b) Find Organization from an existing (possibly inactive) space for this client
    if (!organizationId) {
      const orgBySpace = await runGreenhousePostgresQuery<Record<string, unknown>>(
        `SELECT o.organization_id, o.organization_name
         FROM greenhouse_core.organizations o
         JOIN greenhouse_core.spaces s ON s.organization_id = o.organization_id
         WHERE s.client_id = $1 AND o.active = TRUE
         LIMIT 1`,
        [clientId]
      )

      if (orgBySpace.length > 0) {
        organizationId = String(orgBySpace[0].organization_id)
        organizationName = String(orgBySpace[0].organization_name)
      }
    }

    // (c) Auto-create Organization from client metadata
    if (!organizationId) {
      organizationId = `org-${randomUUID()}`
      organizationName = clientName

      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_core.organizations (
          organization_id, organization_name,
          hubspot_company_id, status, active
        ) VALUES ($1, $2, $3, 'active', TRUE)`,
        [organizationId, clientName, hubspotCompanyId]
      )
    }

    // 4. Create Space
    const spaceId = `spc-${randomUUID()}`

    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_core.spaces (
        space_id, organization_id, client_id,
        space_name, space_type, status, active
      ) VALUES ($1, $2, $3, $4, $5, 'active', TRUE)`,
      [spaceId, organizationId, clientId, spaceName, spaceType]
    )

    return NextResponse.json({
      created: true,
      spaceId,
      spaceName,
      clientId,
      organizationId,
      organizationName,
      organizationResolved: organizationName !== clientName ? 'existing' : 'created',
      spaceType
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Space creation failed:', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/admin/spaces
 *
 * List all spaces with their Notion mapping status.
 */
export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
      `SELECT
        s.space_id,
        s.space_name,
        s.client_id,
        s.organization_id,
        s.space_type,
        s.status,
        s.active,
        s.created_at,
        o.organization_name,
        o.hubspot_company_id,
        c.client_name,
        sns.source_id IS NOT NULL AS has_notion_mapping,
        sns.sync_enabled,
        sns.last_synced_at
      FROM greenhouse_core.spaces s
      LEFT JOIN greenhouse_core.organizations o ON o.organization_id = s.organization_id
      LEFT JOIN greenhouse_core.clients c ON c.client_id = s.client_id
      LEFT JOIN greenhouse_core.space_notion_sources sns ON sns.space_id = s.space_id
      WHERE s.active = TRUE
      ORDER BY s.created_at DESC`
    )

    const spaces = rows.map(r => ({
      spaceId: String(r.space_id),
      spaceName: String(r.space_name || ''),
      clientId: r.client_id ? String(r.client_id) : null,
      clientName: r.client_name ? String(r.client_name) : null,
      organizationId: r.organization_id ? String(r.organization_id) : null,
      organizationName: r.organization_name ? String(r.organization_name) : null,
      hubspotCompanyId: r.hubspot_company_id ? String(r.hubspot_company_id) : null,
      spaceType: String(r.space_type || 'client_space'),
      status: String(r.status || 'active'),
      hasNotionMapping: Boolean(r.has_notion_mapping),
      syncEnabled: r.sync_enabled != null ? Boolean(r.sync_enabled) : null,
      lastSyncedAt: r.last_synced_at ? String(r.last_synced_at) : null,
      createdAt: r.created_at ? String(r.created_at) : null
    }))

    return NextResponse.json({ spaces, total: spaces.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Spaces list failed:', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
