import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { ensureIcoEngineInfrastructure, ICO_DATASET } from '@/lib/ico-engine/schema'
import { readAgencyMetrics, computeSpaceMetricsLive } from '@/lib/ico-engine/read-metrics'
import { toIcoEngineErrorResponse, runIcoEngineQuery, getIcoEngineProjectId } from '@/lib/ico-engine/shared'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureIcoEngineInfrastructure()

    const { searchParams } = new URL(request.url)
    const periodYear = Number(searchParams.get('year') || new Date().getFullYear())
    const periodMonth = Number(searchParams.get('month') || new Date().getMonth() + 1)
    const live = searchParams.get('live') === 'true'

    if (!Number.isInteger(periodYear) || periodYear < 2024 || periodYear > 2030) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }

    if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
    }

    if (live) {
      // Live compute: get all distinct space_ids, compute each in parallel (batched)
      const projectId = getIcoEngineProjectId()

      const spaceRows = await runIcoEngineQuery<{ space_id: string }>(`
        SELECT DISTINCT space_id
        FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
        WHERE space_id IS NOT NULL AND TRIM(space_id) != ''
      `)

      const spaceIds = spaceRows.map(r => String(r.space_id).trim()).filter(Boolean)

      // Batch compute — max 5 concurrent to avoid overloading BigQuery
      const BATCH_SIZE = 5
      const snapshots = []

      for (let i = 0; i < spaceIds.length; i += BATCH_SIZE) {
        const batch = spaceIds.slice(i, i + BATCH_SIZE)
        const results = await Promise.all(
          batch.map(spaceId => computeSpaceMetricsLive(spaceId, periodYear, periodMonth))
        )

        for (const result of results) {
          if (result) snapshots.push(result)
        }
      }

      return NextResponse.json({
        periodYear,
        periodMonth,
        spaces: snapshots,
        totalSpaces: snapshots.length
      })
    }

    const snapshots = await readAgencyMetrics(periodYear, periodMonth)

    return NextResponse.json({
      periodYear,
      periodMonth,
      spaces: snapshots,
      totalSpaces: snapshots.length
    })
  } catch (error) {
    return toIcoEngineErrorResponse(error, 'Failed to read agency ICO metrics')
  }
}
