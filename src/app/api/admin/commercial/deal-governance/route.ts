import { NextResponse } from 'next/server'

import { syncHubSpotOwnerMappings } from '@/lib/commercial/hubspot-owner-sync'
import { query } from '@/lib/db'
import { syncHubSpotDealMetadata } from '@/lib/commercial/deal-metadata-sync'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [pipelineRows, defaultRows, propertyRows, ownerRows] = await Promise.all([
    query<{
      pipeline_count: string | number
      stage_count: string | number
      active_pipeline_count: string | number
      default_stage_count: string | number
    }>(
      `SELECT COUNT(DISTINCT pipeline_id)::text AS pipeline_count,
              COUNT(*)::text AS stage_count,
              COUNT(DISTINCT pipeline_id) FILTER (WHERE pipeline_active = TRUE)::text AS active_pipeline_count,
              COUNT(*) FILTER (WHERE is_default_for_create = TRUE)::text AS default_stage_count
         FROM greenhouse_commercial.hubspot_deal_pipeline_config`
    ),
    query<{
      scope: string
      scope_key: string
      pipeline_id: string
      stage_id: string | null
      owner_hubspot_user_id: string | null
      deal_type: string | null
      priority: string | null
    }>(
      `SELECT scope, scope_key, pipeline_id, stage_id, owner_hubspot_user_id, deal_type, priority
         FROM greenhouse_commercial.hubspot_deal_pipeline_defaults
        ORDER BY scope ASC, scope_key ASC`
    ),
    query<{
      property_name: string
      hubspot_property_name: string
      label: string | null
      missing_in_hubspot: boolean
      synced_at: string
    }>(
      `SELECT property_name,
              hubspot_property_name,
              label,
              missing_in_hubspot,
              synced_at::text AS synced_at
         FROM greenhouse_commercial.hubspot_deal_property_config
        ORDER BY property_name ASC`
    ),
    query<{
      active_member_count: string | number
      mapped_member_count: string | number
      unmapped_member_count: string | number
    }>(
      `SELECT COUNT(*)::text AS active_member_count,
              COUNT(*) FILTER (
                WHERE hubspot_owner_id IS NOT NULL
                  AND btrim(hubspot_owner_id) <> ''
              )::text AS mapped_member_count,
              COUNT(*) FILTER (
                WHERE hubspot_owner_id IS NULL
                   OR btrim(hubspot_owner_id) = ''
              )::text AS unmapped_member_count
         FROM greenhouse_core.members
        WHERE active = TRUE`
    )
  ])

  return NextResponse.json({
    actorUserId: tenant.userId,
    summary: {
      pipelineCount: Number(pipelineRows[0]?.pipeline_count ?? 0),
      stageCount: Number(pipelineRows[0]?.stage_count ?? 0),
      activePipelineCount: Number(pipelineRows[0]?.active_pipeline_count ?? 0),
      defaultStageCount: Number(pipelineRows[0]?.default_stage_count ?? 0)
    },
    ownerMappings: {
      activeMemberCount: Number(ownerRows[0]?.active_member_count ?? 0),
      mappedMemberCount: Number(ownerRows[0]?.mapped_member_count ?? 0),
      unmappedMemberCount: Number(ownerRows[0]?.unmapped_member_count ?? 0)
    },
    defaults: defaultRows,
    properties: propertyRows
  })
}

export async function POST() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [metadataSync, ownerMappingSync] = await Promise.all([
      syncHubSpotDealMetadata(),
      syncHubSpotOwnerMappings()
    ])

    return NextResponse.json({
      ok: true,
      actorUserId: tenant.userId,
      metadataSync,
      ownerMappingSync
    })
  } catch (error) {
    console.error('[api/admin/commercial/deal-governance] metadata sync failed', error)

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to sync HubSpot deal metadata'
      },
      { status: 500 }
    )
  }
}
