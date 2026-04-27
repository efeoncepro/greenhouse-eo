import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { redactObjectStrings } from '@/lib/observability/redact'
import { buildHomeEntitlementsContext } from '@/lib/home/build-home-entitlements-context'
import { composeHomeSnapshot } from '@/lib/home/compose-home-snapshot'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { HomeUiDensity } from '@/lib/home/contract'

/**
 * TASK-696 — Smart Home v2 snapshot endpoint.
 *
 * Versioned read surface (`home-snapshot.v1`). Coexists with the
 * legacy `/api/home/snapshot` during the rollout window so a
 * regressing home can fall back without a deploy.
 */

export const dynamic = 'force-dynamic'

type UserPreferencesRow = {
  ui_density: string | null
  home_default_view: string | null
  home_v2_opt_out: boolean | null
} & Record<string, unknown>

const fetchUserPreferences = async (userId: string): Promise<UserPreferencesRow> => {
  try {
    const rows = await runGreenhousePostgresQuery<UserPreferencesRow>(
      `SELECT ui_density, home_default_view, home_v2_opt_out
         FROM greenhouse_core.client_users
        WHERE user_id = $1`,
      [userId]
    )

    return rows[0] ?? { ui_density: null, home_default_view: null, home_v2_opt_out: false }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        '[home/snapshot/v2] preferences lookup failed:',
        error instanceof Error ? error.message : error
      )
    }

    return { ui_density: null, home_default_view: null, home_v2_opt_out: false }
  }
}

const normalizeDensity = (raw: string | null): HomeUiDensity => {
  if (raw === 'cozy' || raw === 'comfortable' || raw === 'compact') return raw

  return 'cozy'
}

export async function GET() {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user } = session

  try {
    const homeEntitlements = buildHomeEntitlementsContext({
      userId: user.userId,
      tenantType: user.tenantType,
      roleCodes: user.roleCodes ?? [],
      primaryRoleCode: user.primaryRoleCode,
      routeGroups: user.routeGroups ?? [],
      authorizedViews: user.authorizedViews ?? [],
      businessLines: user.businessLines ?? [],
      serviceModules: user.serviceModules ?? [],
      portalHomePath: user.portalHomePath ?? '/home',
      memberId: user.memberId
    })

    const preferences = await fetchUserPreferences(user.userId)

    const tenantId = user.clientId ?? null
    const firstName = (user.name ?? '').split(' ')[0] || 'Usuario'

    const snapshot = await composeHomeSnapshot({
      userId: user.userId,
      tenantId,
      tenantType: user.tenantType,
      audienceKey: homeEntitlements.entitlements.audienceKey,
      roleCodes: user.roleCodes ?? [],
      primaryRoleCode: user.primaryRoleCode,
      entitlements: homeEntitlements.entitlements,
      density: normalizeDensity(preferences.ui_density),
      defaultView: preferences.home_default_view,
      optedOutOfV2: preferences.home_v2_opt_out === true,
      firstName
    })

    const redacted = redactObjectStrings(snapshot)

    return NextResponse.json(redacted, {
      headers: {
        'Cache-Control': 'private, max-age=0, must-revalidate',
        'X-Home-Contract-Version': snapshot.contractVersion
      }
    })
  } catch (error) {
    console.error('[home/snapshot/v2] composer failure:', error)

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
