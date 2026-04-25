import { NextResponse } from 'next/server'

import {
  materializeAllPartyLifecycleSnapshots,
  listPartyLifecycleSnapshots
} from '@/lib/commercial/party'
import type { LifecycleStage } from '@/lib/commercial/party/types'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const LIFECYCLE_STAGE_SET = new Set<LifecycleStage>([
  'prospect',
  'opportunity',
  'active_client',
  'inactive',
  'churned',
  'provider_only',
  'disqualified'
])

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

const parseStages = (value: string | null): LifecycleStage[] | undefined => {
  if (!value) return undefined

  const stages = value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

  if (stages.length === 0) return undefined

  const invalidStage = stages.find(stage => !LIFECYCLE_STAGE_SET.has(stage as LifecycleStage))

  if (invalidStage) {
    throw new Error(`Invalid stage: ${invalidStage}`)
  }

  return stages as LifecycleStage[]
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const page = parsePositiveInt(url.searchParams.get('page'), 1)
  const pageSize = parsePositiveInt(url.searchParams.get('pageSize'), 25)

  try {
    const filters = {
      query: url.searchParams.get('q') ?? url.searchParams.get('search'),
      stages: parseStages(url.searchParams.get('stages') ?? url.searchParams.get('stage')),
      hasConflicts:
        url.searchParams.get('hasConflicts') === 'true'
          ? true
          : url.searchParams.get('hasConflicts') === 'false'
            ? false
            : null,
      limit: pageSize,
      offset: (page - 1) * pageSize
    }

    let result = await listPartyLifecycleSnapshots(filters)

    if (result.total === 0 && !filters.query && !filters.stages?.length) {
      await materializeAllPartyLifecycleSnapshots()
      result = await listPartyLifecycleSnapshots(filters)
    }

    return NextResponse.json({
      items: result.items,
      total: result.total,
      page,
      pageSize
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request.' },
      { status: 400 }
    )
  }
}
