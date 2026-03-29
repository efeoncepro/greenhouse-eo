import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { alertCronFailure } from '@/lib/alerts/slack-notify'

import { claimOrphanedRefreshItems, markRefreshCompleted, markRefreshFailed } from '@/lib/sync/refresh-queue'
import { getRegisteredProjections } from '@/lib/sync/projection-registry'
import { ensureProjectionsRegistered } from '@/lib/sync/projections'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Projection Recovery Cron
 *
 * Picks up orphaned items in `projection_refresh_queue` that are stuck as
 * `pending` (inline processing never completed) or `processing` (process died).
 *
 * For each orphan, looks up the projection by name and re-runs its idempotent
 * refresh function with scope only (no original event payload needed).
 */
export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    ensureProjectionsRegistered()

    const orphans = await claimOrphanedRefreshItems(10, 30)

    if (orphans.length === 0) {
      return NextResponse.json({ recovered: 0, failed: 0, message: 'No orphaned projections found' })
    }

    const projections = getRegisteredProjections()
    let recovered = 0
    let failed = 0
    const details: Array<{ queueId: string; projectionName: string; status: string }> = []

    for (const orphan of orphans) {
      const projection = projections.find(p => p.name === orphan.projectionName)

      if (!projection) {
        await markRefreshFailed(orphan.queueId, `Projection "${orphan.projectionName}" not found in registry`, 0)
        failed++
        details.push({ queueId: orphan.queueId, projectionName: orphan.projectionName, status: 'unknown_projection' })
        continue
      }

      try {
        const scope = { entityType: orphan.entityType, entityId: orphan.entityId }

        await projection.refresh(scope, {})
        await markRefreshCompleted(orphan.queueId)
        recovered++
        details.push({ queueId: orphan.queueId, projectionName: orphan.projectionName, status: 'recovered' })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)

        await markRefreshFailed(orphan.queueId, errorMsg, projection.maxRetries ?? 2)
        failed++
        details.push({ queueId: orphan.queueId, projectionName: orphan.projectionName, status: 'failed' })
      }
    }

    return NextResponse.json({ recovered, failed, total: orphans.length, details })
  } catch (error) {
    await alertCronFailure('projection-recovery', error).catch(() => {})

    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 502 })
  }
}
