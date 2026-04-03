import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { fetchEntraUsers } from '@/lib/entra/graph-client'
import { syncEntraProfiles } from '@/lib/entra/profile-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) return errorResponse

  const startMs = Date.now()

  try {
    const entraUsers = await fetchEntraUsers()

    console.log(`[entra-profile-sync] Fetched ${entraUsers.length} users from Entra`)

    const result = await syncEntraProfiles(entraUsers)

    const durationMs = Date.now() - startMs

    console.log(
      `[entra-profile-sync] done processed=${result.processed} users_updated=${result.usersUpdated} profiles_updated=${result.profilesUpdated} members_updated=${result.membersUpdated} skipped=${result.skipped} errors=${result.errors.length} duration=${durationMs}ms`
    )

    return NextResponse.json({ ...result, durationMs })
  } catch (error) {
    const durationMs = Date.now() - startMs

    console.error('[entra-profile-sync] Cron failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error', durationMs },
      { status: 500 }
    )
  }
}
