import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import { getPersonFinanceOverviewFromPostgres } from '@/lib/person-360/get-person-finance'
import {
  readLatestMemberCapacityEconomicsSnapshot,
  readMemberCapacityEconomicsSnapshot
} from '@/lib/member-capacity-economics/store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolveAvatarUrl } from '@/lib/person-360/resolve-avatar'

export const dynamic = 'force-dynamic'

// ── Team members per space ──

interface SpaceTeamMemberRow extends Record<string, unknown> {
  client_id: string
  member_id: string
  display_name: string | null
  avatar_url: string | null
  user_id: string | null
}

/** For a list of client_ids, fetch all active team members with name + avatar from person_360 */
const getTeamMembersBySpaces = async (clientIds: string[], excludeMemberId: string) => {
  if (clientIds.length === 0) return new Map<string, { name: string; avatarUrl: string | null }[]>()

  const placeholders = clientIds.map((_, i) => `$${i + 1}`).join(', ')

  const rows = await runGreenhousePostgresQuery<SpaceTeamMemberRow>(
    `SELECT
      a.client_id,
      a.member_id,
      COALESCE(p360.resolved_display_name, m.display_name) AS display_name,
      p360.resolved_avatar_url AS avatar_url,
      cu.user_id
    FROM greenhouse_core.client_team_assignments a
    LEFT JOIN greenhouse_core.members m ON m.member_id = a.member_id
    LEFT JOIN greenhouse_serving.person_360 p360 ON p360.identity_profile_id = m.identity_profile_id
    LEFT JOIN greenhouse_core.client_users cu ON cu.identity_profile_id = m.identity_profile_id AND cu.active = TRUE
    WHERE a.client_id IN (${placeholders})
      AND a.active = TRUE
      AND a.member_id != $${clientIds.length + 1}
    ORDER BY a.client_id, COALESCE(p360.resolved_display_name, m.display_name)`,
    [...clientIds, excludeMemberId]
  )

  const map = new Map<string, { name: string; avatarUrl: string | null }[]>()

  for (const r of rows) {
    const list = map.get(r.client_id) ?? []

    list.push({
      name: r.display_name || 'Sin nombre',
      avatarUrl: resolveAvatarUrl(r.avatar_url, r.user_id)
    })
    map.set(r.client_id, list)
  }

  return map
}

export async function GET() {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
    const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)
    const year = match ? Number(match[1]) : new Date().getFullYear()
    const month = match ? Number(match[2]) : new Date().getMonth() + 1

    const [overview, currentSnapshot, latestSnapshot] = await Promise.all([
      getPersonFinanceOverviewFromPostgres(memberId),
      readMemberCapacityEconomicsSnapshot(memberId, year, month).catch(() => null),
      readLatestMemberCapacityEconomicsSnapshot(memberId).catch(() => null)
    ])

    const snapshot = currentSnapshot ?? latestSnapshot

    // Enrich assignments with team members from each space
    const assignments = overview?.assignments ?? []
    const clientIds = [...new Set(assignments.filter(a => a.active).map(a => a.clientId))]
    const teamBySpace = await getTeamMembersBySpaces(clientIds, memberId).catch(() => new Map())

    const enrichedAssignments = assignments.map(a => ({
      ...a,
      teamMembers: teamBySpace.get(a.clientId) ?? []
    }))

    return NextResponse.json({
      assignments: enrichedAssignments,
      summary: overview?.summary ?? null,
      capacity: snapshot
        ? {
            periodYear: snapshot.periodYear,
            periodMonth: snapshot.periodMonth,
            contractedFte: snapshot.contractedFte,
            contractedHours: snapshot.contractedHours,
            assignedHours: snapshot.assignedHours,
            usageKind: snapshot.usageKind,
            usedHours: snapshot.usedHours,
            usagePercent: snapshot.usagePercent,
            commercialAvailabilityHours: snapshot.commercialAvailabilityHours,
            operationalAvailabilityHours: snapshot.operationalAvailabilityHours,
            targetCurrency: snapshot.targetCurrency,
            costPerHourTarget: snapshot.costPerHourTarget,
            suggestedBillRateTarget: snapshot.suggestedBillRateTarget
          }
        : null
    })
  } catch (error) {
    console.error('GET /api/my/assignments failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
