import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { fetchEntraUsersWithManagers } from '@/lib/entra/graph-client'
import { syncEntraProfiles } from '@/lib/entra/profile-sync'
import { runEntraHierarchyGovernanceScan } from '@/lib/reporting-hierarchy/governance'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) return errorResponse

  const startMs = Date.now()

  try {
    const entraUsers = await fetchEntraUsersWithManagers()

    console.log(`[entra-profile-sync] Fetched ${entraUsers.length} users from Entra`)

    const result = await syncEntraProfiles(entraUsers)

    const hierarchyGovernance = await runEntraHierarchyGovernanceScan({
      triggeredBy: 'cron:entra-profile-sync',
      syncMode: 'poll',
      entraUsers
    })

    const durationMs = Date.now() - startMs

    console.log(
      `[entra-profile-sync] done processed=${result.processed} users_updated=${result.usersUpdated} profiles_created=${result.profilesCreated} profiles_linked=${result.profilesLinked} profiles_updated=${result.profilesUpdated} members_updated=${result.membersUpdated} avatars_synced=${result.avatarsSynced} skipped=${result.skipped} errors=${result.errors.length} duration=${durationMs}ms`
    )

    return NextResponse.json({ ...result, hierarchyGovernance, durationMs })
  } catch (error) {
    const durationMs = Date.now() - startMs

    console.error('[entra-profile-sync] Cron failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error', durationMs },
      { status: 500 }
    )
  }
}
