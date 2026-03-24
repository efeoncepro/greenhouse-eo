import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

interface OrphanRow extends Record<string, unknown> {
  user_id: string
  email: string
}

interface ProfileRow extends Record<string, unknown> {
  profile_id: string
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const startMs = Date.now()

    // Step 1: Find client_users with NULL identity_profile_id
    const orphans = await runGreenhousePostgresQuery<OrphanRow>(
      `SELECT user_id, email
       FROM greenhouse_core.client_users
       WHERE identity_profile_id IS NULL
         AND active = TRUE
         AND status IN ('active', 'invited')
       LIMIT 100`
    )

    let linked = 0
    let noMatch = 0

    for (const orphan of orphans) {
      // Try to find matching identity_profile by canonical_email
      const profiles = await runGreenhousePostgresQuery<ProfileRow>(
        `SELECT profile_id
         FROM greenhouse_core.identity_profiles
         WHERE canonical_email = $1
         LIMIT 1`,
        [orphan.email.trim().toLowerCase()]
      )

      if (profiles.length > 0) {
        await runGreenhousePostgresQuery(
          `UPDATE greenhouse_core.client_users
           SET identity_profile_id = $1, updated_at = NOW()
           WHERE user_id = $2 AND identity_profile_id IS NULL`,
          [profiles[0].profile_id, orphan.user_id]
        )
        linked++
      } else {
        noMatch++
      }
    }

    // Step 2: Run full identity reconciliation if available
    let reconResult = null

    try {
      const { runIdentityReconciliation } = await import('@/lib/identity/reconciliation/reconciliation-service')

      reconResult = await runIdentityReconciliation({ dryRun: false })
    } catch {
      // Reconciliation service may not be available — non-blocking
    }

    const durationMs = Date.now() - startMs

    console.log(
      `[identity-reconcile] orphans=${orphans.length} linked=${linked} noMatch=${noMatch} recon=${reconResult ? 'ok' : 'skip'} ${durationMs}ms`
    )

    return NextResponse.json({
      orphanUsersFound: orphans.length,
      linkedByEmail: linked,
      noMatchFound: noMatch,
      reconciliation: reconResult ? {
        autoLinked: reconResult.autoLinkedCount,
        pendingReview: reconResult.pendingReviewCount,
        noMatch: reconResult.noMatchCount
      } : null,
      durationMs
    })
  } catch (error) {
    console.error('[identity-reconcile] Cron failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
