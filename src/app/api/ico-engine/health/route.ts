import { NextResponse } from 'next/server'

import { runIcoEngineQuery, getIcoEngineProjectId, toNullableNumber } from '@/lib/ico-engine/shared'
import { ICO_DATASET } from '@/lib/ico-engine/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const projectId = getIcoEngineProjectId()

    const rows = await runIcoEngineQuery<{
      last_computed_at: { value?: string } | string | null
      snapshot_count: unknown
      space_count: unknown
    }>(`
      SELECT
        MAX(computed_at) AS last_computed_at,
        COUNT(*) AS snapshot_count,
        COUNT(DISTINCT space_id) AS space_count
      FROM \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\`
      WHERE period_year = EXTRACT(YEAR FROM CURRENT_DATE())
        AND period_month = EXTRACT(MONTH FROM CURRENT_DATE())
    `)

    const row = rows[0]
    const ts = row?.last_computed_at
    const lastComputedStr = typeof ts === 'string' ? ts : ts?.value ?? null

    const hoursSince = lastComputedStr
      ? (Date.now() - new Date(lastComputedStr).getTime()) / 3_600_000
      : null

    return NextResponse.json({
      status: hoursSince !== null && hoursSince < 36 ? 'healthy' : 'stale',
      lastMaterializedAt: lastComputedStr,
      hoursSinceLastMaterialization: hoursSince !== null ? Math.round(hoursSince * 10) / 10 : null,
      currentPeriodSnapshots: toNullableNumber(row?.snapshot_count) ?? 0,
      activeSpaces: toNullableNumber(row?.space_count) ?? 0
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 502 }
    )
  }
}
