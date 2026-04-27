import 'server-only'

import { requireServerSession } from '@/lib/auth/require-server-session'
import { buildHomeEntitlementsContext } from '@/lib/home/build-home-entitlements-context'
import { composeHomeSnapshot } from '@/lib/home/compose-home-snapshot'
import { isHomeV2GloballyEnabled } from '@/lib/home/flags'
import { getHomeUserIdentity } from '@/lib/home/get-home-user-identity'
import type { HomeUiDensity } from '@/lib/home/contract'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import HomeShellV2 from '@/views/greenhouse/home/v2/HomeShellV2'
import HomeViewLegacy from '@/views/greenhouse/home/HomeView'

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
  } catch {
    return { ui_density: null, home_default_view: null, home_v2_opt_out: false }
  }
}

const normalizeDensity = (raw: string | null): HomeUiDensity => {
  if (raw === 'cozy' || raw === 'comfortable' || raw === 'compact') return raw

  return 'cozy'
}

export default async function HomePage() {
  const session = await requireServerSession()
  const { user } = session

  const [preferences, identity] = await Promise.all([
    fetchUserPreferences(user.userId),
    getHomeUserIdentity(user.userId)
  ])

  const v2Enabled = isHomeV2GloballyEnabled() && preferences.home_v2_opt_out !== true

  if (!v2Enabled) {
    return <HomeViewLegacy />
  }

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

  const snapshot = await composeHomeSnapshot({
    userId: user.userId,
    tenantId: user.clientId ?? null,
    tenantType: user.tenantType,
    audienceKey: homeEntitlements.entitlements.audienceKey,
    roleCodes: user.roleCodes ?? [],
    primaryRoleCode: user.primaryRoleCode,
    entitlements: homeEntitlements.entitlements,
    density: normalizeDensity(preferences.ui_density),
    defaultView: preferences.home_default_view,
    optedOutOfV2: preferences.home_v2_opt_out === true,
    // Identity sources, by priority:
    //   1. greenhouse_serving.person_360.resolved_* (canonical 360 view)
    //   2. greenhouse_core.client_users.{full_name,avatar_url}
    //   3. NextAuth session (last resort — user.name / user.image)
    // The Hero never invents a name; if all sources are blank we render
    // the role label instead of a generic "Usuario".
    firstName:
      identity?.firstName ??
      (user.name ?? '').split(' ')[0] ??
      'Usuario',
    fullName: identity?.fullName ?? user.name ?? null,
    avatarUrl:
      identity?.avatarUrl ??
      (user as { image?: string | null }).image ??
      null,
    tenantLabel:
      identity?.tenantLabel ??
      (user.tenantType === 'efeonce_internal' ? 'Efeonce Group' : 'Cliente Greenhouse')
  })

  return <HomeShellV2 snapshot={snapshot} />
}
