import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { ensureIcoEngineInfrastructure, ICO_DATASET } from '@/lib/ico-engine/schema'
import { runIcoEngineQuery, getIcoEngineProjectId, toIcoEngineErrorResponse, toNumber, normalizeString } from '@/lib/ico-engine/shared'

export const dynamic = 'force-dynamic'

interface StuckAssetRow {
  task_source_id: string
  task_name: unknown
  space_id: string
  project_source_id: unknown
  fase_csc: unknown
  hours_since_update: unknown
  days_since_update: unknown
  severity: unknown
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureIcoEngineInfrastructure()

    const { searchParams } = new URL(request.url)
    const spaceId = searchParams.get('spaceId')
    const projectId = getIcoEngineProjectId()

    let filter = ''
    const params: Record<string, unknown> = {}

    if (spaceId) {
      filter = 'WHERE space_id = @spaceId'
      params.spaceId = spaceId
    }

    const rows = await runIcoEngineQuery<StuckAssetRow>(`
      SELECT
        task_source_id, task_name, space_id, project_source_id,
        fase_csc, hours_since_update, days_since_update,
        severity
      FROM \`${projectId}.${ICO_DATASET}.stuck_assets_detail\`
      ${filter}
      ORDER BY
        CASE WHEN severity = 'danger' THEN 0 ELSE 1 END,
        hours_since_update DESC
    `, params)

    const assets = rows.map(row => ({
      taskSourceId: normalizeString(row.task_source_id),
      taskName: normalizeString(row.task_name),
      spaceId: normalizeString(row.space_id),
      projectSourceId: row.project_source_id ? normalizeString(row.project_source_id) : null,
      faseCsc: normalizeString(row.fase_csc),
      hoursSinceUpdate: toNumber(row.hours_since_update),
      daysSinceUpdate: toNumber(row.days_since_update),
      severity: normalizeString(row.severity) as 'warning' | 'danger'
    }))

    return NextResponse.json({ assets, total: assets.length })
  } catch (error) {
    return toIcoEngineErrorResponse(error, 'Failed to read stuck assets')
  }
}
